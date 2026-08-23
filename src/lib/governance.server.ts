/**
 * Server-only read path for the governance archive.
 *
 * Reads go through the publishable-key client so RLS still applies: only rows
 * with `is_published` are visible to an anonymous visitor, which is exactly
 * what this page shows. Uploaded files live in a private bucket, so each row's
 * storage path is signed here; a signing failure degrades to "no link" rather
 * than failing the page.
 */
import { GOVERNANCE_DOCUMENT_BUCKET, GOVERNANCE_DOCUMENT_TTL_SECONDS } from "./storage";
import type { GovernanceCategory, GovernanceDocument } from "./governance";

const COLUMNS =
  "id, title, description, category, year, language, file_path, external_url, file_size_bytes, mime_type, document_date, sort_order";

/** Every published document, newest year first. */
export async function loadPublishedGovernanceDocuments(): Promise<GovernanceDocument[]> {
  const { publicSupabaseClient } = await import("./supabase-public.server");
  const { data, error } = await publicSupabaseClient()
    .from("governance_documents")
    .select(COLUMNS)
    .eq("is_published", true)
    .order("year", { ascending: false, nullsFirst: false })
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });
  if (error) throw error;

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const paths = rows
    .map((row) => row.file_path)
    .filter((path): path is string => typeof path === "string" && path.length > 0);

  const { signStoragePaths } = await import("./storage.server");
  const signed = await signStoragePaths(
    GOVERNANCE_DOCUMENT_BUCKET,
    paths,
    GOVERNANCE_DOCUMENT_TTL_SECONDS,
  );

  return rows.map((row) => {
    const filePath = typeof row.file_path === "string" ? row.file_path : null;
    const externalUrl = typeof row.external_url === "string" ? row.external_url : null;
    const signedUrl = filePath ? (signed.get(filePath) ?? null) : null;
    return {
      id: String(row.id),
      title: String(row.title ?? ""),
      description: (row.description as string | null) ?? null,
      category: (row.category as GovernanceCategory) ?? "other",
      year: (row.year as number | null) ?? null,
      language: String(row.language ?? "en"),
      url: signedUrl ?? externalUrl,
      isExternal: !signedUrl && Boolean(externalUrl),
      fileSizeBytes: (row.file_size_bytes as number | null) ?? null,
      mimeType: (row.mime_type as string | null) ?? null,
      documentDate: (row.document_date as string | null) ?? null,
    } satisfies GovernanceDocument;
  });
}
