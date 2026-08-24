/**
 * "After event" recap on the public event page.
 * Exports: EventRecap. Rendered by pages/EventDetail.tsx when a recap is live.
 *
 * The story and the web-sized gallery are public. The originals and the
 * attachments are not: this component never receives a download URL, it asks
 * for one and the server decides — so an unentitled visitor sees the same
 * page, just without links.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileText, Loader2, X } from "lucide-react";
import { Markdown } from "@/components/markdown";
import { ShareBlock } from "@/components/share-buttons";
import { AiBadge, Button } from "@/design-system/icf-welcome-design-system-a835df";
import { useI18n } from "@/i18n";
import { formatFileSize, type PublicRecap } from "@/lib/event-recaps";
import { getRecapDownloads, getRecapDownloadsPublic } from "@/lib/event-recaps.functions";

/** Zips the signed originals in the browser: the bytes stay behind short-lived
 * links, and the Worker never has to hold a whole gallery in memory. */
async function downloadZip(
  items: { filename: string; url: string }[],
  name: string,
): Promise<void> {
  const { zip } = await import("fflate");
  const entries: Record<string, Uint8Array> = {};
  for (const item of items) {
    const response = await fetch(item.url);
    if (!response.ok) continue;
    entries[item.filename] = new Uint8Array(await response.arrayBuffer());
  }
  const blob: Blob = await new Promise((resolve, reject) => {
    zip(entries, { level: 0 }, (error, data) => {
      if (error) reject(error);
      else resolve(new Blob([data as BlobPart], { type: "application/zip" }));
    });
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name}.zip`;
  link.click();
  URL.revokeObjectURL(url);
}

export function EventRecap({
  recap,
  eventId,
  eventTitle,
  shareUrl,
  signedIn,
}: {
  recap: PublicRecap;
  eventId: string;
  eventTitle: string;
  shareUrl: string;
  signedIn: boolean;
}) {
  const { t } = useI18n();
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [zipping, setZipping] = useState(false);

  const gated = recap.downloads_audience !== "public";
  const hasDownloads = recap.hasOriginals || recap.files.length > 0;

  const downloads = useQuery({
    queryKey: ["event-recap-downloads", eventId, signedIn],
    queryFn: () =>
      gated
        ? getRecapDownloads({ data: { eventId } })
        : getRecapDownloadsPublic({ data: { eventId } }),
    enabled: hasDownloads && (!gated || signedIn),
    retry: false,
  });

  const items = downloads.data?.entitled ? downloads.data.items : [];
  const photoItems = items.filter((item) => item.kind === "photo");
  const fileItems = items.filter((item) => item.kind === "file");
  const active = lightbox === null ? null : (recap.photos[lightbox] ?? null);

  return (
    <section id="recap" className="border-t border-border/70 bg-card">
      <div className="mx-auto max-w-5xl px-8 py-16">
        <p className="eyebrow text-primary">{t("events.recap.eyebrow")}</p>
        <h2 className="mt-3 font-heading text-3xl tracking-tight sm:text-4xl">
          {recap.headline || t("events.recap.defaultHeadline")}
        </h2>

        {recap.body ? (
          <div className="prose-icf mt-6 max-w-none text-base text-foreground/90">
            <Markdown>{recap.body}</Markdown>
          </div>
        ) : null}

        {recap.photos.length > 0 ? (
          <div className="mt-10">
            <h3 className="eyebrow text-muted-foreground">{t("events.recap.gallery")}</h3>
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {recap.photos.map((photo, index) =>
                photo.url ? (
                  <li key={photo.id}>
                    <button
                      type="button"
                      onClick={() => setLightbox(index)}
                      className="group relative block w-full overflow-hidden rounded-2xl border border-border/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      aria-label={photo.caption || photo.alt || t("events.recap.openPhoto")}
                    >
                      <img
                        src={photo.url}
                        alt={photo.alt ?? ""}
                        loading="lazy"
                        className="aspect-4/3 w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                      {photo.is_ai ? <AiBadge className="absolute bottom-2 left-2" /> : null}
                    </button>
                    {photo.caption ? (
                      <p className="mt-2 text-xs text-muted-foreground">{photo.caption}</p>
                    ) : null}
                  </li>
                ) : null,
              )}
            </ul>
          </div>
        ) : null}

        {hasDownloads ? (
          <div className="mt-10 rounded-2xl border border-border/70 bg-background p-6">
            <h3 className="text-lg font-semibold tracking-tight">
              {t("events.recap.downloads.title")}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t(`events.recap.downloads.audience.${recap.downloads_audience}`)}
            </p>

            {gated && !signedIn ? (
              <p className="mt-4 text-sm text-muted-foreground">
                {t("events.recap.downloads.signIn")}
              </p>
            ) : downloads.isPending ? (
              <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> {t("events.recap.downloads.loading")}
              </p>
            ) : !downloads.data?.entitled ? (
              <p className="mt-4 text-sm text-muted-foreground">
                {t("events.recap.downloads.notEntitled")}
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                {photoItems.length > 0 ? (
                  <Button
                    type="button"
                    size="pill"
                    disabled={zipping}
                    onClick={async () => {
                      setZipping(true);
                      try {
                        await downloadZip(photoItems, `${eventTitle.slice(0, 60)}-photos`);
                      } finally {
                        setZipping(false);
                      }
                    }}
                  >
                    <Download className="h-4 w-4" />
                    {zipping
                      ? t("events.recap.downloads.preparing")
                      : t("events.recap.downloads.allPhotos").replace(
                          "{n}",
                          String(photoItems.length),
                        )}
                  </Button>
                ) : null}

                {fileItems.length > 0 ? (
                  <ul className="divide-y divide-border/70">
                    {fileItems.map((item) => {
                      const meta = recap.files.find((f) => f.id === item.id);
                      const size = formatFileSize(meta?.size_bytes ?? null);
                      return (
                        <li key={item.id} className="flex items-center gap-3 py-3">
                          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <a
                            href={item.url}
                            download={item.filename}
                            className="text-sm font-semibold text-primary hover:underline"
                          >
                            {meta?.label || item.filename}
                          </a>
                          {size ? (
                            <span className="text-xs text-muted-foreground">{size}</span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>
            )}
          </div>
        ) : null}

        <ShareBlock url={shareUrl} title={recap.headline || eventTitle} />
      </div>

      {active?.url ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={active.caption || active.alt || t("events.recap.openPhoto")}
          className="fixed inset-0 z-50 flex items-center justify-center bg-hero/90 p-6"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            aria-label={t("events.recap.closePhoto")}
            className="absolute right-5 top-5 inline-flex h-11 w-11 items-center justify-center rounded-full bg-card text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
          <figure className="max-h-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <img
              src={active.url}
              alt={active.alt ?? ""}
              className="max-h-[75vh] w-full rounded-2xl object-contain"
            />
            {active.caption ? (
              <figcaption className="mt-3 text-center text-sm text-hero-foreground">
                {active.caption}
              </figcaption>
            ) : null}
          </figure>
        </div>
      ) : null}
    </section>
  );
}
