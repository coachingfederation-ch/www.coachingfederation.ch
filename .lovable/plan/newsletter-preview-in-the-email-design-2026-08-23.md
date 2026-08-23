# Newsletter preview in the email design

Add a "Preview" to the newsletter editor that shows the edition exactly as it would look as an app email — same bone background, Deep Blue banner with the horizontal negative lockup, same type, buttons and spacing as the existing app-email templates.

## What the user gets

- A **Preview** button in the editor header, next to "Regenerate all AI blocks".
- It opens a full-height dialog showing the rendered edition: masthead with the chapter lockup, issue month and title, then every **enabled** block in order — block title, featured image (when set), Markdown content rendered as email-safe HTML, and its source links.
- Desktop / mobile width toggle inside the dialog so editors can check both.
- Disabled blocks are excluded, matching what recipients would receive.
- Preview works on drafts at any status, staff-only, and reflects the last saved state of the blocks.

## How it is built

- New React Email template `src/lib/email-templates/newsletter-edition.tsx`, reusing the visual constants of `newsletter-refresh.tsx` (Bone `#F8F0E4` body, Deep Blue banner, brand button style, Quicksand-substitute Arial stack). It takes `{ title, issueDate, blocks[] }` and is registered in `registry.ts`, so the same component can later back the actual send.
- A small Markdown → email HTML step for block content, reusing the existing Markdown pipeline already used by the public newsletter page, sanitised and wrapped in inline-styled elements.
- New server function `previewNewsletterFn` in `src/lib/newsletters.functions.ts`: staff gate via `assertStaff`, loads the edition through the caller's client, renders the template with `@react-email/render`, returns the HTML string.
- New `NewsletterPreviewDialog` component in the editor route that fetches that HTML and displays it in a sandboxed `srcDoc` iframe (email HTML has its own inline styles, so it must not inherit app CSS).
- Design-system components only for the dialog chrome (`Dialog`, `Button`, `ToggleGroup` for the width switch); the email body itself stays inline-styled because email clients require it — that is the existing, deliberate exception for email templates.

## Backend / schema changes

None. Read-only, existing RLS on `newsletters` / `newsletter_blocks` applies.

## Testing and verification

- Open an edition with a mix of enabled/disabled, asset and content blocks; confirm order, images, source links and that disabled blocks are absent.
- Check an edition with an empty content block and with no enabled blocks (empty-state message).
- Confirm the dialog is keyboard reachable and closes with Escape; check both width modes.
- Confirm a non-staff session cannot call the preview function.

## Risks and rollback

Additive only — one new template, one new server function, one dialog. Reverting the files removes the feature with no data impact.

## Follow-ups

Sending the edition as an actual app email is out of scope here; the template is written so that step only needs a send call and per-recipient localisation.
