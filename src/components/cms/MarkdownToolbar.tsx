/**
 * Formatting toolbar for the Markdown editor, providing shortcuts for headings, lists, links, and callouts.
 * Exports: MarkdownToolbar. Consumed by MarkdownEditor.
 */
import { useState, type RefObject } from "react";
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link2,
  Info,
} from "lucide-react";
import { useCms } from "@/i18n/cms";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/design-system/icf-welcome-design-system-a835df";
import {
  CALLOUT_SHADES,
  SHADE_SWATCH,
  type CalloutShade,
} from "@/design-system/icf-welcome-design-system-a835df";

const EMOJIS = ["💡", "⭐", "⚠️", "✅", "📌", "🎯", "❤️", "🔍"];

type Action =
  | { kind: "wrap"; before: string; after: string }
  | { kind: "prefix"; prefix: string }
  | { kind: "block"; template: (selection: string) => string };

const BUTTONS: { key: string; icon: typeof Bold; action: Action }[] = [
  { key: "h2", icon: Heading2, action: { kind: "prefix", prefix: "## " } },
  { key: "h3", icon: Heading3, action: { kind: "prefix", prefix: "### " } },
  { key: "bold", icon: Bold, action: { kind: "wrap", before: "**", after: "**" } },
  { key: "italic", icon: Italic, action: { kind: "wrap", before: "_", after: "_" } },
  { key: "bullet", icon: List, action: { kind: "prefix", prefix: "- " } },
  { key: "numbered", icon: ListOrdered, action: { kind: "prefix", prefix: "1. " } },
  { key: "quote", icon: Quote, action: { kind: "prefix", prefix: "> " } },
  {
    key: "link",
    icon: Link2,
    action: { kind: "block", template: (s) => `[${s || "link text"}](https://)` },
  },
];

/** Formatting toolbar that edits the Markdown body textarea in place. */
export function MarkdownToolbar({
  textareaRef,
  value,
  onChange,
}: {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (next: string) => void;
}) {
  const { t } = useCms();
  const [open, setOpen] = useState(false);
  const [shade, setShade] = useState<CalloutShade>("info");
  const [emoji, setEmoji] = useState("💡");

  const apply = (action: Action) => {
    const el = textareaRef.current;
    const start = el ? el.selectionStart : value.length;
    const end = el ? el.selectionEnd : value.length;
    const selected = value.slice(start, end);
    let insert = selected;
    let caretOffset = 0;

    if (action.kind === "wrap") {
      insert = `${action.before}${selected}${action.after}`;
      caretOffset = action.before.length;
    } else if (action.kind === "prefix") {
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const block = value.slice(lineStart, end);
      const prefixed = block
        .split("\n")
        .map((line) => (line.startsWith(action.prefix) ? line : action.prefix + line))
        .join("\n");
      const next = value.slice(0, lineStart) + prefixed + value.slice(end);
      onChange(next);
      requestAnimationFrame(() => {
        el?.focus();
        const pos = lineStart + prefixed.length;
        el?.setSelectionRange(pos, pos);
      });
      return;
    } else {
      insert = action.template(selected);
    }

    const next = value.slice(0, start) + insert + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el?.focus();
      const pos = selected ? start + insert.length : start + caretOffset;
      el?.setSelectionRange(pos, pos);
    });
  };

  return (
    <div className="mt-6 flex flex-wrap items-center gap-1 rounded-t-2xl border border-b-0 border-border bg-secondary/50 px-2 py-1.5">
      {BUTTONS.map(({ key, icon: Icon, action }) => (
        <button
          key={key}
          type="button"
          title={t(`toolbar.${key}`)}
          aria-label={t(`toolbar.${key}`)}
          onClick={() => apply(action)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-card hover:text-foreground"
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            title={t("toolbar.callout")}
            aria-label={t("toolbar.callout")}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-card hover:text-foreground"
          >
            <Info className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 space-y-4 rounded-2xl">
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t("callout.shade")}
            </div>
            <div className="flex gap-2">
              {CALLOUT_SHADES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setShade(s)}
                  className={
                    "flex flex-1 items-center gap-2 rounded-xl border px-2.5 py-2 text-xs font-medium transition " +
                    (shade === s
                      ? "border-primary bg-secondary"
                      : "border-border hover:bg-secondary/60")
                  }
                >
                  <span className={`h-3 w-3 rounded-full ${SHADE_SWATCH[s]}`} />
                  {t(`callout.${s}`)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t("callout.emoji")}
            </div>
            <div className="flex flex-wrap gap-1">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={
                    "inline-flex h-8 w-8 items-center justify-center rounded-lg text-base transition " +
                    (emoji === e ? "bg-secondary ring-2 ring-primary/40" : "hover:bg-secondary/60")
                  }
                >
                  {e}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setEmoji("")}
                className={
                  "inline-flex h-8 items-center rounded-lg px-2 text-xs font-medium text-muted-foreground transition " +
                  (emoji === "" ? "bg-secondary ring-2 ring-primary/40" : "hover:bg-secondary/60")
                }
              >
                {t("callout.noEmoji")}
              </button>
            </div>
            <input
              value={emoji}
              onChange={(e) => setEmoji(e.target.value.slice(0, 4))}
              placeholder={t("callout.customEmoji")}
              className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              apply({
                kind: "block",
                template: (s) =>
                  `> [!${shade}]${emoji ? ` ${emoji}` : ""}\n> ${s || t("callout.placeholder")}`,
              });
              setOpen(false);
            }}
            className="w-full rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-95"
          >
            {t("callout.insert")}
          </button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
