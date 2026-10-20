/**
 * Board digest card (admin, Integration page → Members & reporting).
 *
 * Configures the periodic summary email to the board's group mailbox:
 * on/off, recipient, cadence, send slot (Zurich time) and sections. Preview
 * renders the exact email in an iframe; "Send a test now" sends it without
 * moving the schedule.
 */
import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from "@/design-system/icf-welcome-design-system-a835df";
import { useCms } from "@/i18n/cms";
import {
  getBoardDigestSettings,
  previewBoardDigest,
  saveBoardDigestSettings,
  sendBoardDigestTest,
} from "@/lib/board-digest.functions";
import { DIGEST_SECTIONS, type BoardDigestSettings } from "@/lib/board-digest";

const CARD = "rounded-2xl border border-border bg-card p-5";
const HOURS = Array.from({ length: 24 }, (_, h) => h);

export function BoardDigestCard() {
  const { t } = useCms();
  const [s, setS] = useState<BoardDigestSettings | null>(null);
  const [busy, setBusy] = useState<"save" | "test" | "preview" | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  const load = async () => {
    try {
      setS(await getBoardDigestSettings());
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : t("integration.digestLoadError") });
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = async (kind: "save" | "test" | "preview") => {
    if (!s) return;
    setBusy(kind);
    setMessage(null);
    try {
      if (kind === "save") {
        await saveBoardDigestSettings({
          data: {
            enabled: s.enabled,
            recipient: s.recipient,
            cadence: s.cadence,
            weekday: s.weekday,
            hour: s.hour,
            sections: s.sections,
          },
        });
        setMessage({ ok: true, text: t("integration.digestSaved") });
      } else if (kind === "test") {
        const r = await sendBoardDigestTest();
        setMessage({ ok: r.sent, text: r.status });
        await load();
      } else {
        const r = await previewBoardDigest();
        setPreviewHtml(r.html);
      }
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "Error" });
    } finally {
      setBusy(null);
    }
  };

  if (!s) {
    return (
      <section className={CARD}>
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Mail className="h-4 w-4" /> {t("integration.digestTitle")}
        </h2>
        <p className="mt-3 text-xs text-muted-foreground">
          {message?.text ?? t("integration.loading")}
        </p>
      </section>
    );
  }

  const update = (patch: Partial<BoardDigestSettings>) => setS({ ...s, ...patch });

  return (
    <section id="section-digest" className={CARD + " scroll-mt-6"}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <Mail className="h-4 w-4" /> {t("integration.digestTitle")}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">{t("integration.digestIntro")}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {s.enabled ? t("integration.featureOn") : t("integration.featureOff")}
          </span>
          <Switch
            aria-label={t("integration.digestEnabled")}
            checked={s.enabled}
            onCheckedChange={(v) => update({ enabled: v })}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="digest-recipient">{t("integration.digestRecipient")}</Label>
          <Input
            id="digest-recipient"
            type="email"
            value={s.recipient}
            onChange={(e) => update({ recipient: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("integration.digestCadence")}</Label>
          <Select
            value={s.cadence}
            onValueChange={(v) => update({ cadence: v as BoardDigestSettings["cadence"] })}
          >
            <SelectTrigger aria-label={t("integration.digestCadence")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">{t("integration.digestWeekly")}</SelectItem>
              <SelectItem value="biweekly">{t("integration.digestBiweekly")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label>{t("integration.digestWeekday")}</Label>
            <Select value={String(s.weekday)} onValueChange={(v) => update({ weekday: Number(v) })}>
              <SelectTrigger aria-label={t("integration.digestWeekday")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    {t(`integration.digestDay${d}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("integration.digestHour")}</Label>
            <Select value={String(s.hour)} onValueChange={(v) => update({ hour: Number(v) })}>
              <SelectTrigger aria-label={t("integration.digestHour")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HOURS.map((h) => (
                  <SelectItem key={h} value={String(h)}>
                    {`${String(h).padStart(2, "0")}:00`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <fieldset className="mt-4">
        <legend className="text-sm font-semibold">{t("integration.digestSections")}</legend>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
          {DIGEST_SECTIONS.map((key) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={s.sections[key]}
                onCheckedChange={(v) => update({ sections: { ...s.sections, [key]: v === true } })}
              />
              {t(`integration.digestSection_${key}`)}
            </label>
          ))}
        </div>
      </fieldset>

      <p className="mt-4 text-xs text-muted-foreground">{t("integration.digestTimeZoneNote")}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button onClick={() => void run("save")} disabled={busy !== null}>
          {busy === "save" ? t("integration.digestSaving") : t("integration.digestSave")}
        </Button>
        <Button variant="outline" onClick={() => void run("preview")} disabled={busy !== null}>
          {busy === "preview" ? t("integration.digestBuilding") : t("integration.digestPreview")}
        </Button>
        <Button variant="outline" onClick={() => void run("test")} disabled={busy !== null}>
          {busy === "test" ? t("integration.digestSending") : t("integration.digestTest")}
        </Button>
      </div>

      {message ? (
        <p className={"mt-3 text-xs " + (message.ok ? "text-muted-foreground" : "text-destructive")}>
          {message.text}
        </p>
      ) : null}

      <p className="mt-3 text-xs text-muted-foreground">
        {s.lastSentAt
          ? `${t("integration.digestLastSent")} ${new Date(s.lastSentAt).toLocaleString()}`
          : t("integration.digestNeverSent")}
        {s.lastStatus ? ` · ${s.lastStatus}` : ""}
      </p>

      <Dialog open={previewHtml !== null} onOpenChange={(o) => !o && setPreviewHtml(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("integration.digestPreviewTitle")}</DialogTitle>
          </DialogHeader>
          {previewHtml ? (
            <iframe
              title={t("integration.digestPreviewTitle")}
              srcDoc={previewHtml}
              sandbox=""
              className="h-[70vh] w-full rounded-xl border border-border bg-card"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
