import { afterAll, describe, expect, it } from "vitest";
import postgres from "postgres";

const url = process.env["SUPABASE_DB_URL"];
const sql = url ? postgres(url, { max: 1, prepare: false }) : null;
afterAll(async () => {
  await sql?.end();
});

// Read-only catalog checks run with the sandbox's limited SQL account.
// Assignment/removal, actor, sorting, filtering, and paging are also exercised
// with the requesting admin's session in the browser; never widen grants to test.
describe.skipIf(!sql)("operational assignment audit database boundaries", () => {
  it("permits platform-admin reads only", async () => {
    if (!sql) throw new Error("Database unavailable");
    const rows =
      await sql`select cmd, roles::text, qual from pg_policies where schemaname='public' and tablename='op_assignment_audit_log'`;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      cmd: "SELECT",
      roles: "{authenticated}",
      qual: "private.is_platform_admin(auth.uid())",
    });
    const [table] =
      await sql`select relrowsecurity from pg_class where oid='public.op_assignment_audit_log'::regclass`;
    expect(table.relrowsecurity).toBe(true);
  });
  it("prevents authenticated clients from modifying history", async () => {
    if (!sql) throw new Error("Database unavailable");
    const [grants] =
      await sql`select has_table_privilege('authenticated', 'public.op_assignment_audit_log', 'SELECT') as read, has_table_privilege('authenticated', 'public.op_assignment_audit_log', 'INSERT') as insert, has_table_privilege('authenticated', 'public.op_assignment_audit_log', 'UPDATE') as update, has_table_privilege('authenticated', 'public.op_assignment_audit_log', 'DELETE') as delete, has_table_privilege('anon', 'public.op_assignment_audit_log', 'SELECT') as public_read`;
    expect(grants).toEqual({
      read: true,
      insert: false,
      update: false,
      delete: false,
      public_read: false,
    });
  });
  it("captures assignment inserts, updates, and removals automatically", async () => {
    if (!sql) throw new Error("Database unavailable");
    const rows =
      await sql`select tgtype::integer, tgenabled from pg_trigger where tgrelid='public.op_assignments'::regclass and tgname='op_assignments_audit'`;
    // ROW + BEFORE + INSERT + DELETE + UPDATE = 1 + 2 + 4 + 8 + 16.
    expect(rows).toEqual([{ tgtype: 31, tgenabled: "O" }]);
  });
});
