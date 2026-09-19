/**
 * Small presentational primitives shared by the Member Area profile editor
 * sections: vocabulary Chips, the card-like Section wrapper, and the plain
 * Field/TextArea inputs. Consumed by MemberProfileEditor and its sections.
 */
import { vocabLabel, type VocabRow } from "@/lib/vocabularies";
import { RichTextEditor } from "@/components/cms/RichTextField";

export function Chips({
  rows,
  selected,
  onToggle,
  locale,
}: {
  rows: VocabRow[];
  selected: string[];
  onToggle: (id: string) => void;
  locale: Parameters<typeof vocabLabel>[1];
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {rows.map((row) => {
        const on = selected.includes(row.id);
        return (
          <button
            key={row.id}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(row.id)}
            className={
              on
                ? "rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
                : "rounded-full border border-border px-3 py-1 text-xs font-semibold hover:bg-secondary"
            }
          >
            {vocabLabel(row, locale)}
          </button>
        );
      })}
    </div>
  );
}

/**
 * A single labelled block. Standalone it is a card; inside a ProfileGroup the
 * group owns the card, so the block renders flush with a plain sub-heading.
 */
export function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  const grouped = React.useContext(InProfileGroup);
  return (
    <section
      className={
        grouped
          ? "mt-6 border-t border-border/60 pt-6 first:mt-0 first:border-t-0 first:pt-0"
          : "mt-5 rounded-2xl border border-border bg-card p-5"
      }
    >
      <h3 className="text-sm font-semibold">{title}</h3>
      {note ? <p className="mt-1 text-xs text-muted-foreground">{note}</p> : null}
      {children}
    </section>
  );
}

/** Labelled single-line field used by the practice/contact sections. */
export function Field({
  id,
  label,
  value,
  onChange,
  max,
  placeholder,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  max: number;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="mt-4">
      <label className="block text-xs font-semibold text-muted-foreground" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        maxLength={max}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
      />
    </div>
  );
}

export function TextArea({
  id,
  label,
  note,
  value,
  onChange,
  max,
  rows = 5,
}: {
  id: string;
  label: string;
  note?: string;
  value: string;
  onChange: (value: string) => void;
  max: number;
  rows?: number;
}) {
  return (
    <div className="mt-4">
      <label className="block text-xs font-semibold text-muted-foreground" htmlFor={id}>
        {label}
      </label>
      {note ? <p className="mt-1 text-xs text-muted-foreground">{note}</p> : null}
      <textarea
        id={id}
        value={value}
        rows={rows}
        maxLength={max}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
      />
    </div>
  );
}

/**
 * Long-form field with the standard formatting toolbar. Same label/note/limit
 * contract as TextArea so sections can swap between them.
 */
export function RichTextArea({
  id,
  label,
  note,
  value,
  onChange,
  max,
  minHeight = "12rem",
}: {
  id: string;
  label: string;
  note?: string;
  value: string;
  onChange: (value: string) => void;
  max: number;
  minHeight?: string;
}) {
  return (
    <div className="mt-4">
      <label className="block text-xs font-semibold text-muted-foreground" htmlFor={id}>
        {label}
      </label>
      {note ? <p className="mt-1 text-xs text-muted-foreground">{note}</p> : null}
      <RichTextEditor
        id={id}
        value={value}
        minHeight={minHeight}
        onChange={(next) => onChange(next.slice(0, max))}
      />
      <p className="mt-1 text-right text-[11px] text-muted-foreground">
        {value.length} / {max}
      </p>
    </div>
  );
}
