/**
 * Staff RPC surface for the "after event" recap.
 * Exports: getManagedRecap, saveRecap, setRecapStatus, saveRecapPhotos,
 * saveRecapFiles, translateRecap, publishRecapToLinkedIn.
 * Called by components/cms/EventRecapEditor.tsx.
 *
 * Every write goes through `context.supabase`, so the row-level rules — not
 * this file — decide *which* events a caller may touch. `assertOrganizer` is
 * only the fast fail that keeps an account with no event rights from reaching
 * the AI gateway or LinkedIn at all.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertOrganizer } from "./authz";
import { EVENT_MEDIA_BUCKET, EVENT_RECAP_PHOTO_TTL_SECONDS } from "./storage";

const eventInput = z.object({ eventId: z.string().uuid() });

const saveInput = z.object({
  eventId: z.string().uuid(),
  language: z.enum(["en", "de", "fr", "it"]),
  headline: z.string().trim().max(200).nullable(),
  body: z.string().max(40_000).nullable(),
  downloadsAudience: z.enum(["attendees", "members", "public"]),
});

const photoInput = z.object({
  eventId: z.string().uuid(),
  photos: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        webPath: z.string().min(1).max(400),
        originalPath: z.string().min(1).max(400).nullable(),
        caption: z.string().trim().max(300).nullable(),
        alt: z.string().trim().max(300).nullable(),
        isAi: z.boolean().default(false),
      }),
    )
    .max(80),
});

const fileInput = z.object({
  eventId: z.string().uuid(),
  files: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        path: z.string().min(1).max(400),
        filename: z.string().trim().min(1).max(200),
        label: z.string().trim().max(200).nullable(),
        sizeBytes: z.number().int().nonnegative().nullable(),
        contentType: z.string().trim().max(120).nullable(),
      }),
    )
    .max(40),
});

/**
 * Creates the recap row on first open so the editor always has an id.
 *
 * Atomic on purpose: two overlapping calls (a re-fired load effect, a save that
 * starts before the load resolved) used to both read "no row" and both insert,
 * and the unique index on event_id rejected the loser with a raw Postgres
 * error. Insert-ignore-then-read means both callers end up on the same row.
 */
async function ensureRecap(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  eventId: string,
  userId: string,
): Promise<string> {
  const { data: existing } = await supabase
    .from("event_recaps")
    .select("id")
    .eq("event_id", eventId)
    .maybeSingle();
  if (existing?.id) return existing.id as string;

  const { data: event } = await supabase
    .from("events")
    .select("language")
    .eq("id", eventId)
    .maybeSingle();

  const { data: inserted, error } = await supabase
    .from("event_recaps")
    .upsert(
      {
        event_id: eventId,
        language: (event?.language as string | undefined) ?? "en",
        created_by: userId,
      },
      { onConflict: "event_id", ignoreDuplicates: true },
    )
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (inserted?.id) return inserted.id as string;

  // Someone else won the race — read their row.
  const { data: raced, error: readError } = await supabase
    .from("event_recaps")
    .select("id")
    .eq("event_id", eventId)
    .maybeSingle();
  if (readError) throw new Error(readError.message);
  if (!raced?.id) throw new Error("Could not open the recap for this event.");
  return raced.id as string;
}


