# Recap draft from an event transcript

Staff upload a meeting transcript or notes file (for example Google Meet "Notes by Gemini") in the After event recap, and get a suggested Headline and Story they can review before it lands in the editor.

## What staff see

In the recap editor, above Headline, a new "Draft from transcript" row:

- **Upload transcript** button (accepts `.md`, `.txt`, `.docx`) or **Paste text** option.
- Language picker defaults to the editor's current language.
- After a few seconds a preview card shows the suggested Headline and Story with **Use this**, **Regenerate** and **Discard**. Nothing is saved until staff press Use this and then Save recap, same as the AI writing assistant.
- If a headline or story already exists, Use this asks before replacing.

## What the draft contains

- Headline: short, sentence case, no trailing period.
- Story: 3 to 6 short Markdown paragraphs on what the event covered and the key takeaways, in the chapter voice.
- Leaves out: attendee lists, email addresses, calendar or document links, action items and "next steps" assigned to individuals, and any internal remarks. Names only of hosts or speakers already on the event.
- Never invents numbers, quotes or claims not in the transcript.

## Privacy

The transcript is processed once and never stored. Before sending, the browser strips embedded images, links and email addresses, and the text is capped at a safe length. Only staff with event-editing rights can use it, limited to 20 drafts per hour.

## Technical details

- New `src/lib/recap-transcript.functions.ts`: `draftRecapFromTranscript` server function, `requireSupabaseAuth` + existing event-manager guard, `checkRateLimit`, zod input (eventId, text max ~120k chars, language). Calls Lovable AI Gateway with `openai/gpt-6-astra` via Responses API (streamed, consumed server-side) with a strict JSON schema `{ headline, story }`; passes event title, date and host names as context. 402/429/403 mapped to clear messages.
- Client-side preprocessing helper `src/lib/transcript-clean.ts` (pure, unit-tested): remove `data:image` blobs, markdown images/links, emails; `.docx` text extraction via the existing parser if present, otherwise `.md`/`.txt` only.
- `EventRecapEditor.tsx`: new `TranscriptDraftPanel` component composing design-system Button, Card, Dialog; applies to existing `headline` / `body` state.
- i18n keys for EN/DE/FR/IT; docs in `docs/events-team-communities.md` and code map.
- Tests: cleaner strips images/links/emails and enforces the cap.

## PR note

- **Summary**: Adds an AI "Draft from transcript" action to the event recap editor that turns an uploaded transcript into a reviewable Headline and Story.
- **Changes**: UI panel in recap editor; server function for the AI draft; transcript cleaner; translations; docs.
- **Backend / Schema Changes**: None (no new tables; transcript not stored).
- **Testing & Verification**: unit tests for the cleaner; signed-in staff run with the uploaded sample (2 MB with images) in EN and DE; check replace confirmation and rate-limit message.
- **Risks & Rollback**: additive; revert code to remove.
- **Follow-ups / Known Debt**: importing directly from a Google Docs link is not included; `.docx` support depends on available parsing.
