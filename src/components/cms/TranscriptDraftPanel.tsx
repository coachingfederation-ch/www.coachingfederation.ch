/**
 * "Draft from transcript" for the event recap: upload or paste meeting notes,
 * preview an AI headline and story, then apply them to the recap fields.
 * Nothing is saved here; the editor still presses Save recap.
 */
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles, Upload } from "lucide-react";
import { Button } from "@/design-system/icf-welcome-design-system-a835df";
import { cleanTranscript } from "@/lib/transcript-clean";
import { draftRecapFromTranscript } from "@/lib/recap-transcript.functions";

export function TranscriptDraftPanel({
  eventId,
  language,
  hasContent,
  onApply,
  t,
}: {
  eventId: string;
  language: string;
  hasContent: boolean;
  onApply: (headline: string, story: string) => void;
  t: (key: string) => string;
}) {
  const run = useServerFn(draftRecapFromTranscript);
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [pasting, setPasting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ headline: string; story: string } | null>(null);

  const generate = async (source: string) => {
    const cleaned = cleanTranscript(source);
    if (!cleaned) {
      setError(t("recap.transcriptEmpty"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const lang = ["de", "fr", "it", "en"].includes(language) ? language : "en";
      setDraft(
        await run({
          data: { eventId, text: cleaned, language: lang as "de" | "fr" | "it" | "en" },
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const raw = await file.text();
    setFileName(file.name);
    setText(raw);
    void generate(raw);
  };

  const apply = () => {
    if (!draft) return;
    if (hasContent && !window.confirm(t("recap.transcriptReplaceConfirm"))) return;
    onApply(draft.headline, draft.story);
    setDraft(null);
  };

  return (
    <div className="mt-5 space-y-3 rounded-2xl border border-border bg-secondary/40 p-4">
      <div>
        <p className="text-sm font-medium">{t("recap.transcriptTitle")}</p>
        <p className="text-xs text-muted-foreground">{t("recap.transcriptHint")}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept=".md,.txt,text/plain,text/markdown"
          className="sr-only"
          aria-label={t("recap.transcriptUpload")}
          onChange={(e) => {
            void onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => fileRef.current?.click()}>
          <Upload className="h-4 w-4" />
          {t("recap.transcriptUpload")}
        </Button>
        <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => setPasting((p) => !p)}>
          {t("recap.transcriptPaste")}
        </Button>
        {busy ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t("recap.transcriptWorking")}
          </span>
        ) : fileName ? (
          <span className="text-xs text-muted-foreground">{fileName}</span>
        ) : null}
      </div>
      {pasting ? (
        <div className="space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            aria-label={t("recap.transcriptPaste")}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
          />
          <Button type="button" size="sm" disabled={busy || !text.trim()} onClick={() => void generate(text)}>
            <Sparkles className="h-4 w-4" />
            {t("recap.transcriptGenerate")}
          </Button>
        </div>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {draft ? (
        <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
          <p className="font-heading text-lg">{draft.headline}</p>
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap font-sans text-sm leading-relaxed">
            {draft.story}
          </pre>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="button" size="sm" onClick={apply}>
              {t("recap.transcriptUse")}
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void generate(text)}>
              {t("recap.transcriptRegenerate")}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setDraft(null)}>
              {t("recap.transcriptDiscard")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
