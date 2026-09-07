/**
 * Staff CRUD for member guides. Every handler is editor-gated: reading and
 * writing an unpublished guide must never be possible for a signed-in member.
 * Writes go through `context.supabase`, so the editor RLS policy is the second
 * line of defence behind `assertEditor`.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertEditor } from "./authz";
import { GUIDE_CALLOUT_KINDS, GUIDE_SECTION_KINDS, GUIDE_TONES } from "./guides";

export type AdminGuideRow = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  eyebrow: string;
  intro: string;
  version_label: string;
  contact_email: string | null;
  footnote: string;
  is_published: boolean;
  published_at: string | null;
  sort_order: number;
  updated_at: string;
  content_updated_at: string;
};

export type AdminGuideCalloutRow = {
  id: string;
  section_id: string;
  position: number;
  kind: string;
  label: string;
  body: string;
};

export type AdminGuideFaqRow = {
  id: string;
  section_id: string;
  position: number;
  question: string;
  answer: string;
  quote: string;
};

export type AdminGuideSectionRow = {
  id: string;
  guide_id: string;
  position: number;
  kind: string;
  tone: string;
  eyebrow: string;
  heading: string;
  lead: string;
  body: string;
  callouts: AdminGuideCalloutRow[];
  faq: AdminGuideFaqRow[];
};

const GUIDE_COLUMNS =
  "id, slug, title, summary, eyebrow, intro, version_label, contact_email, footnote, is_published, published_at, sort_order, updated_at, content_updated_at";
const SECTION_COLUMNS = "id, guide_id, position, kind, tone, eyebrow, heading, lead, body";
const CALLOUT_COLUMNS = "id, section_id, position, kind, label, body";
const FAQ_COLUMNS = "id, section_id, position, question, answer, quote";

export const listAdminGuides = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminGuideRow[]> => {
    await assertEditor(context);
    const { data, error } = await context.supabase
      .from("guides")
      .select(GUIDE_COLUMNS)
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as AdminGuideRow[];
  });

export const getAdminGuide = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(
    async ({
      data,
      context,
    }): Promise<{ guide: AdminGuideRow; sections: AdminGuideSectionRow[] } | null> => {
      await assertEditor(context);
      const { data: guide, error } = await context.supabase
        .from("guides")
        .select(GUIDE_COLUMNS)
        .eq("id", data.id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!guide) return null;
      const { data: sections, error: sectionError } = await context.supabase
        .from("guide_sections")
        .select(
          `${SECTION_COLUMNS}, guide_section_callouts(${CALLOUT_COLUMNS}), guide_faq_items(${FAQ_COLUMNS})`,
        )
        .eq("guide_id", data.id)
        .order("position", { ascending: true });
      if (sectionError) throw new Error(sectionError.message);

      const byPosition = <T extends { position: number }>(rows: T[] | null | undefined): T[] =>
        (rows ?? []).slice().sort((a, b) => a.position - b.position);

      return {
        guide: guide as AdminGuideRow,
        sections: ((sections ?? []) as Record<string, unknown>[]).map((section) => ({
          ...(section as unknown as AdminGuideSectionRow),
          callouts: byPosition(section.guide_section_callouts as AdminGuideCalloutRow[]),
          faq: byPosition(section.guide_faq_items as AdminGuideFaqRow[]),
        })),
      };
    },
  );

export const createGuide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        title: z.string().trim().min(1).max(200),
        slug: z
          .string()
          .trim()
          .min(1)
          .max(80)
          .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and dashes only"),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    await assertEditor(context);
    const { data: row, error } = await context.supabase
      .from("guides")
      .insert({ title: data.title, slug: data.slug })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (row as { id: string }).id };
  });

const guidePatchSchema = z.object({
  id: z.string().uuid(),
  values: z
    .object({
      slug: z
        .string()
        .trim()
        .min(1)
        .max(80)
        .regex(/^[a-z0-9-]+$/),
      title: z.string().max(200),
      summary: z.string().max(600),
      eyebrow: z.string().max(120),
      intro: z.string().max(4000),
      version_label: z.string().max(80),
      contact_email: z.string().email().nullable(),
      footnote: z.string().max(2000),
      is_published: z.boolean(),
      sort_order: z.number().int().min(0).max(999),
    })
    .partial(),
});

export const updateGuide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => guidePatchSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertEditor(context);
    // `published_at` records the release moment; it is never taken from the client.
    const values = {
      ...data.values,
      ...(data.values.is_published === true ? { published_at: new Date().toISOString() } : {}),
      ...(data.values.is_published === false ? { published_at: null } : {}),
    };
    const { error } = await context.supabase.from("guides").update(values).eq("id", data.id);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteGuide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertEditor(context);
    const { error } = await context.supabase.from("guides").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createGuideSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ guideId: z.string().uuid(), position: z.number().int().min(0) }).parse(data),
  )
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    await assertEditor(context);
    const { data: row, error } = await context.supabase
      .from("guide_sections")
      .insert({ guide_id: data.guideId, position: data.position })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (row as { id: string }).id };
  });

export const updateGuideSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid(),
        values: z
          .object({
            position: z.number().int().min(0).max(999),
            kind: z.enum(GUIDE_SECTION_KINDS),
            tone: z.enum(GUIDE_TONES),
            eyebrow: z.string().max(120),
            heading: z.string().max(200),
            lead: z.string().max(600),
            body: z.string().max(8000),
          })
          .partial(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertEditor(context);
    const { error } = await context.supabase
      .from("guide_sections")
      .update(data.values)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteGuideSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertEditor(context);
    const { error } = await context.supabase.from("guide_sections").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------------------------------------------ *
 * Callouts — several per article section, each with its own type.
 * ------------------------------------------------------------------ */

export const createGuideCallout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ sectionId: z.string().uuid(), position: z.number().int().min(0) }).parse(data),
  )
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    await assertEditor(context);
    const { data: row, error } = await context.supabase
      .from("guide_section_callouts")
      .insert({ section_id: data.sectionId, position: data.position })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (row as { id: string }).id };
  });

export const updateGuideCallout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid(),
        values: z
          .object({
            position: z.number().int().min(0).max(999),
            kind: z.enum(GUIDE_CALLOUT_KINDS),
            label: z.string().max(200),
            body: z.string().max(4000),
          })
          .partial(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertEditor(context);
    const { error } = await context.supabase
      .from("guide_section_callouts")
      .update(data.values)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteGuideCallout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertEditor(context);
    const { error } = await context.supabase
      .from("guide_section_callouts")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------------------------------------------ *
 * FAQ rows — the questions of a section switched to the FAQ layout.
 * ------------------------------------------------------------------ */

export const createGuideFaqItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ sectionId: z.string().uuid(), position: z.number().int().min(0) }).parse(data),
  )
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    await assertEditor(context);
    const { data: row, error } = await context.supabase
      .from("guide_faq_items")
      .insert({ section_id: data.sectionId, position: data.position })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (row as { id: string }).id };
  });

export const updateGuideFaqItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid(),
        values: z
          .object({
            position: z.number().int().min(0).max(999),
            question: z.string().max(400),
            answer: z.string().max(8000),
            quote: z.string().max(600),
          })
          .partial(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertEditor(context);
    const { error } = await context.supabase
      .from("guide_faq_items")
      .update(data.values)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteGuideFaqItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertEditor(context);
    const { error } = await context.supabase.from("guide_faq_items").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
