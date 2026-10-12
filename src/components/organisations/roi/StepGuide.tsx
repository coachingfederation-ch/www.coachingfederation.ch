/** Named step guide for the ROI Simulator — completed steps are clickable. */
import { Check } from "lucide-react";
import { cn } from "@/design-system/icf-welcome-design-system-a835df";
import { useI18n } from "@/i18n";
import { GROUPS } from "./screens";

export function StepGuide({
  current,
  furthest,
  onSelect,
}: {
  current: number;
  furthest: number;
  onSelect: (group: number) => void;
}) {
  const { t } = useI18n();
  return (
    <nav aria-label={t("roi.guide.label")}>
      <ol className="grid grid-cols-4 gap-2">
        {GROUPS.map((g, i) => {
          const Icon = g.icon;
          const done = i < current || (i <= furthest && i !== current);
          const active = i === current;
          const reachable = i <= furthest;
          return (
            <li key={g.key}>
              <button
                type="button"
                disabled={!reachable}
                aria-current={active ? "step" : undefined}
                onClick={() => onSelect(i)}
                className={cn(
                  "flex min-h-11 w-full flex-col items-start gap-2 rounded-2xl border-t-4 pt-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed",
                  active ? "border-primary" : done ? "border-primary/40" : "border-border",
                )}
              >
                <span
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full",
                    active
                      ? "bg-primary text-primary-foreground"
                      : done
                        ? "bg-secondary text-secondary-foreground"
                        : "bg-muted text-muted-foreground",
                  )}
                  aria-hidden="true"
                >
                  {done ? <Check className="size-4" /> : <Icon className="size-4" />}
                </span>
                <span
                  className={cn(
                    "hidden text-sm sm:block",
                    active ? "font-semibold text-foreground" : "text-muted-foreground",
                  )}
                >
                  {t(`roi.guide.${g.key}`)}
                </span>
                <span className="sr-only sm:hidden">{t(`roi.guide.${g.key}`)}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
