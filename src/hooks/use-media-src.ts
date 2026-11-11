/**
 * Staff-side display of CMS media references.
 *
 * A stored media reference (`/api/public/media/<path>`) only resolves through
 * the public media route while the owning article, community or edition is
 * public — so a draft's own image would not load in its editor. Staff screens
 * therefore sign the path in the browser instead: storage RLS on the
 * article-images bucket is the boundary, exactly as for the upload itself.
 *
 * External images and legacy signed URLs pass through unchanged.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ARTICLE_IMAGE_BUCKET } from "@/lib/storage";
import { MEDIA_ROUTE_PREFIX, mediaPathOf } from "@/lib/media";

/** Staff preview links: 1h, minted per editing session. */
const STAFF_PREVIEW_TTL_SECONDS = 60 * 60;

function isMediaRef(value: string | null | undefined): value is string {
  return Boolean(value && value.startsWith(MEDIA_ROUTE_PREFIX));
}

/** Renderable URL for a stored image value, for staff screens only. */
export async function resolveStaffMediaSrc(
  value: string | null | undefined,
): Promise<string | null> {
  if (!value) return null;
  if (!isMediaRef(value)) return value;
  const path = mediaPathOf(value);
  if (!path) return null;
  const { data } = await supabase.storage
    .from(ARTICLE_IMAGE_BUCKET)
    .createSignedUrl(path, STAFF_PREVIEW_TTL_SECONDS);
  return data?.signedUrl ?? null;
}

/** Hook form of `resolveStaffMediaSrc`; null while a reference is being signed. */
export function useMediaSrc(value: string | null | undefined): string | null {
  const [src, setSrc] = useState<string | null>(isMediaRef(value) ? null : (value ?? null));
  useEffect(() => {
    if (!isMediaRef(value)) {
      setSrc(value ?? null);
      return;
    }
    let live = true;
    setSrc(null);
    void resolveStaffMediaSrc(value).then((next) => {
      if (live) setSrc(next);
    });
    return () => {
      live = false;
    };
  }, [value]);
  return src;
}
