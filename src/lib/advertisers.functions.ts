/**
 * External advertiser onboarding (non-ICF members booking "Advertise with us").
 *
 * The `advertiser` role is only ever granted by the security-definer RPC
 * `complete_advertiser_onboarding`, called here with the caller's own
 * RLS-scoped client — so it always applies to `auth.uid()`, never to a
 * client-supplied id. Synced `members` rows are never written.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AdvertiserProfile = {
  organisation: string;
  contact_name: string;
  phone: string | null;
  billing_country: string;
  billing_postcode: string;
  billing_city: string;
  billing_street: string;
  vat_number: string | null;
};

const profileSchema = z.object({
  organisation: z.string().trim().min(1).max(200),
  contactName: z.string().trim().min(1).max(200),
  phone: z.string().trim().max(50).optional().default(""),
  billingCountry: z.string().trim().min(1).max(100),
  billingPostcode: z.string().trim().min(1).max(20),
  billingCity: z.string().trim().min(1).max(100),
  billingStreet: z.string().trim().min(1).max(200),
  vatNumber: z.string().trim().max(50).optional().default(""),
});

export const getMyAdvertiserProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdvertiserProfile | null> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = context.supabase as any;
    const { data, error } = await db
      .from("advertiser_profiles")
      .select(
        "organisation, contact_name, phone, billing_country, billing_postcode, billing_city, billing_street, vat_number",
      )
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) return null;
    return (data ?? null) as AdvertiserProfile | null;
  });

export const completeAdvertiserOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => profileSchema.parse(input))
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    const { checkRateLimit } = await import("./rate-limit.server");
    await checkRateLimit(`advertiser-onboarding:${context.userId}`, 10, 3600);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = context.supabase as any;
    const { error } = await db.rpc("complete_advertiser_onboarding", {
      _organisation: data.organisation,
      _contact_name: data.contactName,
      _phone: data.phone,
      _billing_country: data.billingCountry,
      _billing_postcode: data.billingPostcode,
      _billing_city: data.billingCity,
      _billing_street: data.billingStreet,
      _vat_number: data.vatNumber,
    });
    if (error) throw new Error("We could not save your profile. Please try again.");
    return { ok: true };
  });
