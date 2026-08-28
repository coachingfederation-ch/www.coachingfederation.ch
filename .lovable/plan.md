# "Talk to our team" opens the chapter assistant

Today the hero CTA on **For organisations** jumps to the contact form anchor. Instead, it should open the chat assistant and start the conversation with a relevant question about coaching for organisations, so a visitor gets an immediate answer instead of an empty form.

## Behaviour

- Clicking the hero CTA opens the assistant panel (same panel as the launcher, full-screen on mobile).
- A first question is sent automatically in the visitor's site language, e.g. EN: "We're an organisation interested in coaching for our leaders and teams — how can The Switzerland Chapter of ICF help?" (with DE / FR / IT equivalents).
- If a conversation already exists, the question is appended as a new message; nothing is cleared.
- The contact form stays exactly where it is; the assistant answer can point to it.
- Keyboard accessible: the CTA stays a real button, focus moves into the chat composer after opening.

## Technical notes

- **Open-with-question channel:** a small module `src/lib/assistant-open.ts` exporting `askAssistant(text: string)` which dispatches a `CustomEvent("assistant:ask", { detail: { text } })` on `window`, plus the event-name constant. No new global state library.
- **`AssistantWidget.tsx`:** a `useEffect` listener for `assistant:ask` that sets `open` to true, leaves the live-chat panel closed, and calls `sendMessage({ text })` (guarded while a turn is in flight — the question is queued until `status === "ready"`). Existing localStorage persistence and interaction logging are untouched.
- **CTA wiring:** the local `CompactHero` in `src/components/chrome/Header.tsx` gains an optional `onCtaClick` prop; when present the CTA renders as `<Button variant="pill" size="pill">` instead of an `<a>`, keeping the same label and arrow. `src/pages/ForOrganisations.tsx` passes `onCtaClick={() => askAssistant(t("assistant.prompts.organisations"))}` and drops the `#organisation-contact` href.
- **Copy:** new key `prompts.organisations` in `src/i18n/locales/{en,de,fr,it}/assistant.json`.
- No backend, schema, or RLS changes.

## PR note

**Summary** — Turns the For-organisations hero CTA into an assistant entry point that opens the chat widget with a pre-filled organisational question.

**Changes**
- UI: optional `onCtaClick` on the local `CompactHero`; ForOrganisations hero CTA rewired.
- Client logic: `src/lib/assistant-open.ts` event helper; `AssistantWidget` listens and auto-sends.
- Copy: one new key in four locale files.

**Backend / schema changes** — None.

**Testing & verification** — Click the CTA on all four languages, signed out and signed in; existing conversation is preserved; question queues correctly if a turn is streaming; mobile full-screen panel; keyboard focus lands in the composer; assistant answer renders and links resolve.

**Risks & rollback** — Small, additive; reverting the three touched files restores the anchor CTA. Each click spends AI credits, same as any assistant question.

**Follow-ups / known debt** — Only the organisations hero uses this channel for now; other CTAs could reuse `askAssistant` later.
