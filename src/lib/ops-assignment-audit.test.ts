import { afterAll, describe, expect, it } from "vitest";
import postgres from "postgres";

const url = process.env["SUPABASE_DB_URL"];
const sql = url ? postgres(url, { max: 1, prepare: false }) : null;

afterAll(async () => { await sql?.end(); });

describe.skipIf(!sql)("operational assignment audit (database integration)", () => {
  async function scenario(check: (tx: postgres.TransactionSql, ids: { member: string; project: string; role: string; actor: string }) => Promise<void>) {
    if (!sql) throw new Error("Database test connection unavailable");
    await sql.begin(async (tx) => {
      const [actor] = await tx`select user_id from public.user_roles where role = 'admin' limit 1`;
      if (!actor) throw new Error("Test requires a platform admin");
      const [member] = await tx`insert into public.members (cst_recno, full_name) values ('TEST-AUDIT-' || gen_random_uuid()::text, 'Anna Muster') returning id`;
      const [project] = await tx`insert into public.op_projects (name, slug, is_active) values ('Audit test project', 'audit-test-' || gen_random_uuid()::text, false) returning id`;
      const [role] = await tx`insert into public.op_project_roles (project_id, name, slug) values (${project.id}, 'Test lead', 'test-lead') returning id`;
      await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: actor.user_id, role: "authenticated" })}, true)`;
      await check(tx, { member: member.id, project: project.id, role: role.id, actor: actor.user_id });
      // Every fixture and audit entry rolls back, including when assertions fail.
      throw new Error("ROLLBACK_TEST_SUCCESS");
    }).catch((error: unknown) => {
      if (!(error instanceof Error) || error.message !== "ROLLBACK_TEST_SUCCESS") throw error;
    });
  }

  it("records assignment and its authenticated actor", async () => {
    await scenario(async (tx, ids) => {
      await tx`set local role authenticated`;
      await tx`insert into public.op_assignments (member_id, project_id, role_id) values (${ids.member}, ${ids.project}, ${ids.role})`;
      const rows = await tx`select action, actor_id, member_name, role_name from public.op_assignment_audit_log where project_id = ${ids.project}`;
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ action: "assigned", actor_id: ids.actor, member_name: "Anna Muster", role_name: "Test lead" });
    });
  });

  it("records removal without replacing the assignment history", async () => {
    await scenario(async (tx, ids) => {
      await tx`insert into public.op_assignments (member_id, project_id, role_id) values (${ids.member}, ${ids.project}, ${ids.role})`;
      await tx`delete from public.op_assignments where project_id = ${ids.project}`;
      const rows = await tx`select action from public.op_assignment_audit_log where project_id = ${ids.project}`;
      expect(rows.map((row) => row.action).sort()).toEqual(["assigned", "unassigned"]);
    });
  });

  it("does not log sorting changes", async () => {
    await scenario(async (tx, ids) => {
      await tx`insert into public.op_assignments (member_id, project_id, role_id) values (${ids.member}, ${ids.project}, ${ids.role})`;
      await tx`update public.op_assignments set sort_order = 99 where project_id = ${ids.project}`;
      const rows = await tx`select action from public.op_assignment_audit_log where project_id = ${ids.project}`;
      expect(rows).toHaveLength(1);
      expect(rows[0].action).toBe("assigned");
    });
  });

  it("hides history from ordinary authenticated users and denies writes", async () => {
    await scenario(async (tx, ids) => {
      await tx`insert into public.op_assignments (member_id, project_id, role_id) values (${ids.member}, ${ids.project}, ${ids.role})`;
      await tx`select set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true)`;
      await tx`set local role authenticated`;
      expect(await tx`select id from public.op_assignment_audit_log where project_id = ${ids.project}`).toHaveLength(0);
      const [grants] = await tx`select has_table_privilege(current_user, 'public.op_assignment_audit_log', 'INSERT') as insert, has_table_privilege(current_user, 'public.op_assignment_audit_log', 'UPDATE') as update, has_table_privilege(current_user, 'public.op_assignment_audit_log', 'DELETE') as delete`;
      expect(grants).toEqual({ insert: false, update: false, delete: false });
    });
  });

  it("captures project cascade removals with retained names", async () => {
    await scenario(async (tx, ids) => {
      await tx`insert into public.op_assignments (member_id, project_id, role_id) values (${ids.member}, ${ids.project}, ${ids.role})`;
      await tx`delete from public.op_projects where id = ${ids.project}`;
      const rows = await tx`select action, project_name, role_name from public.op_assignment_audit_log where project_id = ${ids.project} and action = 'unassigned'`;
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ action: "unassigned", project_name: "Audit test project", role_name: "Test lead" });
    });
  });
});