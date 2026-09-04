/**
 * Member Area RPC surface. Every call is authenticated; the member record is
 * resolved from the bearer token's user id, so no caller can address someone
 * else's profile.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const linkSchema = z.object({
  link_type: z.enum(["website", "linkedin", "other"]),
  label: z.string().max(80).nullish(),
  url: z.string().url().max(250).startsWith("https://"),
});

const updateSchema = z.object({
  correspondence_locale: z.enum(["en", "de", "fr", "it"]).nullish(),
  tagline: z.string().max(160).nullish(),
  description: z.string().max(3000).nullish(),
  availability_slug: z.string().max(60).nullish(),
  coaching_available: z.boolean().optional(),
  mentoring_available: z.boolean().optional(),
  supervision_available: z.boolean().optional(),
  visibility: z.enum(["draft", "published"]).optional(),
  profile_image_path: z.string().max(300).nullish(),
  booking_url: z.string().max(250).nullish(),
  contact_email_public: z.boolean().optional(),
  response_time_note: z.string().max(120).nullish(),
  approach: z.string().max(2000).nullish(),
  qualifications: z.string().max(2000).nullish(),
  // Slug of a row in `cf_experience_bands`; existence is checked server-side.
  experience_band: z.string().max(60).nullish(),
  session_length_note: z.string().max(120).nullish(),
  fees_note: z.string().max(2000).nullish(),
  availability_note: z.string().max(120).nullish(),
  testimonial_quote: z.string().max(400).nullish(),
  testimonial_attribution: z.string().max(120).nullish(),
  // Volunteer bio for the public team page; shown only to members who hold
  // the `editor` grant, i.e. who are part of the operational structure.
  team_bio: z.string().max(2000).nullish(),
  region_ids: z.array(z.string().uuid()).max(40).optional(),
  language_ids: z.array(z.string().uuid()).max(40).optional(),
  format_ids: z.array(z.string().uuid()).max(40).optional(),
  specialisation_ids: z.array(z.string().uuid()).max(40).optional(),
  client_type_ids: z.array(z.string().uuid()).max(40).optional(),
  links: z.array(linkSchema).max(6).optional(),
});

export const getMyMemberProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { loadMyMemberProfile } = await import("./member-profile.server");
    return await loadMyMemberProfile(context.userId);
  });

export const saveMyMemberProfile = createServerFn({ method: "POST" })
  .inputValidator((input) => updateSchema.parse(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { updateMyMemberProfile } = await import("./member-profile.server");
    return await updateMyMemberProfile(context.userId, data as never);
  });
