/**
 * Form state, loading and save logic for the Member Area profile editor.
 *
 * Owns the draft state for every editable field, the signed photo URL, and
 * the load/save/upload side effects. Exports the useMemberProfileForm hook,
 * consumed by MemberProfileEditor.tsx.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCms } from "@/i18n/cms";
import { fetchActiveVocabularies, type CoachFinderVocabularies } from "@/lib/vocabularies";
import { getMyMemberProfile, saveMyMemberProfile } from "@/lib/member-profile.functions";
import { useMyRoles } from "@/lib/roles";
import { publishBlockReason } from "@/lib/directory-eligibility";
import {
  EMPTY_PRACTICE,
  PHOTO_BUCKET,
  PHOTO_SIZE,
  PROFILE_IMAGE_PREVIEW_TTL_SECONDS,
  type LinkDraft,
  type PracticeDraft,
  type Profile,
} from "./types";

/** Centre-crop to a square and downscale — one small JPEG per member. */
async function toSquareJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = PHOTO_SIZE;
  canvas.height = PHOTO_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    PHOTO_SIZE,
    PHOTO_SIZE,
  );
  return await new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Encode failed"))),
      "image/jpeg",
      0.85,
    ),
  );
}

export function useMemberProfileForm() {
  const { t, locale } = useCms();
  // The team bio only makes sense for members who are part of the operational
  // structure, and that is exactly what the `editor` grant marks.
  const { roles } = useMyRoles();
  const isTeamMember = roles.isAdmin || roles.roles.includes("editor");
  const [data, setData] = useState<Profile | null | "unbound">(null);
  const [vocab, setVocab] = useState<CoachFinderVocabularies | null>(null);
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [availability, setAvailability] = useState("");
  const [services, setServices] = useState({
    coaching: false,
    mentoring: false,
    supervision: false,
  });
  const [facets, setFacets] = useState({
    region_ids: [] as string[],
    language_ids: [] as string[],
    format_ids: [] as string[],
    specialisation_ids: [] as string[],
    client_type_ids: [] as string[],
  });
  const [correspondenceLocale, setCorrespondenceLocale] = useState("");
  const [practice, setPractice] = useState<PracticeDraft>(EMPTY_PRACTICE);
  const [links, setLinks] = useState<LinkDraft[]>([]);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const apply = (next: Profile) => {
    setData(next);
    const p = next.profile;
    setCorrespondenceLocale(next.member?.correspondence_locale ?? "");
    setTagline(p?.tagline ?? "");
    setDescription(p?.description ?? "");
    setAvailability(p?.availability_slug ?? "");
    setServices({
      coaching: p?.coaching_available ?? false,
      mentoring: p?.mentoring_available ?? false,
      supervision: p?.supervision_available ?? false,
    });
    setFacets({
      region_ids: p?.region_ids ?? [],
      language_ids: p?.language_ids ?? [],
      format_ids: p?.format_ids ?? [],
      specialisation_ids: p?.specialisation_ids ?? [],
      client_type_ids: p?.client_type_ids ?? [],
    });
    setPractice({
      approach: p?.approach ?? "",
      qualifications: p?.qualifications ?? "",
      experience_band: p?.experience_band ?? "",
      session_length_note: p?.session_length_note ?? "",
      fees_note: p?.fees_note ?? "",
      availability_note: p?.availability_note ?? "",
      response_time_note: p?.response_time_note ?? "",
      booking_url: p?.booking_url ?? "",
      contact_email_public: p?.contact_email_public ?? false,
      testimonial_quote: p?.testimonial_quote ?? "",
      testimonial_attribution: p?.testimonial_attribution ?? "",
      team_bio: p?.team_bio ?? "",
    });
    setLinks(
      (p?.links ?? []).map((l) => ({ link_type: l.link_type, label: l.label ?? "", url: l.url })),
    );
    setImagePath(p?.profile_image_path ?? null);
  };

  useEffect(() => {
    void (async () => {
      try {
        const [profile, vocabularies] = await Promise.all([
          getMyMemberProfile(),
          fetchActiveVocabularies(),
        ]);
        setVocab(vocabularies);
        if (!profile) setData("unbound");
        else apply(profile as Profile);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    })();
  }, []);

  // Photos live in a private bucket; owners read them through a signed URL.
  useEffect(() => {
    let active = true;
    if (!imagePath) {
      setImageUrl(null);
      return;
    }
    void supabase.storage
      .from(PHOTO_BUCKET)
      .createSignedUrl(imagePath, PROFILE_IMAGE_PREVIEW_TTL_SECONDS)
      .then(({ data: signed }) => {
        if (active) setImageUrl(signed?.signedUrl ?? null);
      });
    return () => {
      active = false;
    };
  }, [imagePath]);

  const profile = typeof data === "object" && data ? data.profile : null;
  const member = typeof data === "object" && data ? data.member : null;
  const eligible = typeof data === "object" && data ? data.eligibility.eligible : false;

  const publishBlocked = useMemo(() => {
    const reason = publishBlockReason({
      eligible,
      regionCount: facets.region_ids.length,
    });
    if (reason === "ineligible") return t("member.blockedIneligible");
    if (reason === "no_region") return t("member.blockedNoRegion");
    return null;
  }, [eligible, facets.region_ids, t]);

  const toggle = (key: keyof typeof facets) => (id: string) =>
    setFacets((prev) => ({
      ...prev,
      [key]: prev[key].includes(id) ? prev[key].filter((v) => v !== id) : [...prev[key], id],
    }));

  const save = async (visibility?: "draft" | "published") => {
    setStatus("saving");
    setError(null);
    try {
      const next = await saveMyMemberProfile({
        data: {
          tagline: tagline || null,
          description: description || null,
          availability_slug: availability || null,
          correspondence_locale: (correspondenceLocale || null) as never,
          coaching_available: services.coaching,
          mentoring_available: services.mentoring,
          supervision_available: services.supervision,
          profile_image_path: imagePath,
          ...facets,
          approach: practice.approach || null,
          qualifications: practice.qualifications || null,
          experience_band: (practice.experience_band || null) as never,
          session_length_note: practice.session_length_note || null,
          fees_note: practice.fees_note || null,
          availability_note: practice.availability_note || null,
          response_time_note: practice.response_time_note || null,
          booking_url: practice.booking_url.trim() || null,
          contact_email_public: practice.contact_email_public,
          testimonial_quote: practice.testimonial_quote || null,
          testimonial_attribution: practice.testimonial_attribution || null,
          ...(isTeamMember ? { team_bio: practice.team_bio || null } : {}),
          links: links
            .filter((l) => l.url.trim().startsWith("https://"))
            .map((l) => ({ link_type: l.link_type, label: l.label || null, url: l.url.trim() })),
          ...(visibility ? { visibility } : {}),
        },
      });
      apply(next as Profile);
      setStatus("saved");
    } catch (err) {
      setStatus("idle");
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const onPickPhoto = async (file: File | undefined) => {
    if (!file || !member) return;
    setError(null);
    try {
      if (file.size > 8 * 1024 * 1024) throw new Error(t("member.photoTooLarge"));
      const blob = await toSquareJpeg(file);
      const path = `${member.id}/avatar-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(path, blob, { contentType: "image/jpeg", upsert: true });
      if (uploadError) throw uploadError;
      if (imagePath) await supabase.storage.from(PHOTO_BUCKET).remove([imagePath]);
      setImagePath(path);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return {
    t,
    locale,
    isTeamMember,
    data,
    vocab,
    tagline,
    setTagline,
    description,
    setDescription,
    availability,
    setAvailability,
    correspondenceLocale,
    setCorrespondenceLocale,
    services,
    setServices,
    facets,
    toggle,
    practice,
    setPractice,
    links,
    setLinks,
    imagePath,
    setImagePath,
    imageUrl,
    status,
    error,
    fileRef,
    profile,
    member,
    publishBlocked,
    save,
    onPickPhoto,
  };
}
