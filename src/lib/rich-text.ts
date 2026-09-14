/**
 * Tiny Markdown subset (bold, italic, bullet lists, numbered lists, three
 * heading levels and paragraphs) shared by the standard rich-text editor and
 * the public renderers.
 * Exports: parseRichText, richTextToHtml, htmlToRichText, plus the block types.
 */

export type RichInline = { text: string; bold?: boolean; italic?: boolean };
export type RichBlock =
  | { type: "p"; inline: RichInline[] }
  | { type: "h"; level: 1 | 2 | 3; inline: RichInline[] }
  | { type: "ul"; items: RichInline[][] }
  | { type: "ol"; items: RichInline[][] };

const TOKEN = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*\n]+\*|_[^_\n]+_)/g;

/** Splits one line of Markdown into bold/italic-tagged text runs. */
function parseInline(line: string): RichInline[] {
  const out: RichInline[] = [];
  let last = 0;
  for (const match of line.matchAll(TOKEN)) {
    const index = match.index ?? 0;
    if (index > last) out.push({ text: line.slice(last, index) });
    const raw = match[0];
    if (raw.startsWith("**") || raw.startsWith("__")) {
      out.push({ text: raw.slice(2, -2), bold: true });
    } else {
      out.push({ text: raw.slice(1, -1), italic: true });
    }
    last = index + raw.length;
  }
  if (last < line.length) out.push({ text: line.slice(last) });
  return out.length ? out : [{ text: "" }];
}

/** Parses the supported Markdown subset into paragraph and list blocks. */
export function parseRichText(markdown: string): RichBlock[] {
  const blocks: RichBlock[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  let listType: "ul" | "ol" = "ul";

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push({ type: "p", inline: parseInline(paragraph.join("\n")) });
    paragraph = [];
  };
  const flushList = () => {
    if (!list.length) return;
    blocks.push({ type: listType, items: list.map(parseInline) });
    list = [];
  };

  for (const rawLine of markdown.replace(/\r\n/g, "\n").split("\n")) {
    const line = rawLine.trimEnd();
    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    const heading = /^(#{2,4})\s+(.*)$/.exec(line);
    if (bullet) {
      flushParagraph();
      if (listType !== "ul") flushList();
      listType = "ul";
      list.push(bullet[1] ?? "");
      continue;
    }
    if (numbered) {
      flushParagraph();
      if (listType !== "ol") flushList();
      listType = "ol";
      list.push(numbered[1] ?? "");
      continue;
    }
    flushList();
    if (heading) {
      flushParagraph();
      const level = ((heading[1] ?? "##").length - 1) as 1 | 2 | 3;
      blocks.push({ type: "h", level, inline: parseInline(heading[2] ?? "") });
      continue;
    }
    if (!line.trim()) flushParagraph();
    else paragraph.push(line);
  }
  flushParagraph();
  flushList();
  return blocks;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineToHtml(inline: RichInline[]) {
  return (
    inline
      .map((run) => {
        let html = escapeHtml(run.text).replace(/\n/g, "<br>");
        if (run.italic) html = `<em>${html}</em>`;
        if (run.bold) html = `<strong>${html}</strong>`;
        return html;
      })
      .join("") || "<br>"
  );
}

/** Renders the Markdown subset as sanitised HTML for the contenteditable field. */
export function richTextToHtml(markdown: string) {
  const blocks = parseRichText(markdown);
  if (!blocks.length) return "<p><br></p>";
  return blocks
    .map((block) => {
      if (block.type === "p") return `<p>${inlineToHtml(block.inline)}</p>`;
      if (block.type === "h") {
        const tag = `h${block.level + 1}`;
        return `<${tag}>${inlineToHtml(block.inline)}</${tag}>`;
      }
      const items = block.items.map((item) => `<li>${inlineToHtml(item)}</li>`).join("");
      return `<${block.type}>${items}</${block.type}>`;
    })
    .join("");
}

/** True when an element carries bold styling, whether as a tag or inline CSS. */
function isBoldElement(el: HTMLElement) {
  if (el.tagName === "STRONG" || el.tagName === "B") return true;
  const weight = el.style.fontWeight;
  if (!weight) return false;
  if (weight === "bold" || weight === "bolder") return true;
  return Number(weight) >= 600;
}

function isItalicElement(el: HTMLElement) {
  if (el.tagName === "EM" || el.tagName === "I") return true;
  const style = el.style.fontStyle;
  return style === "italic" || style === "oblique";
}

function serializeNode(node: Node, bold: boolean, italic: boolean): string {
  if (node.nodeType === 3) {
    const text = node.textContent ?? "";
    if (!text) return "";
    const escaped = text;
    if (!escaped.trim()) return escaped;
    const [, lead = "", core = "", tail = ""] = /^(\s*)([\s\S]*?)(\s*)$/.exec(escaped) ?? [];
    let out = core;
    if (italic) out = `_${out}_`;
    if (bold) out = `**${out}**`;
    return lead + out + tail;
  }
  if (node.nodeType !== 1) return "";
  const el = node as HTMLElement;
  const tag = el.tagName;
  if (tag === "BR") return "\n";
  const nextBold = bold || isBoldElement(el);
  const nextItalic = italic || isItalicElement(el);
  return Array.from(el.childNodes)
    .map((child) => serializeNode(child, nextBold, nextItalic))
    .join("");
}

/** Block-level tags the serializer treats as their own line(s). */
const BLOCK_TAGS = /^(P|DIV|UL|OL|H[1-6]|BLOCKQUOTE|SECTION|ARTICLE|MAIN|FIGURE)$/;

function hasBlockChild(el: HTMLElement) {
  return Array.from(el.children).some((child) => BLOCK_TAGS.test(child.tagName));
}

/** Converts the contenteditable DOM back into the Markdown subset. */
export function htmlToRichText(root: HTMLElement): string {
  const lines: string[] = [];

  const walkBlocks = (parent: HTMLElement) => {
    for (const child of Array.from(parent.childNodes)) {
      if (child.nodeType === 1) {
        const el = child as HTMLElement;
        if (el.tagName === "UL" || el.tagName === "OL") {
          const ordered = el.tagName === "OL";
          let index = 1;
          for (const li of Array.from(el.querySelectorAll(":scope > li"))) {
            const text = serializeNode(li, false, false).replace(/\n+/g, " ").trim();
            lines.push(ordered ? `${index++}. ${text}` : `- ${text}`);
          }
          lines.push("");
          continue;
        }
        if (/^H[1-6]$/.test(el.tagName)) {
          // Editor headings are h2–h4; anything outside that range is clamped in.
          const level = Math.min(4, Math.max(2, Number(el.tagName.slice(1))));
          const hashes = "#".repeat(level);
          const text = serializeNode(el, false, false).replace(/\n+/g, " ").trim();
          if (text) lines.push(`${hashes} ${text}`, "");
          continue;
        }
        if (BLOCK_TAGS.test(el.tagName)) {
          // Browsers nest blocks freely (a list inside a paragraph, a div inside
          // a div). Recurse so nested lists and headings keep their structure
          // instead of collapsing into one run-on paragraph.
          if (hasBlockChild(el)) {
            walkBlocks(el);
            continue;
          }
          const text = serializeNode(el, false, false).replace(/\n+$/, "");
          lines.push(...text.split("\n"), "");
          continue;
        }
      }
      const inlineText = serializeNode(child, false, false);
      if (inlineText.trim()) lines.push(inlineText, "");
    }
  };

  walkBlocks(root);
  return lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
