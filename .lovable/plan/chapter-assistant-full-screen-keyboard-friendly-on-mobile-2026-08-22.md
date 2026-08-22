# Chapter assistant: full-screen, keyboard-friendly on mobile

On phones the assistant opens as a panel fixed to 80% of the screen height, and the question field is a three-line-tall box with the send button on a separate row below it. When the on-screen keyboard appears, the visible conversation shrinks to a sliver and the composer wastes most of the remaining space.

## What changes

- On mobile the assistant opens **full screen**: it covers the whole viewport, no rounded corners, no gap at the top. On tablet and desktop nothing changes — it stays the same floating 26rem panel in the bottom-right corner.
- The panel follows the **visible** part of the screen, so when the keyboard opens the header stays at the top, the composer sits directly above the keyboard, and the conversation keeps all the space in between instead of being pushed off-screen.
- The question field starts as a **single line** and grows as the visitor types, up to about four lines, then scrolls.
- The **send button moves onto the same row** as the input, right-aligned inside the field, so the composer is one compact bar. Touch target stays at least 44px.
- Enter sends, Shift+Enter adds a line break (unchanged).
- The disclaimer line and the "Talk to a volunteer" button stay, but on mobile they sit in the same compact footer row area so they don't eat conversation height.
- Body scroll is locked while the full-screen assistant is open, so the page behind doesn't scroll under it.
- The same treatment applies to the live volunteer chat panel, since it renders inside the same shell.

## Technical notes

Single file for layout: `src/components/assistant/AssistantWidget.tsx`.

- Replace the dialog shell classes `fixed inset-x-0 bottom-0 h-[min(80vh,40rem)]` with a mobile-first full-viewport box (`fixed inset-0`) plus the existing `sm:` overrides restored for the desktop panel (`sm:inset-auto sm:bottom-5 sm:right-5 sm:w-[26rem] sm:h-[min(80vh,40rem)] sm:rounded-2xl`).
- Height uses `100dvh` on mobile with a `visualViewport`-driven fallback: a small effect reads `window.visualViewport.height`/`offsetTop` and sets the panel's height and bottom offset via inline CSS custom properties, so iOS Safari (which does not shrink `dvh` for the keyboard) keeps the composer above the keyboard. Effect only runs while open and on viewports below the `sm` breakpoint; cleaned up on close.
- Composer: pass `className="min-h-11 max-h-40 pr-12"` to `PromptInputTextarea` to override the AI Elements default `min-h-16` (`field-sizing-content` already handles auto-grow), and move `PromptInputSubmit` out of `PromptInputFooter` into an absolutely positioned slot inside the prompt box, or keep `PromptInputFooter` only where the volunteer handover/disclaimer live. Submit stays `size="icon"`-sized with a 44px hit area.
- Add `overflow-hidden` on `document.body` while open on mobile (restore previous value on close).
- No changes to chat logic, transport, tools, i18n strings, or the API route.

## PR note

**Summary** — Makes the chapter assistant a true full-screen sheet on mobile and turns the composer into a single-line auto-growing input with an inline send button, so the conversation stays readable when the keyboard is open.

**Changes**
- UI: `src/components/assistant/AssistantWidget.tsx` — full-viewport mobile shell, `visualViewport` keyboard handling, body scroll lock, compact composer with inline submit.

**Backend / schema changes** — None.

**Testing & verification** — iOS Safari and Android Chrome at 393x852 with the keyboard open and closed; desktop panel unchanged; live-chat panel inside the same shell; keyboard focus, Escape to close, reduced motion; long multi-line input growth and scroll cap.

**Risks & rollback** — Presentation only, one file; revert the file to restore the previous panel.

**Follow-ups / known debt** — No swipe-to-dismiss gesture; no persisted open/closed state across navigation.
