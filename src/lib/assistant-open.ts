/**
 * Tiny channel for opening the chapter assistant with a pre-filled question.
 *
 * The widget lives once in the root layout, so pages cannot reach it through
 * props. A window CustomEvent keeps the coupling to a single string and avoids
 * introducing a global store for one interaction.
 */
export const ASSISTANT_ASK_EVENT = "assistant:ask";

export type AssistantAskDetail = { text: string };

/** Open the assistant panel and send `text` as the visitor's first message. */
export function askAssistant(text: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<AssistantAskDetail>(ASSISTANT_ASK_EVENT, { detail: { text } }),
  );
}
