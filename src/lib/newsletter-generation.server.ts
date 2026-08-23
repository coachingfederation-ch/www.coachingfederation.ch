/**
 * Newsletter block generation.
 *
 * Two stages, deliberately separated:
 *  1. `collectSources` reads live platform data with the admin client. It runs
 *     server-side only (cron and staff server functions), never in a request
 *     the browser can shape.
 *  2. `generateBlock` turns one source bundle into editorial prose through the
 *     Lovable AI Gateway.
 *
 * Every asset block carries a `source_fingerprint` — a stable hash of the rows
 * that fed it. The weekly refresh compares fingerprints and skips regeneration
 * when nothing changed, so an editor's approved text is not churned for free
 * and the AI budget is only spent on real news.
 */
import type { SourceRef } from "./newsletters";

const MODEL = "google/gemini-3-flash-preview";

export interface SourceBundle {
  /** Human-readable facts handed to the model. */
  facts: string[];
  /** Links surfaced under the block in the editor and the archive. */
  refs: SourceRef[];
  /** Stable hash of the underlying rows. */
  fingerprint: string;
}

const EMPTY: SourceBundle = { facts: [], refs: [], fingerprint: "empty" };

/** Small, dependency-free stable hash (FNV-1a) — enough to detect changes. */
export function fingerprint(parts: unknown): string {
  const text = JSON.stringify(parts);
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

type Admin = {
  from: (table: string) => any;
};

const SITE = "https://new.coachingfederation.ch";

function sinceIso(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

/**
 * Gather the live data behind one asset block.
 *
 * @param since ISO timestamp; content newer than this counts as "this issue".
 */
export async function collectSources(
  supabase: Admin,
  blockType: string,
  since: string,
): Promise<SourceBundle> {
  switch (blockType) {
    case "insights": {
      const { data } = await supabase
        .from("articles")
        .select("id, title, excerpt, published_at")
        .eq("status", "published")
        .eq("language", "en")
        .gte("published_at", since)
        .order("published_at", { ascending: false })
        .limit(5);
      const rows = (data ?? []) as { id: string; title: string; excerpt: string }[];
      if (!rows.length) return EMPTY;
      return {
        facts: rows.map((r) => `${r.title} — ${r.excerpt}`),
        refs: rows.map((r) => ({ label: r.title, url: `${SITE}/insights/${r.id}` })),
        fingerprint: fingerprint(rows.map((r) => r.id)),
      };
    }

    case "volunteering": {
      const { data } = await supabase
        .from("op_projects")
        .select("id, slug, name, description, cadence_note, signup_url, is_community")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .limit(8);
      const rows = (data ?? []) as {
        id: string;
        slug: string;
        name: string;
        description: string | null;
        cadence_note: string | null;
        signup_url: string | null;
      }[];
      if (!rows.length) return EMPTY;
      return {
        facts: rows.map((r) =>
          [r.name, r.description, r.cadence_note].filter(Boolean).join(" — "),
        ),
        refs: rows.map((r) => ({
          label: r.name,
          url: r.signup_url ?? `${SITE}/about/operational-structure`,
        })),
        fingerprint: fingerprint(rows.map((r) => [r.id, r.description, r.cadence_note])),
      };
    }

    case "organization_updates": {
      const [{ count: active }, { data: joiners }, { data: docs }] = await Promise.all([
        supabase
          .from("members")
          .select("id", { count: "exact", head: true })
          .eq("activity_state", "active"),
        supabase
          .from("members")
          .select("id")
          .eq("activity_state", "active")
          .gte("membership_join_date", since.slice(0, 10))
          .limit(500),
        supabase
          .from("governance_documents")
          .select("id, title, updated_at")
          .gte("updated_at", since)
          .limit(5),
      ]);
      const newMembers = (joiners ?? []).length;
      const documents = (docs ?? []) as { id: string; title: string }[];
      const facts = [
        `Active members of The Switzerland Chapter of ICF: ${active ?? 0}.`,
        `New members since the last edition: ${newMembers}.`,
        ...documents.map((d) => `Updated governance document: ${d.title}.`),
      ];
      return {
        facts,
        refs: [{ label: "About the chapter", url: `${SITE}/about` }],
        fingerprint: fingerprint([active ?? 0, newMembers, documents.map((d) => d.id)]),
      };
    }

    case "chat_questions": {
      const { data } = await supabase
        .from("chat_interaction_logs")
        .select("id, category_slug, category_detail, outcome")
        .gte("occurred_at", since)
        .order("occurred_at", { ascending: false })
        .limit(120);
      const rows = (data ?? []) as {
        id: string;
        category_slug: string | null;
        category_detail: string | null;
      }[];
      if (!rows.length) return EMPTY;
      // Only aggregate themes reach the model — never a raw visitor message.
      const counts = new Map<string, number>();
      for (const row of rows) {
        const key = row.category_slug ?? "other";
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
      return {
        facts: top.map(([slug, n]) => `${n} questions about ${slug.replace(/[-_]/g, " ")}.`),
        refs: [{ label: "Ask the chapter assistant", url: SITE }],
        fingerprint: fingerprint(top),
      };
    }

    case "europe_pulse": {
      const { data } = await supabase
        .from("europe_pulse")
        .select("id, title_en, description_en, chapter, country, url, week_of")
        .eq("status", "published")
        .gte("week_of", since.slice(0, 10))
        .order("sort_rank", { ascending: true })
        .limit(6);
      const rows = (data ?? []) as {
        id: string;
        title_en: string;
        description_en: string | null;
        chapter: string;
        url: string;
      }[];
      if (!rows.length) return EMPTY;
      return {
        facts: rows.map((r) =>
          [`${r.chapter}: ${r.title_en}`, r.description_en].filter(Boolean).join(" — "),
        ),
        refs: rows.map((r) => ({ label: `${r.chapter}: ${r.title_en}`, url: r.url })),
        fingerprint: fingerprint(rows.map((r) => r.id)),
      };
    }

    case "upcoming_events": {
      const { data } = await supabase
        .from("events")
        .select("id, slug, title, summary, starts_at, city, location_mode")
        .eq("status", "published")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(6);
      const rows = (data ?? []) as {
        id: string;
        slug: string;
        title: string;
        summary: string | null;
        starts_at: string;
        city: string | null;
      }[];
      if (!rows.length) return EMPTY;
      return {
        facts: rows.map((r) =>
          [
            r.title,
            new Date(r.starts_at).toISOString().slice(0, 10),
            r.city ?? "online",
            r.summary,
          ]
            .filter(Boolean)
            .join(" — "),
        ),
        refs: rows.map((r) => ({ label: r.title, url: `${SITE}/events/${r.slug}` })),
        fingerprint: fingerprint(rows.map((r) => [r.id, r.starts_at, r.title])),
      };
    }

    case "bad_joke": {
      // Nothing to read: the joke is generated fresh each month. Fingerprint on
      // the month so the weekly refresh does not rewrite an approved joke.
      const month = new Date().toISOString().slice(0, 7);
      return { facts: [`Month: ${month}.`], refs: [], fingerprint: `joke-${month}` };
    }

    default:
      return EMPTY;
  }
}

const BRIEFS: Record<string, string> = {
  insights:
    "Introduce the newest Insights articles. One short lead-in sentence, then one bullet per article with its title in bold and a single sentence on why it is worth reading.",
  volunteering:
    "Invite members to volunteer. Name the open committees and communities, say what a volunteer actually does, and close with one clear next step.",
  organization_updates:
    "Report chapter updates: membership figures and any governance change. Use exact numbers, no approximations, and keep it to a short paragraph.",
  chat_questions:
    "Summarise what visitors asked the chapter assistant this month as themes. Never imply an individual person. Two to four sentences plus a short bullet list.",
  europe_pulse:
    "Round up news from other European ICF chapters. One bullet per item: chapter name in bold, then one sentence.",
  upcoming_events:
    "List the upcoming chapter events. One bullet per event: date, title in bold, format or city, and one sentence on who it is for.",
  bad_joke:
    "Write one short, gentle, workplace-safe joke about coaching, goals or listening. Two or three lines, self-deprecating rather than at anyone's expense.",
};

export interface GeneratedBlock {
  content: string;
  refs: SourceRef[];
  fingerprint: string;
}

/**
 * Draft one asset block from its source bundle.
 *
 * Returns `null` when there is no material — an empty block is left disabled
 * rather than filled with invented content.
 */
export async function generateBlock(
  blockType: string,
  bundle: SourceBundle,
): Promise<GeneratedBlock | null> {
  if (!bundle.facts.length) return null;
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI service is not configured");

  const brief = BRIEFS[blockType] ?? "Summarise the material below for a chapter newsletter.";
  const prompt = [
    brief,
    "",
    "Material (do not invent anything beyond it):",
    ...bundle.facts.map((f) => `- ${f}`),
    "",
    "Write in Markdown without a top-level heading. Keep it under 140 words.",
  ].join("\n");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "You write the monthly newsletter of The Switzerland Chapter of ICF. Voice: clear, warm, inclusive, active, present tense, American English, Oxford comma. Never invent testimonials, statistics or claims. Never write 'ICF Switzerland' or 'ICF CH' — always 'The Switzerland Chapter of ICF'.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (response.status === 429) throw new Error("Rate limit reached — please try again shortly.");
  if (response.status === 402) throw new Error("AI credits exhausted — please top up the workspace.");
  if (!response.ok) throw new Error(`AI service error (${response.status})`);

  const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const content = (payload.choices?.[0]?.message?.content ?? "").trim();
  if (!content) return null;
  return { content, refs: bundle.refs, fingerprint: bundle.fingerprint };
}

/**
 * Regenerate every asset block of an edition whose sources moved.
 *
 * @param force ignore fingerprints (the editor's explicit "regenerate")
 * @returns the ids of the blocks that were rewritten
 */
export async function refreshNewsletterBlocks(
  supabase: Admin,
  newsletterId: string,
  opts: { force?: boolean; since?: string } = {},
): Promise<string[]> {
  const since = opts.since ?? sinceIso(35);
  const { data, error } = await supabase
    .from("newsletter_blocks")
    .select("id, block_type, source_fingerprint")
    .eq("newsletter_id", newsletterId)
    .order("position", { ascending: true });
  if (error) throw error;

  const rows = (data ?? []) as {
    id: string;
    block_type: string;
    source_fingerprint: string | null;
  }[];
  const updated: string[] = [];

  for (const row of rows) {
    if (!(row.block_type in BRIEFS)) continue;
    const bundle = await collectSources(supabase, row.block_type, since);
    if (!bundle.facts.length) continue;
    if (!opts.force && bundle.fingerprint === row.source_fingerprint) continue;

    const generated = await generateBlock(row.block_type, bundle);
    if (!generated) continue;
    const { error: writeError } = await supabase
      .from("newsletter_blocks")
      .update({
        content: generated.content,
        source_refs: generated.refs,
        source_fingerprint: generated.fingerprint,
        generated_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    if (writeError) throw writeError;
    updated.push(row.id);
  }
  return updated;
}
