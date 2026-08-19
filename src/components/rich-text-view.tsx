/**
 * Renders the shared Markdown subset (bold, italic, bullet and numbered lists,
 * three heading levels) written with the standard rich-text editor.
 * Exports: RichTextView. Used by coach profiles.
 */
import { parseRichText, type RichInline } from "@/lib/rich-text";

/** Renders bold/italic runs of one line. */
export function RichRuns({ inline }: { inline: RichInline[] }) {
  return (
    <>
      {inline.map((run, index) => {
        if (run.bold)
          return (
            <strong key={index} className="font-semibold text-foreground">
              {run.text}
            </strong>
          );
        if (run.italic) return <em key={index}>{run.text}</em>;
        return <span key={index}>{run.text}</span>;
      })}
    </>
  );
}

const HEADING_CLASS: Record<1 | 2 | 3, string> = {
  1: "font-display text-xl font-semibold text-foreground",
  2: "font-display text-lg font-semibold text-foreground",
  3: "font-display text-base font-semibold text-foreground",
};

export function RichTextView({ text, className }: { text: string; className?: string }) {
  const blocks = parseRichText(text);
  return (
    <div className={"flex flex-col gap-3 leading-relaxed " + (className ?? "")}>
      {blocks.map((block, index) => {
        if (block.type === "h") {
          // Headings inside body copy start at h3 so the page title stays unique.
          const Tag = (block.level === 1 ? "h3" : block.level === 2 ? "h4" : "h5") as "h3";
          return (
            <Tag key={index} className={"mt-2 " + HEADING_CLASS[block.level]}>
              <RichRuns inline={block.inline} />
            </Tag>
          );
        }
        if (block.type === "p")
          return (
            <p key={index} className="whitespace-pre-line">
              <RichRuns inline={block.inline} />
            </p>
          );
        const ListTag = block.type === "ol" ? "ol" : "ul";
        return (
          <ListTag
            key={index}
            className={(block.type === "ol" ? "list-decimal" : "list-disc") + " space-y-1.5 pl-5"}
          >
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex}>
                <RichRuns inline={item} />
              </li>
            ))}
          </ListTag>
        );
      })}
    </div>
  );
}
