/**
 * AI writing assistant for the Markdown body editor.
 *
 * Preview-then-apply by design: the panel never touches the draft until the
 * editor presses Replace or Insert, so a generation can always be discarded.
 * Consumed by components/cms/MarkdownEditor.tsx.
 */
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { useCms } from "@/i18n/cms";
import { assistWriting } from "@/lib/writing-assist.functions";

type Action = "improve" | "grammar" | "shorten" | "expand" | "continue" | "prompt";

const QUICK: Action[] = ["improve", "grammar", "shorten", "expand", "continue"];

export function AiAssistPanel({
  value,
  selection,
  language,
  onApply,
}: {
  value: string;
  /** Current textarea selection, or null when nothing is selected. */
  selection: { start: number; end: number } | null;
  language: string;
  onApply: (next: string, mode: "replace" | "insert") => void;
}) {
  const { t } = useCms();
  const run = useServerFn(assistWriting);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<Action | null>(null);

  const hasSelection = !!selection && selection.end > selection.start;
  const selected = hasSelection ? value.slice(selection!.start, selection!.end) : "";

  const generate = async (action: Action) => {
    setBusy(action);
    setError(null);
    setLastAction(action);
    try {
      // "Continue writing" always reads the whole body so the model can pick up
      // the thread; every other action honours the current selection.
      const text = action === "continue" ? value : hasSelection ? selected : value;
      const res = await run({
        data: {
          action,
          text,
          prompt: action === "prompt" ? prompt : undefined,
          language: ["de", "fr", "it", "en"].includes(language) ? language : "en",
        },
      });
      setResult(res.text);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setResult(null);
    } finally {
      setBusy(null);
    }
  };

  const apply = (mode: "replace" | "insert") => {
    if (!result) return;
    onApply(result, mode);
    setResult(null);
  };

  return (
    <div className="space-y-3 border-x border-b border-border bg-secondary/40 p-4">
      <div className="flex flex-wrap items-center gap-2">
        {QUICK.map((action) => (
          <button
            key={action}
            type="button"
            disabled={busy !== null}
            onClick={() => void generate(action)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-secondary disabled:opacity-60"
          >
            {busy === action ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Wand2 className="h-3.5 w-3.5" />
            )}
            {t(`ai.action.${action}`)}
          </button>
        ))}
        <span className="text-xs text-muted-foreground">
          {t(hasSelection ? "ai.scopeSelection" : "ai.scopeWhole")}
        </span>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={t("ai.promptPlaceholder")}
          className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/20"
        />
        <button
          type="button"
          disabled={busy !== null || prompt.trim().length === 0}
          onClick={() => void generate("prompt")}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
        >
          {busy === "prompt" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {t("ai.generate")}
        </button>
      </div>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      {result ? (
        <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("ai.resultTitle")}
          </p>
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap font-mono text-[13px] leading-relaxed text-foreground">
            {result}
          </pre>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => apply("replace")}
              className="rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
            >
              {t(hasSelection ? "ai.replaceSelection" : "ai.replaceAll")}
            </button>
            <button
              type="button"
              onClick={() => apply("insert")}
              className="rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium hover:bg-secondary"
            >
              {t("ai.insert")}
            </button>
            <button
              type="button"
              disabled={busy !== null || lastAction === null}
              onClick={() => lastAction && void generate(lastAction)}
              className="rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium hover:bg-secondary disabled:opacity-60"
            >
              {t("ai.regenerate")}
            </button>
            <button
              type="button"
              onClick={() => setResult(null)}
              className="rounded-full px-3.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary"
            >
              {t("ai.discard")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
