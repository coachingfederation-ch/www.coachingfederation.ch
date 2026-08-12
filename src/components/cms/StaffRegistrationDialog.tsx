/**
 * Add-attendee dialog for the event editor.
 *
 * Staff-created seats are always comped: no price, no payment. The dialog
 * therefore collects only who is coming, in which language they should be
 * written to, and — on a ticketed event — which tier the seat belongs to.
 */
import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createStaffRegistration } from "@/lib/events-admin.functions";

const inputClass = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm";

export function StaffRegistrationDialog({
  open,
  onOpenChange,
  eventId,
  tiers,
  onCreated,
  t,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  tiers: { id: string; name: string }[];
  onCreated: () => void | Promise<void>;
  t: (k: string) => string;
}) {
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [locale, setLocale] = React.useState<"en" | "de" | "fr" | "it">("en");
  const [tierId, setTierId] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [sendConfirmation, setSendConfirmation] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const reset = () => {
    setFullName("");
    setEmail("");
    setTierId("");
    setNotes("");
    setError(null);
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await createStaffRegistration({
        data: {
          eventId,
          fullName: fullName.trim(),
          email: email.trim(),
          locale,
          tierId: tierId || null,
          notes: notes.trim() || null,
          sendConfirmation,
        },
      });
      if (!result.ok) {
        setError(t("events.staffAdd.alreadyRegistered"));
        return;
      }
      reset();
      onOpenChange(false);
      await onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("events.saveError"));
    } finally {
      setBusy(false);
    }
  };

  const valid = fullName.trim().length >= 2 && /.+@.+\..+/.test(email.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("events.staffAdd.title")}</DialogTitle>
          <DialogDescription>{t("events.staffAdd.hint")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">
              {t("events.colName")}
            </span>
            <input
              className={inputClass}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">
              {t("events.colEmail")}
            </span>
            <input
              type="email"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                {t("events.fieldLanguage")}
              </span>
              <select
                className={inputClass}
                value={locale}
                onChange={(e) => setLocale(e.target.value as typeof locale)}
              >
                <option value="de">DE</option>
                <option value="fr">FR</option>
                <option value="it">IT</option>
                <option value="en">EN</option>
              </select>
            </label>
            {tiers.length > 0 ? (
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                  {t("events.staffAdd.tier")}
                </span>
                <select
                  className={inputClass}
                  value={tierId}
                  onChange={(e) => setTierId(e.target.value)}
                >
                  <option value="">{t("events.staffAdd.noTier")}</option>
                  {tiers.map((tier) => (
                    <option key={tier.id} value={tier.id}>
                      {tier.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">
              {t("events.staffAdd.notes")}
            </span>
            <input
              className={inputClass}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={sendConfirmation}
              onChange={(e) => setSendConfirmation(e.target.checked)}
            />
            {t("events.staffAdd.sendConfirmation")}
          </label>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary"
          >
            {t("events.staffAdd.cancel")}
          </button>
          <button
            type="button"
            disabled={!valid || busy}
            onClick={() => void submit()}
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy ? t("events.saving") : t("events.staffAdd.submit")}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
