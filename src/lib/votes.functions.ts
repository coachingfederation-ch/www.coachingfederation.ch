/**
 * Member votes: server functions.
 *
 * Every function runs through the caller's own RLS-bound client. Ballots are
 * only ever written by the `cast_vote` database function, which also records
 * participation in a separate table with no choice attached — so neither the
 * app nor staff can link a member to what they voted. Members read tallies and
 * rationales only through `vote_tally` / `vote_rationales`, which decide
 * visibility themselves (voted already, or the vote has closed).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertMembership } from "./authz";
import { slugify, uniqueSlug } from "./articles";
import { translatedOptionSchema } from "./vote-translations";
import {
  DEFAULT_OPTIONS,
  RATIONALE_MAX,
  defaultWindow,
  validOptions,
  type ResultsMode,
  type VoteOption,
  type VoteStatus,
} from "./votes";

export type Tally = {
  participants: number;
  eligible: number;
  counts: Record<string, number>;
  per_day: { day: string; n: number }[];
};

const VOTE_COLUMNS =
  "id, slug, title, title_de, title_fr, title_it, summary, summary_de, summary_fr, summary_it, description, description_de, description_fr, description_it, category, status, opens_at, closes_at, options, results_mode, rationale_enabled, announce_enabled, announced_at, eligible_count, ai_summary, updated_at";

type VoteRecord = {
  id: string;
  slug: string;
  title: string;
  title_de: string | null;
  title_fr: string | null;
  title_it: string | null;
  summary: string | null;
  summary_de: string | null;
  summary_fr: string | null;
  summary_it: string | null;
  description: string | null;
  description_de: string | null;
  description_fr: string | null;
  description_it: string | null;
  category: string | null;
  status: VoteStatus;
  opens_at: string;
  closes_at: string;
  options: VoteOption[];
  results_mode: ResultsMode;
  rationale_enabled: boolean;
  announce_enabled: boolean;
  announced_at: string | null;
  eligible_count: number | null;
  ai_summary: string | null;
  updated_at: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asVote = (row: any): VoteRecord => ({
  ...row,
  options: Array.isArray(row.options) ? (row.options as VoteOption[]) : DEFAULT_OPTIONS,
});

const opt = z.string().trim().max(20000).nullable();
const short = z.string().trim().max(300).nullable();

// ---------------------------------------------------------------- staff

export const listVotesAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertMembership(context);
    const { data, error } = await context.supabase
      .from("votes")
      .select("id, slug, title, status, opens_at, closes_at, vote_participations(count)")
      .order("opens_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      status: r.status as VoteStatus,
      opens_at: r.opens_at,
      closes_at: r.closes_at,
      participants:
        (r.vote_participations as unknown as { count: number }[] | null)?.[0]?.count ?? 0,
    }));
  });

export const createVote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ title: z.string().trim().min(3).max(160) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertMembership(context);
    // Random suffix keeps slugs unique without reading every existing one.
    const slug = uniqueSlug(slugify(data.title) || "vote", 80);
    const { data: row, error } = await context.supabase
      .from("votes")
      .insert({ title: data.title, slug, ...defaultWindow() })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const getVoteAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertMembership(context);
    const { data: row, error } = await context.supabase
      .from("votes")
      .select(VOTE_COLUMNS)
      .eq("id", data.id)
      .maybeSingle();
    if (error || !row) throw new Error("This vote is not available.");
    const { count } = await context.supabase
      .from("vote_participations")
      .select("vote_id", { count: "exact", head: true })
      .eq("vote_id", data.id);
    const { data: files } = await context.supabase
      .from("vote_attachments")
      .select("id, file_name, file_path, size_bytes")
      .eq("vote_id", data.id)
      .order("created_at");
    return { vote: asVote(row), participants: count ?? 0, attachments: files ?? [] };
  });

const saveSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(3).max(160),
  title_de: short,
  title_fr: short,
  title_it: short,
  summary: z.string().trim().max(600).nullable(),
  summary_de: z.string().trim().max(600).nullable(),
  summary_fr: z.string().trim().max(600).nullable(),
  summary_it: z.string().trim().max(600).nullable(),
  description: opt,
  description_de: opt,
  description_fr: opt,
  description_it: opt,
  category: z.string().trim().max(80).nullable(),
  status: z.enum(["draft", "published", "archived"]),
  opens_at: z.string().datetime(),
  closes_at: z.string().datetime(),
  options: z.array(translatedOptionSchema).min(2).max(10),
  results_mode: z.enum(["after_vote", "after_close"]),
  rationale_enabled: z.boolean(),
  announce_enabled: z.boolean(),
});

export const saveVote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => saveSchema.parse(input))
  .handler(async ({ context, data }) => {
    await assertMembership(context);
    if (!validOptions(data.options)) throw new Error("Add at least two distinct options.");
    if (new Date(data.closes_at) <= new Date(data.opens_at)) {
      throw new Error("The vote must close after it opens.");
    }
    const { data: current, error: readErr } = await context.supabase
      .from("votes")
      .select("status, opens_at, closes_at, options")
      .eq("id", data.id)
      .single();
    if (readErr) throw new Error(readErr.message);

    // Once a published vote has started, the ballot is frozen: options and the
    // opening date stay as members saw them, and the end can only move later.
    const started = current.status !== "draft" && new Date(current.opens_at) <= new Date();
    if (started) {
      if (JSON.stringify(current.options) !== JSON.stringify(data.options)) {
        throw new Error("Options cannot change after voting has started.");
      }
      if (new Date(current.opens_at).getTime() !== new Date(data.opens_at).getTime()) {
        throw new Error("The opening date cannot change after voting has started.");
      }
      if (new Date(data.closes_at) < new Date(current.closes_at)) {
        throw new Error("The end date can only be extended after voting has started.");
      }
    }
    const { id, ...patch } = data;
    const { error } = await context.supabase.from("votes").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteVote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertMembership(context);
    const { data: row } = await context.supabase
      .from("votes")
      .select("status")
      .eq("id", data.id)
      .single();
    if (row?.status !== "draft") throw new Error("Only drafts can be deleted. Archive it instead.");
    const { error } = await context.supabase.from("votes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addVoteAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        voteId: z.string().uuid(),
        filePath: z.string().min(3).max(400),
        fileName: z.string().min(1).max(200),
        size: z.number().int().nonnegative().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertMembership(context);
    if (!data.filePath.startsWith(`${data.voteId}/`)) throw new Error("Invalid file path.");
    const { error } = await context.supabase.from("vote_attachments").insert({
      vote_id: data.voteId,
      file_path: data.filePath,
      file_name: data.fileName,
      size_bytes: data.size,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeVoteAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertMembership(context);
    const { data: row } = await context.supabase
      .from("vote_attachments")
      .select("file_path")
      .eq("id", data.id)
      .single();
    if (row) await context.supabase.storage.from("vote-files").remove([row.file_path]);
    const { error } = await context.supabase.from("vote_attachments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getVoteResults = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertMembership(context);
    const { data: row, error } = await context.supabase
      .from("votes")
      .select(VOTE_COLUMNS)
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    const { data: tally } = await context.supabase.rpc("vote_tally", { _vote_id: data.id });
    const { data: ballots } = await context.supabase
      .from("vote_ballots")
      .select("id, option_key, rationale, hidden")
      .eq("vote_id", data.id)
      .not("rationale", "is", null)
      .order("cast_on", { ascending: false });
    return {
      vote: asVote(row),
      tally: (tally as unknown as Tally | null) ?? {
        participants: 0,
        eligible: 0,
        counts: {},
        per_day: [],
      },
      rationales: (ballots ?? []) as {
        id: string;
        option_key: string;
        rationale: string;
        hidden: boolean;
      }[],
    };
  });

export const setRationaleHidden = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), hidden: z.boolean() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertMembership(context);
    const { error } = await context.supabase
      .from("vote_ballots")
      .update({ hidden: data.hidden })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const summariseRationales = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertMembership(context);
    const { checkRateLimit } = await import("./rate-limit.server");
    const verdict = await checkRateLimit("vote-summary", context.userId, [
      { windowSeconds: 3600, max: 10 },
    ]);
    if (!verdict.allowed) throw new Error("Too many summaries. Try again later.");

    const { data: vote } = await context.supabase
      .from("votes")
      .select("title, options")
      .eq("id", data.id)
      .single();
    const { data: ballots } = await context.supabase
      .from("vote_ballots")
      .select("option_key, rationale")
      .eq("vote_id", data.id)
      .eq("hidden", false)
      .not("rationale", "is", null)
      .limit(400);
    if (!vote || !ballots?.length) throw new Error("There are no rationales to summarise yet.");

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("The AI summary is not available right now.");
    const options = (vote.options as unknown as VoteOption[]) ?? DEFAULT_OPTIONS;
    const labelOf = (k: string) => options.find((o) => o.key === k)?.label ?? k;
    const { generateText } = await import("ai");
    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(apiKey);
    const { text } = await generateText({
      model: gateway("google/gemini-3.1-flash-lite"),
      system:
        "You summarise anonymous member rationales for a chapter board. Write in English. For each option, list the three to five main themes as short bullet points, with how many rationales mention each theme. Never quote anyone verbatim and never guess who wrote anything. Plain text with simple '-' bullets and the option name as a heading line.",
      prompt: `Proposal: ${vote.title}\n\n${ballots
        .map((b) => `[${labelOf(b.option_key)}] ${String(b.rationale).slice(0, RATIONALE_MAX)}`)
        .join("\n")}`,
    });
    await context.supabase.from("votes").update({ ai_summary: text }).eq("id", data.id);
    return { summary: text };
  });

// ---------------------------------------------------------------- members

export const listMemberVotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("votes")
      .select(
        "id, slug, title, title_de, title_fr, title_it, summary, summary_de, summary_fr, summary_it, category, status, opens_at, closes_at",
      )
      .in("status", ["published", "archived"])
      .order("closes_at", { ascending: false });
    if (error) throw new Error(error.message);
    const { data: mine } = await context.supabase.from("vote_participations").select("vote_id");
    const voted = new Set((mine ?? []).map((r) => r.vote_id));
    return (data ?? []).map((r) => ({
      ...r,
      status: r.status as VoteStatus,
      voted: voted.has(r.id),
    }));
  });

export const getMemberVote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ slug: z.string().min(1).max(200), preview: z.boolean().optional() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    if (data.preview) await assertMembership(context);
    let query = context.supabase.from("votes").select(VOTE_COLUMNS).eq("slug", data.slug);
    if (!data.preview) query = query.in("status", ["published", "archived"]);
    const { data: row } = await query.maybeSingle();
    if (!row) return null;
    const vote = asVote(row);
    const { data: mine } = await context.supabase
      .from("vote_participations")
      .select("vote_id")
      .eq("vote_id", vote.id);
    const { data: files } = await context.supabase
      .from("vote_attachments")
      .select("id, file_name, file_path, size_bytes")
      .eq("vote_id", vote.id)
      .order("created_at");
    const attachments = await Promise.all(
      (files ?? []).map(async (f) => {
        const { data: signed } = await context.supabase.storage
          .from("vote-files")
          .createSignedUrl(f.file_path, 3600, { download: f.file_name });
        return { id: f.id, name: f.file_name, size: f.size_bytes, url: signed?.signedUrl ?? null };
      }),
    );
    const { data: tally } = data.preview
      ? { data: null }
      : await context.supabase.rpc("vote_tally", { _vote_id: vote.id });
    const { data: rationales } = data.preview
      ? { data: [] }
      : await context.supabase.rpc("vote_rationales", { _vote_id: vote.id });
    // Board-only fields stay out of the member payload.
    const { ai_summary: _a, announce_enabled: _b, announced_at: _c, ...publicVote } = vote;
    return {
      vote: publicVote,
      voted: !data.preview && (mine ?? []).length > 0,
      attachments,
      tally: (tally as unknown as Tally | null) ?? null,
      rationales: (rationales ?? []) as { option_key: string; rationale: string }[],
    };
  });

export const castVote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        voteId: z.string().uuid(),
        option: z.string().min(1).max(40),
        rationale: z.string().max(RATIONALE_MAX).nullable(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { data: receipt, error } = await context.supabase.rpc("cast_vote", {
      _vote_id: data.voteId,
      _option_key: data.option,
      _rationale: data.rationale ?? "",
    });
    if (error) throw new Error(error.message);
    return { receipt: receipt as string };
  });
