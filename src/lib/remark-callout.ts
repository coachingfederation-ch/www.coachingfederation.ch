/**
 * Custom remark plugin to transform blockquote-based callouts into HTML data attributes.
 * Exports: remarkCallout. Used by components/markdown.tsx.
 */
import { visit } from "unist-util-visit";
import type { Root, Blockquote, Paragraph, Text } from "mdast";
import { CALLOUT_ALIASES } from "@/design-system/icf-welcome-design-system-a835df";

/** `[!info] 💡` — shade marker plus an optional leading emoji. */
const MARKER = /^\[!([a-z]+)\][ \t]*/i;
const LEADING_EMOJI =
  /^(\p{Extended_Pictographic}(\uFE0F|\p{Emoji_Modifier})?(\u200D\p{Extended_Pictographic}(\uFE0F)?)*)[ \t]*/u;

/**
 * Detects `> [!shade] emoji` callout blockquotes on the mdast, removes the
 * marker text from the tree and exposes shade/emoji as HTML data attributes.
 * Working on the AST guarantees the raw marker can never leak into output.
 */
export function remarkCallout() {
  return (tree: Root) => {
    visit(tree, "blockquote", (node: Blockquote) => {
      const first = node.children[0];
      if (!first || first.type !== "paragraph") return;
      const para = first as Paragraph;
      const head = para.children[0];
      if (!head || head.type !== "text") return;
      const textNode = head as Text;

      const match = MARKER.exec(textNode.value);
      if (!match) return;
      const shade = CALLOUT_ALIASES[match[1].toLowerCase()];
      if (!shade) return;

      let rest = textNode.value.slice(match[0].length);
      const emojiMatch = LEADING_EMOJI.exec(rest);
      const emoji = emojiMatch ? emojiMatch[1] : null;
      if (emojiMatch) rest = rest.slice(emojiMatch[0].length);
      // The marker sits on its own line; drop that now-empty first line.
      rest = rest.replace(/^[ \t]*\n/, "").replace(/^[ \t]+/, "");

      textNode.value = rest;
      if (rest === "" && para.children.length === 1) {
        node.children.shift();
      }

      node.data = {
        ...node.data,
        hProperties: {
          ...(node.data?.hProperties ?? {}),
          "data-callout": shade,
          ...(emoji ? { "data-callout-emoji": emoji } : {}),
        },
      };
    });
  };
}
