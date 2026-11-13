import { afterAll, describe, expect, it } from "vitest";
import postgres from "postgres";

// Opt-in, read-only database access-contract tests for invite-only events.
// The sandbox connection cannot impersonate authenticated roles, so the
// behavioral checks (who sees what) run in the browser.
const databaseUrl = process.env["SUPABASE_DB_URL"];
const db = databaseUrl ? postgres(databaseUrl, { max: 1, prepare: false }) : null;

afterAll(async () => {
  if (db) await db.end();
});

async function fn(schema: string, name: string) {
  const [row] = await db!`
    select p.oid, p.prosecdef, p.prosrc
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = ${schema} and p.proname = ${name}
  `;
  return row;
}

describe.skipIf(!db)("invite-only event visibility", () => {
  it("no longer lets every member see invite-only events", async () => {
    const helper = await fn("private", "can_view_invite_only_event");
    expect(helper?.prosrc).not.toContain("can_view_internal_events");
    expect(helper?.prosrc).toContain("private.event_is_managed_by(_event_id, _user_id)");
    expect(helper?.prosrc).toContain("private.is_on_event_guest_list(_event_id, _user_id)");
  });

  it("recognises invitees by account or by their linked member record", async () => {
    const helper = await fn("private", "is_on_event_guest_list");
    expect(helper?.prosecdef).toBe(true);
    expect(helper?.prosrc).toMatch(/i\.user_id\s*=\s*_user_id/);
    expect(helper?.prosrc).toMatch(/m\.auth_user_id\s*=\s*_user_id/);
    expect(helper?.prosrc).toContain("'revoked'");
  });

  it("keeps the guest-list listing closed to anonymous callers", async () => {
    const rpc = await fn("public", "my_invite_only_event_ids");
    const [row] = await db!`
      select has_function_privilege('anon', ${rpc!.oid}::oid, 'EXECUTE') as anon,
             has_function_privilege('authenticated', ${rpc!.oid}::oid, 'EXECUTE') as authed
    `;
    expect(row?.anon).toBe(false);
    expect(row?.authed).toBe(true);
  });
});
