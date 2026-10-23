/**
 * Publishing settings for one survey: status, opening window, response limit,
 * contact collection, and the shareable link with a QR code download.
 * Saved separately from the questions so opening or closing a survey never
 * re-runs translation.
 */
import { useState } from "react";
import { Copy, Download } from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from "@/design-system/icf-welcome-design-system-a835df";
import { saveSurveyPublishing } from "@/lib/surveys.functions";
import { SURVEY_STATUSES, type SurveyStatus } from "@/lib/surveys";

export type PublishSettings = {
  status: SurveyStatus;
  opens_at: string | null;
  closes_at: string | null;
  max_responses: number | null;
  collect_contact: boolean;
  one_per_browser: boolean;
  members_only: boolean;
};

/** ISO → value for <input type="datetime-local"> in the browser's time zone. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);

export function SurveyPublishPanel({
  id,
  slug,
  initial,
  t,
}: {
  id: string;
  slug: string;
  initial: PublishSettings;
  t: (key: string) => string;
}) {
  const [s, setS] = useState(initial);
  const [busy, setBusy] = useState(false);
  const url =
    typeof window === "undefined" ? `/survey/${slug}` : `${window.location.origin}/survey/${slug}`;
  const patch = (p: Partial<PublishSettings>) => setS((prev) => ({ ...prev, ...p }));

  const save = async () => {
    setBusy(true);
    try {
      await saveSurveyPublishing({ data: { id, ...s } });
      toast.success(t("forms.surveys.publishSaved"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const downloadQr = async () => {
    const dataUrl = await QRCode.toDataURL(url, { width: 1024, margin: 2 });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `survey-${slug}.png`;
    a.click();
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="font-heading font-normal">
          {t("forms.surveys.publishTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1">
            <Label htmlFor="sv-link">{t("forms.surveys.link")}</Label>
            <Input id="sv-link" className="mt-1" readOnly value={url} />
          </div>
          <Button
            variant="outline"
            onClick={() => {
              void navigator.clipboard.writeText(url);
              toast.success(t("forms.surveys.linkCopied"));
            }}
          >
            <Copy />
            {t("forms.surveys.copyLink")}
          </Button>
          <Button variant="outline" onClick={() => void downloadQr()}>
            <Download />
            {t("forms.surveys.qr")}
          </Button>
        </div>
        {s.status !== "open" ? (
          <p className="text-xs text-muted-foreground">{t("forms.surveys.linkInactiveHint")}</p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="sv-status">{t("forms.surveys.status")}</Label>
            <Select value={s.status} onValueChange={(v) => patch({ status: v as SurveyStatus })}>
              <SelectTrigger id="sv-status" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SURVEY_STATUSES.map((st) => (
                  <SelectItem key={st} value={st}>
                    {t(`forms.surveys.statusLabel.${st}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="sv-max">{t("forms.surveys.maxResponses")}</Label>
            <Input
              id="sv-max"
              className="mt-1"
              type="number"
              min={1}
              inputMode="numeric"
              placeholder={t("forms.surveys.noLimit")}
              value={s.max_responses ?? ""}
              onChange={(e) =>
                patch({
                  max_responses: e.target.value ? Math.max(1, Number(e.target.value)) : null,
                })
              }
            />
          </div>
          <div>
            <Label htmlFor="sv-open">{t("forms.surveys.opensAt")}</Label>
            <Input
              id="sv-open"
              className="mt-1"
              type="datetime-local"
              value={toLocalInput(s.opens_at)}
              onChange={(e) => patch({ opens_at: fromLocalInput(e.target.value) })}
            />
          </div>
          <div>
            <Label htmlFor="sv-close">{t("forms.surveys.closesAt")}</Label>
            <Input
              id="sv-close"
              className="mt-1"
              type="datetime-local"
              value={toLocalInput(s.closes_at)}
              onChange={(e) => patch({ closes_at: fromLocalInput(e.target.value) })}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Switch
              id="sv-contact"
              checked={s.collect_contact}
              onCheckedChange={(v) => patch({ collect_contact: v })}
            />
            <div>
              <Label htmlFor="sv-contact">{t("forms.surveys.collectContact")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("forms.surveys.collectContactHint")}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Switch
              id="sv-members"
              checked={s.members_only}
              onCheckedChange={(v) => patch({ members_only: v })}
            />
            <div>
              <Label htmlFor="sv-members">{t("forms.surveys.membersOnly")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("forms.surveys.membersOnlyHint")}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Switch
              id="sv-once"
              checked={s.one_per_browser}
              onCheckedChange={(v) => patch({ one_per_browser: v })}
            />
            <div>
              <Label htmlFor="sv-once">{t("forms.surveys.onePerBrowser")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("forms.surveys.onePerBrowserHint")}
              </p>
            </div>
          </div>
        </div>

        <Button disabled={busy} onClick={() => void save()}>
          {busy ? t("forms.surveys.saving") : t("forms.surveys.savePublishing")}
        </Button>
      </CardContent>
    </Card>
  );
}
