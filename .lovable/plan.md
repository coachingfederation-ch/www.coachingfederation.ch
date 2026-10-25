# Board digest: activity graphs

## Summary
Add an "Activity at a glance" section to the board digest, with simple bar graphs. The app can't read Lovable's own visitor analytics, so the graphs use data the platform already holds. This means no new tracking and no change to the privacy policy.

## What the board sees
- Bars for each day of the reporting period: new members, event registrations, assistant conversations and survey responses.
- A total for each metric, compared with the previous period.
- The bars are built from text and colour, so they show in every email app, including Outlook, with no images.

## Changes
- **Data:** a new aggregation that reuses the existing Overview and assistant-insights queries and groups the results by day. The email and the dashboards always show the same numbers.
- **Email:** a new "Activity at a glance" section in the board digest. It uses the brand colour tokens that the email shell already uses.
- **Integration settings:** a switch for this section next to the other section switches. It's on by default.
- **Translations:** labels in EN, DE, FR and IT.
- **Docs:** update docs/board-digest.md.

## Backend / Schema Changes
- One config column for the new section switch (boolean, default true). No new tables and no changes to RLS.

## Testing and Verification
- Unit tests for daily grouping, including empty days and how period edges fall in Zurich time.
- Check the email preview on desktop and phone, then send a test email to the configured mailbox.

## Risks and Rollback
- Low risk, because the change only adds a section. To roll back, turn the section off. The new column can stay in place if the code is reverted.

## Follow-ups / Known Debt
- Website visit numbers are not included. That would need the app to count its own visits, plus an update to the privacy policy.
