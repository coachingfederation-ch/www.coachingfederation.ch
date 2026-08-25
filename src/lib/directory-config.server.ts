/**
 * Chapter-wide Coach Finder rules that the eligibility helpers need.
 *
 * `allow_non_credentialed` is a single row on `coach_finder_config`; reading it
 * here keeps every server path (member editor, staff screen, sync reconcile)
 * on the same answer as the database functions
 * `public.directory_allows_non_credentialed()` and
 * `public.member_is_directory_eligible()`.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { DirectoryRules } from "./directory-eligibility";

export async function directoryRules(): Promise<Required<DirectoryRules>> {
  const { data } = await supabaseAdmin
    .from("coach_finder_config")
    .select("allow_non_credentialed")
    .maybeSingle();
  return { allowNonCredentialed: Boolean(data?.allow_non_credentialed) };
}
