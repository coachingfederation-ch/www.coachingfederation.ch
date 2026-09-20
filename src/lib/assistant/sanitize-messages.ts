/**
 * Chat history arriving from a browser is caller-controlled data, never
 * instruction. The model's own instructions are the server-side system prompt,
 * so a posted message may only ever be a `user` or `assistant` turn: a client
 * that sends `role: "system"` (or any other role) must not be able to append to
 * the instruction channel.
 *
 * We also keep only plain text parts of prior turns. Tool calls and their
 * results are produced server-side during a run; replaying caller-supplied
 * "tool output" would let a caller fabricate facts the model treats as
 * verified.
 */
import type { UIMessage } from "ai";

type UnknownMessage = { role?: unknown; parts?: unknown; id?: unknown };

const MAX_TEXT = 8_000;

export function sanitizeUiMessages(input: unknown[]): UIMessage[] {
  const out: UIMessage[] = [];
  for (const entry of input) {
    if (!entry || typeof entry !== "object") continue;
    const msg = entry as UnknownMessage;
    if (msg.role !== "user" && msg.role !== "assistant") continue;
    if (!Array.isArray(msg.parts)) continue;

    const parts = msg.parts
      .filter(
        (p): p is { type: "text"; text: string } =>
          !!p &&
          typeof p === "object" &&
          (p as { type?: unknown }).type === "text" &&
          typeof (p as { text?: unknown }).text === "string",
      )
      .map((p) => ({ type: "text" as const, text: p.text.slice(0, MAX_TEXT) }))
      .filter((p) => p.text.length > 0);

    if (parts.length === 0) continue;

    out.push({
      id: typeof msg.id === "string" ? msg.id.slice(0, 128) : crypto.randomUUID(),
      role: msg.role,
      parts,
    } as UIMessage);
  }
  return out;
}
