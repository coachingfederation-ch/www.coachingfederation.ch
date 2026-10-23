import { afterAll, describe, expect, it } from "vitest";
import postgres from "postgres";

// Opt-in, read-only database access-contract tests. The sandbox connection
// cannot impersonate authenticated roles, so behavioral checks use the browser.
const databaseUrl = process.env["SUPABASE_DB_URL"];
const db = databaseUrl ? postgres(databaseUrl, { max: 1, prepare: false }) : null;

afterAll(async () => {
  if (db) await db.end();
});

describe.skipIf(!db)("vote participation access", () => {
  it("keeps member account linkage unavailable to Data API callers", async () => {
    if (!db) return;
    const [row] = await db`
      select has_column_privilege('authenticated', 'public.members', 'auth_user_id', 'SELECT') as allowed
    `;
    expect(row?.allowed).toBe(false);
  });

  it("denies anonymous execution of the private ownership helper", async () => {
    if (!db) return;
    const [row] = await db`
      select has_function_privilege('anon', p.oid, 'EXECUTE') as allowed
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'private' and p.proname = 'owns_vote_participation'
    `;
    expect(row?.allowed).toBe(false);
  });

  it("resolves ownership privately against the caller's explicit member linkage", async () => {
    if (!db) return;
    const [helper] = await db`
      select p.prosecdef, p.prosrc, p.proconfig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'private' and p.proname = 'owns_vote_participation'
    `;
    expect(helper?.prosecdef).toBe(true);
    expect(helper?.proconfig).toContain('search_path=pg_catalog');
    expect(helper?.prosrc).toMatch(/m\.id\s*=\s*_member_id\s+AND\s+m\.auth_user_id\s*=\s*auth\.uid\(\)/i);
    const [policy] = await db`
      select qual from pg_policies where schemaname = 'public'
      and tablename = 'vote_participations' and policyname = 'Members read own participation'
    `;
    expect(policy?.qual).toContain('private.owns_vote_participation(member_id)');
    expect(policy?.qual).toContain('private.is_vote_manager(auth.uid())');
    expect(policy?.qual).not.toContain('auth_user_id');
  });
});
