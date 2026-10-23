import { afterAll, describe, expect, it } from "vitest";
import postgres from "postgres";

// Opt-in database regression tests; read-only, with caller state scoped to a
// transaction. No identities or member data are written to disk or logged.
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
      select has_function_privilege('anon', 'private.owns_vote_participation(uuid)', 'EXECUTE') as allowed
    `;
    expect(row?.allowed).toBe(false);
  });

  it("checks only the caller's explicit member linkage and filters other participations", async () => {
    if (!db) return;
    const linked = await db`
      select id, auth_user_id from public.members where auth_user_id is not null limit 2
    `;
    if (linked.length < 2) throw new Error("Two linked accounts are needed for isolation verification.");
    const own = linked[0];
    const other = linked[1];
    if (!own || !other) throw new Error("Linked-account fixtures unavailable.");
    const result = await db.begin(async (tx) => {
      await tx`select set_config('request.jwt.claim.sub', ${own.auth_user_id}, true)`;
      // A synthetic caller without staff roles exercises the policy's member
      // branch while a second query verifies the actual linkage predicate.
      await tx`set local role authenticated`;
      const [ownership] = await tx`
        select private.owns_vote_participation(${own.id}::uuid) as owns_self,
               private.owns_vote_participation(${other.id}::uuid) as owns_other
      `;
      await tx`select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000000', true)`;
      const [unlinked] = await tx`
        select count(*)::int as visible from public.vote_participations
      `;
      return { ownsSelf: ownership?.owns_self, ownsOther: ownership?.owns_other, visible: unlinked?.visible };
    });
    expect(result.ownsSelf).toBe(true);
    expect(result.ownsOther).toBe(false);
    expect(result.visible).toBe(0);
  });
});