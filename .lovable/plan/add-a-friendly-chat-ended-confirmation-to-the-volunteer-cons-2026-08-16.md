Add a friendly "chat ended" confirmation to the volunteer console

When a volunteer or a visitor ends a live chat, the volunteer console currently drops the volunteer straight back into the requests list. This feels abrupt. Show a short, human confirmation such as "Chat was ended. Thank you for your questions." before returning to the waiting list.

Scope and approach
- Only change `src/routes/_member/volunteer-chat.tsx` and the existing `live-chat.json` locale files.
- Add a small piece of local state in the volunteer console to remember the most recently ended conversation's visitor name.
- Set this state when the volunteer clicks "End chat" and when the currently open chat's status changes to `closed` from the polling subscription.
- Render the confirmation as a compact, non-intrusive banner at the top of the volunteer view (when the state is set) with a button to dismiss it and return to the normal waiting list.
- Add a new key `volunteer.ended` to `src/i18n/locales/{en,de,fr,it}/live-chat.json` so the message is localized. English default: "Chat was ended. Thank you for your questions."
- Keep existing mobile/PWA behaviour intact.

Technical notes
- `endChat` currently sets `activeId(null)` and clears messages; extend it to also set a `lastEnded` state with `visitorName`.
- The polling subscription already refreshes `mine` / `queue`; detect when the active conversation becomes `closed` and set the same state.
- The banner should clear itself on dismissal and when a new chat is accepted, so the volunteer never sees a stale message.
- No database or server changes are needed.