/** The recap, its gallery, its attachments and its translations, for staff. */
export const getManagedRecap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => eventInput.parse(data))
  .handler(async ({ data, context }) => {
    await assertOrganizer(context);
    const recapId = await ensureRecap(context.supabase, data.eventId, context.userId);

    const [{ data: recap }, { data: photos }, { data: files }, { data: translations }] =
      await Promise.all([
        context.supabase
          .from("event_recaps")
          .select(
            "id, event_id, status, language, headline, body, downloads_audience, published_at, content_updated_at",
          )
          .eq("id", recapId)
          .single(),
        context.supabase
          .from("event_recap_photos")
          .select("id, sort_order, web_path, original_path, caption, alt, is_ai")
          .eq("recap_id", recapId)
          .order("sort_order", { ascending: true }),
        context.supabase
          .from("event_recap_files")
          .select("id, sort_order, path, filename, label, size_bytes, content_type")
          .eq("recap_id", recapId)
          .order("sort_order", { ascending: true }),
        context.supabase
          .from("event_recap_translations")
          .select("locale, headline, body, manually_edited, source_updated_at, updated_at")
          .eq("recap_id", recapId),
      ]);

    // Previews are signed for staff exactly like the public page does it, so
    // what the editor shows is what visitors get.
    const { signStoragePaths } = await import("./storage.server");
    const rows = (photos ?? []) as { web_path: string }[];
    const signed = await signStoragePaths(
      EVENT_MEDIA_BUCKET,
      rows.map((p) => p.web_path),
      EVENT_RECAP_PHOTO_TTL_SECONDS,
    );

    const { latestRecapLinkedInPost } = await import("./event-recap-linkedin.server");

    return {
      recap,
      photos: ((photos ?? []) as Record<string, unknown>[]).map((p) => ({
        ...p,
        preview: signed.get(p["web_path"] as string) ?? null,
      })),
      files: files ?? [],
      translations: translations ?? [],
      linkedin: await latestRecapLinkedInPost(recapId),
    };
  });

/** Saves the story and the download policy. */
export const saveRecap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => saveInput.parse(data))
  .handler(async ({ data, context }) => {
    await assertOrganizer(context);
    const recapId = await ensureRecap(context.supabase, data.eventId, context.userId);
    const { error } = await context.supabase
      .from("event_recaps")
      .update({
        language: data.language,
        headline: data.headline,
        body: data.body,
        downloads_audience: data.downloadsAudience,
      })
      .eq("id", recapId);
    if (error) throw new Error(error.message);
    return { id: recapId };
  });

