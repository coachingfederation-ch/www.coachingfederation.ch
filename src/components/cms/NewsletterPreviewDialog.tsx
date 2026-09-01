/**
 * Email preview of a newsletter edition (staff CMS).
 * Exports: NewsletterPreviewDialog. Used by /manage/newsletters/:id.
 *
 * The edition is rendered server-side with the same React Email template the
 * send path uses, so this shows exactly what a recipient would receive. The
 * markup is inline-styled email HTML and must not inherit the app stylesheet,
 * hence the sandboxed iframe.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Monitor, Smartphone } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Spinner,
  ToggleGroup,
  ToggleGroupItem,
} from "@/design-system/icf-welcome-design-system-a835df";
import { previewNewsletterFn } from "@/lib/newsletters.functions";
import { LOCALE_ORDER, type Locale } from "@/i18n/config";

export function NewsletterPreviewDialog({
  id,
  open,
  onOpenChange,
}: {
  id: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [width, setWidth] = useState<"desktop" | "mobile">("desktop");
  const [locale, setLocale] = useState<Locale>("en");
  const preview = useServerFn(previewNewsletterFn);

  const { data, isLoading, error } = useQuery({
    queryKey: ["newsletter-preview", id, locale],
    queryFn: () => preview({ data: { id, locale } }),
    enabled: open,
    staleTime: 0,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-dvh max-w-4xl flex-col">
        <DialogHeader>
          <DialogTitle>Email preview</DialogTitle>
          <DialogDescription>
            Enabled blocks only, in order — this is how the edition arrives in an inbox.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Preview language">
          {LOCALE_ORDER.map((code) => (
            <Button
              key={code}
              variant={locale === code ? "default" : "outline"}
              size="sm"
              onClick={() => setLocale(code)}
            >
              {code.toUpperCase()}
            </Button>
          ))}
        </div>

        <ToggleGroup
          type="single"
          value={width}
          onValueChange={(value) => value && setWidth(value as "desktop" | "mobile")}
          aria-label="Preview width"
        >
          <ToggleGroupItem value="desktop" aria-label="Desktop width">
            <Monitor className="h-4 w-4" />
            Desktop
          </ToggleGroupItem>
          <ToggleGroupItem value="mobile" aria-label="Mobile width">
            <Smartphone className="h-4 w-4" />
            Mobile
          </ToggleGroupItem>
        </ToggleGroup>

        <div className="flex min-h-0 flex-1 justify-center overflow-auto rounded-2xl bg-muted/40 p-4">
          {isLoading ? (
            <div className="flex items-center gap-2 self-center text-sm text-muted-foreground">
              <Spinner /> Rendering preview…
            </div>
          ) : error ? (
            <p className="self-center text-sm text-destructive">
              The preview could not be rendered. Save your blocks and try again.
            </p>
          ) : (
            <iframe
              title="Newsletter email preview"
              sandbox=""
              srcDoc={data?.html ?? ""}
              className={
                "h-full w-full rounded-xl border border-border bg-card " +
                (width === "mobile" ? "max-w-sm" : "max-w-2xl")
              }
            />
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
