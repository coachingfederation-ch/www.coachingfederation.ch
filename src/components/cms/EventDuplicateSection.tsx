/**
 * Duplicate panel: copies one event into a fresh draft on a chosen date.
 *
 * The copy is made from the stored row, so — like the repeat and series
 * panels — it only unlocks once nothing is left unsaved.
 */
import * as React from "react";
import { Button } from "@/design-system/icf-welcome-design-system-a835df";
import {
  Field,
  Section,
  inputClass,
  toLocalInput,
  fromLocalInput,
} from "@/components/cms/EventEditorSections";

export function EventDuplicateSection({
  startsAt,
  onDuplicate,
  canDuplicate,
  blockedReason,
  t,
}: {
  startsAt: string;
  onDuplicate: (startsAtIso: string) => Promise<void>;
  canDuplicate: boolean;
  blockedReason: string | null;
  t: (k: string) => string;
}) {
  const [when, setWhen] = React.useState(() => toLocalInput(startsAt));
  const [busy, setBusy] = React.useState(false);

  return (
    <Section title={t("events.duplicate.section")} hint={t("events.duplicate.hint")}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("events.duplicate.newDate")}>
          <input
            type="datetime-local"
            className={inputClass}
            value={when}
            onChange={(e) => setWhen(e.target.value)}
          />
        </Field>
      </div>

      {blockedReason ? <p className="mt-4 text-sm text-muted-foreground">{blockedReason}</p> : null}

      <div className="mt-4">
        <Button
          type="button"
          variant="outline"
          size="pill"
          disabled={busy || !when || !canDuplicate}
          onClick={async () => {
            const iso = fromLocalInput(when);
            if (!iso) return;
            setBusy(true);
            try {
              await onDuplicate(iso);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? t("events.duplicate.working") : t("events.duplicate.action")}
        </Button>
      </div>
    </Section>
  );
}
