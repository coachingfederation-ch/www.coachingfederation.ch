# Live chat volunteers: activation from the CMS, member opt-in, cleaner console

Volunteering for live chat becomes an explicit list of activated members instead of a shift schedule. Activated members see a tile in their Member Area with a QR code and a link to the console, and can opt out themselves. The console gets a short start flow and a tighter header.

## CMS — /manage/live-chat

- The "Add a shift" block and the shift table are replaced by **Activated volunteers**.
- Add a volunteer through a searchable picker listing only members with a claimed account and an active credential.
- Table columns: volunteer name, last active conversation as relative wording (Recent, Today, Yesterday, 2 days ago, Never), and a Remove action with confirmation.
- The online-now list and the QR panel stay as they are.

## Member Area — /member

- Activated volunteers get a new tile: short explanation, a QR code to scan with a phone, an "Open the chat console" link that opens `/volunteer-chat` in a new window, and "Stop volunteering" which removes the activation (with confirmation).
- Members who are not activated see no tile.

## Volunteer console — /volunteer-chat

- **Start flow:** first screen asks for the name visitors will see, then a single "Go online" button. Nothing else is shown until online.
- **Header (while online):** Go offline (returns to the start flow), and "Online now · 4" which expands to the list of names.
- **Main screen order:** Waiting visitors first, then Your last chats.
- The public "Chat with us" assistant launcher is hidden on this page.

## Technical notes

- New table `live_chat_volunteers` (`user_id`, `member_id`, `display_name`, `activated_by`, `activated_at`) with RLS: admins manage all rows; a volunteer can read and delete their own row. Grants for `authenticated` and `service_role`.
- `live_chat_shifts` is no longer used by the UI; the table and its page section are removed (route file keeps the QR + presence panels).
- Eligibility uses the existing claimed-account plus credential logic already behind `member_is_directory_eligible` / `members.activity_state`, exposed through a new admin-only server function next to `roles-admin.server.ts` patterns.
- Access control: `/volunteer-chat` additionally checks for an activation row; a member without one sees a short "not activated" notice instead of the console. Presence upsert and conversation accept stay unchanged, but RLS on `live_chat_presence` is tightened to activated volunteers.
- "Last active conversation" comes from `max(last_message_at)` on `live_chat_conversations` per `volunteer_user_id`, formatted with `Intl.RelativeTimeFormat`.
- Assistant launcher hidden by pathname check in `src/routes/__root.tsx` (no change to the widget itself).
- New CMS keys under `liveChat.*` and member keys under `member.home.volunteer.*` in EN/DE/FR/IT.

## PR note

**Summary** — Replaces the informational live-chat shift roster with an explicit list of activated volunteers, gives activated members a self-service tile (QR, console link, opt-out) in the Member Area, and reshapes the volunteer console into a start-flow plus header controls.

**Changes**
- UI: CMS activated-volunteers table with member picker and remove action; Member Area volunteer tile; volunteer console start flow, header with offline and online-now list, reordered sections; assistant launcher hidden on the console.
- Backend: new `live_chat_volunteers` table, admin server functions to list eligible members, activate, deactivate and report last conversation; volunteer self opt-out.
- i18n: new keys in four languages.

**Backend / schema changes** — New `live_chat_volunteers` table with RLS and grants; `live_chat_shifts` dropped; tightened `live_chat_presence` policies.

**Testing & verification** — Activate and remove a volunteer as admin; tile appears and disappears in the Member Area; opt-out from the tile; QR opens the console on a phone; start flow, go offline, online-now list; waiting-visitor accept still works with two volunteers; relative last-conversation wording; non-activated member blocked; all four languages; mobile layout.

**Risks & rollback** — Dropping `live_chat_shifts` loses existing roster rows (informational only). Reverting the code leaves the new table unused and harmless.

**Follow-ups / known debt** — No shift scheduling replacement, no notifications when a visitor is waiting, no per-volunteer statistics beyond last conversation.
