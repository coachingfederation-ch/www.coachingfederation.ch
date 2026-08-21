/**
 * Host reads.
 *
 * Both the public page and the CMS panel resolve hosts through
 * `coach_directory_public`: a host row whose profile is no longer published or
 * eligible simply drops out of the result instead of leaking a hidden profile.
 */
import type { EventHost } from "./event-hosts";

/**
 * `client` overrides the anon reader. The public host policy only exposes
 * links of *published* events, so the CMS must read a draft event's hosts
 * through the caller's own RLS-scoped client — otherwise a freshly added host
 * on a draft comes back empty and looks like it was never saved.
 */
export async function loadEventHosts(
  eventId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client?: any,
): Promise<EventHost[]> {
  const { publicSupabaseClient } = await import("./supabase-public.server");
  const { signProfileImages } = await import("./storage.server");
  const supabase = client ?? publicSupabaseClient();

  const { data: links, error } = await supabase
    .from("event_hosts")
    .select("profile_id, sort_order")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  const ids = (links ?? []).map((l) => l.profile_id as string);
  if (ids.length === 0) return [];

  const { data: rows } = await supabase
    .from("coach_directory_public")
    .select("profile_id, full_name, tagline, profile_image_path")
    .in("profile_id", ids);

  const signed = await signProfileImages(
    (rows ?? [])
      .map((r) => r.profile_image_path as string | null)
      .filter((p): p is string => Boolean(p)),
  );

  const byId = new Map(
    (rows ?? []).map((r) => [
      r.profile_id as string,
      {
        profileId: r.profile_id as string,
        fullName: (r.full_name as string | null) ?? "",
        tagline: (r.tagline as string | null) ?? null,
        imageUrl: r.profile_image_path
          ? (signed.get(r.profile_image_path as string) ?? null)
          : null,
      } satisfies EventHost,
    ]),
  );

  // Preserve the stored order, and drop links whose profile is no longer public.
  return ids.map((id) => byId.get(id)).filter((h): h is EventHost => Boolean(h));
}

/** Name search over published, eligible directory profiles, capped. */
export async function searchHostCandidates(term: string): Promise<EventHost[]> {
  const cleaned = term.replace(/[%_,()]/g, "").trim();
  if (cleaned.length < 2) return [];
  const { publicSupabaseClient } = await import("./supabase-public.server");
  const supabase = publicSupabaseClient();
  const { data, error } = await supabase
    .from("coach_directory_public")
    .select("profile_id, full_name, tagline")
    .ilike("full_name", `%${cleaned}%`)
    .order("full_name", { ascending: true })
    .limit(20);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    profileId: r.profile_id as string,
    fullName: (r.full_name as string | null) ?? "",
    tagline: (r.tagline as string | null) ?? null,
    imageUrl: null,
  }));
}
