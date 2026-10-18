/**
 * Optional plain-language summary of the privacy policy, closed by default.
 * Exports: PlainSummary. Used by src/pages/LegalPageShell.tsx on /privacy.
 * Copy lives in legal.json (privacy.summary.*); keep it in step with the policy.
 */
import * as React from "react";
import { ChevronDown } from "lucide-react";
import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/design-system/icf-welcome-design-system-a835df";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

export function PlainSummary() {
  const { t, tList } = useI18n();
  const [open, setOpen] = React.useState(false);
  const points = tList<string>("legal.privacy.summary.points");

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mb-12">
      <CollapsibleTrigger asChild>
        <Button variant="outline" className="min-h-11">
          {open ? t("legal.privacy.summary.hide") : t("legal.privacy.summary.show")}
          <ChevronDown
            aria-hidden
            className={cn("transition-transform motion-reduce:transition-none", open && "rotate-180")}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <section
          aria-labelledby="plain-summary-title"
          className="mt-4 rounded-2xl border border-border/70 bg-card p-6"
        >
          <h2 id="plain-summary-title" className="font-heading text-xl">
            {t("legal.privacy.summary.title")}
          </h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-foreground/80">
            {points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted-foreground">{t("legal.privacy.summary.note")}</p>
        </section>
      </CollapsibleContent>
    </Collapsible>
  );
}
