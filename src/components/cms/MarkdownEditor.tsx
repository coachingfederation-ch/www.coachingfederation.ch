/**
 * Multi-mode (Write/Split/Preview) Markdown editor for the staff CMS.
 * Exports: MarkdownEditor, MarkdownPreview. Consumed by the article editor and translation panels.
 */
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Pencil, Columns2, Eye, Sparkles } from "lucide-react";
import { Markdown } from "@/components/markdown";
import { MarkdownToolbar } from "@/components/cms/MarkdownToolbar";
import { AiAssistPanel } from "@/components/cms/AiAssistPanel";
import { useCms } from "@/i18n/cms";

export type EditorMode = "write" | "split" | "preview";
const ALL_MODES: { key: EditorMode; icon: typeof Pencil }[] = [
  { key: "write", icon: Pencil },
  { key: "split", icon: Columns2 },
  { key: "preview", icon: Eye },
];

const STORAGE_KEY = "cms.editorMode";

function useDebounced(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

/** Live preview pane that renders through the same component as public articles. */
export function MarkdownPreview({ content, className }: { content: string; className?: string }) {
  const { t } = useCms();
  const body = useDebounced(content, 150);
  const rendered = useMemo(() => (body.trim() ? <Markdown>{body}</Markdown> : null), [body]);
  return (
    <div className={className}>
      {rendered ?? (
        <p className="text-sm italic text-muted-foreground">{t("editor.previewEmpty")}</p>
      )}
    </div>
  );
}

/** Write / Split / Preview Markdown editor with the formatting toolbar. */
export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  rows = 20,
  textareaRef,
  language = "en",
  modes = ["write", "split", "preview"],
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  rows?: number;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
  /** Source language of the document, passed to the AI assistant. */
  language?: string;
  /** Which view modes to offer; callers can drop the side-by-side split. */
  modes?: EditorMode[];
}) {
  const { t } = useCms();
  const fallbackRef = useRef<HTMLTextAreaElement | null>(null);
  const ref = textareaRef ?? fallbackRef;
  const [mode, setMode] = useState<EditorMode>("write");
  const available = ALL_MODES.filter((m) => modes.includes(m.key));
  const [aiOpen, setAiOpen] = useState(false);
  // Mirrors the textarea selection so the panel keeps its scope after focus
  // moves into the panel's own controls.
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);

  const syncSelection = () => {
    const el = ref.current;
    if (!el) return;
    setSelection(
      el.selectionEnd > el.selectionStart
        ? { start: el.selectionStart, end: el.selectionEnd }
        : { start: el.selectionStart, end: el.selectionStart },
    );
  };

  const applyAi = (text: string, applyMode: "replace" | "insert") => {
    const sel = selection;
    const hasSelection = !!sel && sel.end > sel.start;
    if (applyMode === "replace") {
      onChange(hasSelection ? value.slice(0, sel!.start) + text + value.slice(sel!.end) : text);
      return;
    }
    const at = sel ? sel.end : value.length;
    const prefix = value.slice(0, at);
    const separator = prefix && !prefix.endsWith("\n") ? "\n\n" : "";
    onChange(prefix + separator + text + value.slice(at));
  };

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (
      (stored === "write" || stored === "split" || stored === "preview") &&
      modes.includes(stored)
    ) {
      setMode(stored);
      return;
    }
    if (typeof window !== "undefined" && window.innerWidth >= 1024 && modes.includes("split"))
      setMode("split");
    // Mode set is fixed per call site; only the initial choice matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pick = (next: EditorMode) => {
    setMode(next);
    // Only the full editor persists its choice, so a reduced field cannot
    // change the article editor's remembered mode.
    if (typeof window !== "undefined" && modes.length === 3)
      window.localStorage.setItem(STORAGE_KEY, next);
  };

  const paneHeight = "min-h-[28rem] max-h-[70vh]";

  return (
    <div>
      <MarkdownToolbar textareaRef={ref} value={value} onChange={onChange} />
      <div className="flex items-center justify-end gap-1 border-x border-border bg-secondary/50 px-2 pb-1.5">
        <button
          type="button"
          onClick={() => {
            syncSelection();
            setAiOpen((o) => !o);
          }}
          title={t("ai.toggle")}
          aria-label={t("ai.toggle")}
          aria-pressed={aiOpen}
          className={
            "mr-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition " +
            (aiOpen
              ? "bg-card text-foreground shadow-[var(--shadow-soft)]"
              : "text-muted-foreground hover:bg-card/60")
          }
        >
          <Sparkles className="h-3.5 w-3.5" />
          {t("ai.toggle")}
        </button>
        {available.map(({ key, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => pick(key)}
            title={t(`toolbar.${key}`)}
            aria-label={t(`toolbar.${key}`)}
            aria-pressed={mode === key}
            className={
              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition " +
              (mode === key
                ? "bg-card text-foreground shadow-[var(--shadow-soft)]"
                : "text-muted-foreground hover:bg-card/60")
            }
          >
            <Icon className="h-3.5 w-3.5" />
            {t(`toolbar.${key}`)}
          </button>
        ))}
      </div>
      {aiOpen ? (
        <AiAssistPanel value={value} selection={selection} language={language} onApply={applyAi} />
      ) : null}
      <div
        className={
          "grid rounded-b-2xl border border-border bg-card " +
          (mode === "split" ? "md:grid-cols-2" : "grid-cols-1")
        }
      >
        {mode !== "preview" ? (
          <textarea
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onSelect={syncSelection}
            onKeyUp={syncSelection}
            onMouseUp={syncSelection}
            placeholder={placeholder}
            rows={rows}
            className={
              "w-full resize-y bg-transparent p-5 font-mono text-[14px] leading-relaxed text-foreground outline-none focus:ring-2 focus:ring-inset focus:ring-ring/20 " +
              (mode === "split" ? `${paneHeight} overflow-auto md:border-r md:border-border` : "")
            }
          />
        ) : null}
        {mode !== "write" ? (
          <MarkdownPreview
            content={value}
            className={
              "p-5 " +
              (mode === "split" ? `${paneHeight} overflow-auto` : "mx-auto w-full max-w-2xl")
            }
          />
        ) : null}
      </div>
    </div>
  );
}