/** Publishes or withdraws the recap. Unpublishing hides the whole section. */
export const setRecapStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    eventInput.extend({ status: z.enum(["draft", "published"]) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertOrganizer(context);
    const recapId = await ensureRecap(context.supabase, data.eventId, context.userId);
    const { error } = await context.supabase
      .from("event_recaps")
      .update({ status: data.status })
      .eq("id", recapId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Replaces the gallery with the list the editor holds, in its own order. */
export const saveRecapPhotos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => photoInput.parse(data))
  .handler(async ({ data, context }) => {
    await assertOrganizer(context);
    const recapId = await ensureRecap(context.supabase, data.eventId, context.userId);
    const keep = data.photos.map((p) => p.id).filter(Boolean) as string[];

    let remove = context.supabase.from("event_recap_photos").delete().eq("recap_id", recapId);
    if (keep.length) remove = remove.not("id", "in", `(${keep.join(",")})`);
    const { error: deleteError } = await remove;
    if (deleteError) throw new Error(deleteError.message);

    for (const [index, photo] of data.photos.entries()) {
      const row = {
        recap_id: recapId,
        sort_order: index,
        web_path: photo.webPath,
        original_path: photo.originalPath,
        caption: photo.caption,
        alt: photo.alt,
        is_ai: photo.isAi,
      };
      const { error } = photo.id
        ? await context.supabase.from("event_recap_photos").update(row).eq("id", photo.id)
        : await context.supabase.from("event_recap_photos").insert(row);
      if (error) throw new Error(error.message);
    }
    return { count: data.photos.length };
  });

/** Replaces the attachment list, in its own order. */
export const saveRecapFiles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => fileInput.parse(data))
  .handler(async ({ data, context }) => {
    await assertOrganizer(context);
    const recapId = await ensureRecap(context.supabase, data.eventId, context.userId);
    const keep = data.files.map((f) => f.id).filter(Boolean) as string[];

    let remove = context.supabase.from("event_recap_files").delete().eq("recap_id", recapId);
    if (keep.length) remove = remove.not("id", "in", `(${keep.join(",")})`);
    const { error: deleteError } = await remove;
    if (deleteError) throw new Error(deleteError.message);

    for (const [index, file] of data.files.entries()) {
      const row = {
        recap_id: recapId,
        sort_order: index,
        path: file.path,
        filename: file.filename,
        label: file.label,
        size_bytes: file.sizeBytes,
        content_type: file.contentType,
      };
      const { error } = file.id
        ? await context.supabase.from("event_recap_files").update(row).eq("id", file.id)
        : await context.supabase.from("event_recap_files").insert(row);
      if (error) throw new Error(error.message);
    }
    return { count: data.files.length };
  });

const LOCALE_NAMES: Record<string, string> = {
  de: "Swiss Standard German (no ß, use ss)",
  fr: "Swiss French",
  it: "Swiss Italian",
  en: "English",
};

/** Machine translation of the recap story — same model and shape as events. */
export const translateRecap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    eventInput.extend({ locale: z.enum(["de", "fr", "it", "en"]) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    // Paid AI call: gate before spending credits.
    await assertOrganizer(context);
    const { data: recap, error } = await context.supabase
      .from("event_recaps")
      .select("id, language, headline, body, content_updated_at")
      .eq("event_id", data.eventId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!recap) throw new Error("Write the recap before translating it.");
    if (recap.language === data.locale)
      throw new Error("Source language cannot be translated into itself");
    if (!(recap.body ?? "").trim() && !(recap.headline ?? "").trim())
      throw new Error("Write the recap before translating it.");

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Translation service is not configured");

    const prompt = [
      `Translate the following event recap from ${LOCALE_NAMES[recap.language] ?? recap.language} into ${LOCALE_NAMES[data.locale]}.`,
      "Keep any Markdown formatting, links and paragraph structure exactly as they are.",
      "Use a warm, professional editorial tone suitable for The Switzerland Chapter of ICF.",
      "Do not translate proper nouns such as ICF, ACC, PCC, MCC, Zürich, Lausanne, Lugano, venue names or URLs.",
      'Respond with JSON only, in the shape {"headline": "...", "body": "..."}.',
      "",
      `HEADLINE: ${recap.headline ?? ""}`,
      "BODY:",
      recap.body ?? "",
    ].join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "You are a professional Swiss editorial translator. You reply with JSON only.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (response.status === 429) throw new Error("Rate limit reached — please try again shortly.");
    if (response.status === 402)
      throw new Error("AI credits exhausted — please top up the workspace.");
    if (!response.ok) throw new Error(`Translation service error (${response.status})`);

    const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    let parsed: { headline?: string; body?: string };
    try {
      parsed = JSON.parse(
        (payload.choices?.[0]?.message?.content ?? "")
          .replace(/^```(?:json)?/i, "")
          .replace(/```$/, "")
          .trim(),
      );
    } catch {
      throw new Error("Translation service returned an unexpected response");
    }

    const blank = (v: string | undefined) => {
      const trimmed = (v ?? "").trim();
      return trimmed.length > 0 ? trimmed : null;
    };
    const row = {
      recap_id: recap.id,
      locale: data.locale,
      headline: blank(parsed.headline),
      body: blank(parsed.body),
      manually_edited: false,
      source_updated_at: recap.content_updated_at,
      updated_at: new Date().toISOString(),
    };
    const { error: upsertError } = await context.supabase
      .from("event_recap_translations")
      .upsert(row, { onConflict: "recap_id,locale" });
    if (upsertError) throw new Error(upsertError.message);
    return row;
  });

/** Publishes the recap as a LinkedIn carousel: title card plus gallery photos. */
export const publishRecapToLinkedIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    eventInput
      .extend({ commentary: z.string().trim().min(1).max(3000) })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { assertLinkedInPublisher } = await import("./linkedin-authz");
    const userId = await assertLinkedInPublisher(context);
    await assertOrganizer(context);
    const { data: recap } = await context.supabase
      .from("event_recaps")
      .select("id, status")
      .eq("event_id", data.eventId)
      .maybeSingle();
    if (!recap) throw new Error("There is no recap for this event yet.");
    if (recap.status !== "published")
      throw new Error("Publish the recap before sharing it on LinkedIn.");

    const { postRecapCarousel } = await import("./event-recap-linkedin.server");
    return postRecapCarousel({
      recapId: recap.id as string,
      commentary: data.commentary,
      userId,
    });
  });
