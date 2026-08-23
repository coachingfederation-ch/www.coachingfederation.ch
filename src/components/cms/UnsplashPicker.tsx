/**
 * Image search and selection dialog powered by the Unsplash API for CMS assets.
 * Exports: UnsplashPicker. Consumed by the article editor for cover image selection.
 */
import { useState } from "react";
import { Search, ImageOff } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/design-system/icf-welcome-design-system-a835df";
import {
  searchUnsplash,
  trackUnsplashDownload,
  type UnsplashPhoto,
} from "@/lib/unsplash.functions";
import { useCms } from "@/i18n/cms";

export interface UnsplashPick {
  url: string;
  creditName: string;
  creditUrl: string;
}

export function UnsplashPicker({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (pick: UnsplashPick) => void;
}) {
  const { t } = useCms();
  const search = useServerFn(searchUnsplash);
  const track = useServerFn(trackUnsplashDownload);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [photos, setPhotos] = useState<UnsplashPhoto[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const run = async (nextPage: number, append: boolean) => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    const res = await search({ data: { query: query.trim(), page: nextPage } });
    setLoading(false);
    setSearched(true);
    if (res.error) {
      setError(
        res.error === "unsplash_not_configured"
          ? t("unsplash.notConfigured")
          : t("unsplash.failed"),
      );
      if (!append) setPhotos([]);
      return;
    }
    setTotalPages(res.totalPages);
    setPage(nextPage);
    setPhotos((prev) => (append ? [...prev, ...res.photos] : res.photos));
  };

  const choose = (photo: UnsplashPhoto) => {
    void track({ data: { downloadLocation: photo.downloadLocation } });
    onPick({ url: photo.regular, creditName: photo.authorName, creditUrl: photo.authorUrl });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl rounded-2xl">
        <DialogHeader>
          <DialogTitle>{t("unsplash.title")}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(1, false);
          }}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("unsplash.searchPlaceholder")}
              className="w-full rounded-full border border-border bg-card py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {loading ? t("unsplash.searching") : t("unsplash.search")}
          </button>
        </form>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="max-h-[55vh] overflow-y-auto">
          {photos.length > 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {photos.map((p) => (
                <figure key={p.id} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => choose(p)}
                    className="block w-full overflow-hidden rounded-xl border border-border transition hover:ring-2 hover:ring-primary/40"
                  >
                    <img
                      src={p.thumb}
                      alt={p.alt}
                      loading="lazy"
                      className="h-28 w-full object-cover"
                    />
                  </button>
                  <figcaption className="truncate text-[11px] text-muted-foreground">
                    {p.authorName}
                  </figcaption>
                </figure>
              ))}
            </div>
          ) : searched && !loading && !error ? (
            <div className="flex flex-col items-center gap-2 py-12 text-sm text-muted-foreground">
              <ImageOff className="h-6 w-6" />
              {t("unsplash.noResults")}
            </div>
          ) : null}
        </div>

        {photos.length > 0 && page < totalPages ? (
          <button
            type="button"
            onClick={() => void run(page + 1, true)}
            disabled={loading}
            className="mx-auto rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-50"
          >
            {t("unsplash.loadMore")}
          </button>
        ) : null}

        <p className="text-center text-[11px] text-muted-foreground">{t("unsplash.terms")}</p>
      </DialogContent>
    </Dialog>
  );
}
