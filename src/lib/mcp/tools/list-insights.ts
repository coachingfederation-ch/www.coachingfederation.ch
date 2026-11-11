/**
 * MCP tool definition to list or search published articles.
 * Exports: default (defineTool). Registered in the internal MCP tool registry.
 */
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { SITE_URL } from "@/i18n/config";
import { toAbsoluteMediaUrl } from "@/lib/media";
import { errorResult, sanitiseSearchText, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "list_insights",
  title: "List insights articles",
  description:
    "List published The Switzerland Chapter of ICF Insights articles (title, excerpt, category, language, publication date), newest first.",
  inputSchema: {
    language: z.enum(["en", "de", "fr", "it"]).optional().describe("Article language."),
    query: z.string().max(120).optional().describe("Free text matched against title and excerpt."),
    limit: z.number().int().min(1).max(50).optional().describe("Max results, default 10."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    let q = supabaseForUser(ctx)
      .from("articles")
      .select("id, title, excerpt, category, language, published_at, featured_image_url")
      .eq("status", "published")
      .order("published_at", { ascending: false });
    if (input.language) q = q.eq("language", input.language);
    const term = input.query ? sanitiseSearchText(input.query) : "";
    if (term) q = q.or(`title.ilike.%${term}%,excerpt.ilike.%${term}%`);

    const { data, error } = await q.limit(input.limit ?? 10);
    if (error) return errorResult("Could not list insights articles.");
    // Stored bucket images become the publication-checked media route.
    const articles = (data ?? []).map((a) => ({
      ...a,
      featured_image_url: toAbsoluteMediaUrl(a.featured_image_url, SITE_URL),
    }));
    return {
      ...textResult({ count: articles.length, articles }),
      structuredContent: { articles },
    };
  },
});
