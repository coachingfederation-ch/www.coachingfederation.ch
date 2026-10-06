# Integration page: day-to-day operations layout

The page still follows the order of the one-time setup: mode, gates, cutover. Now that the member sync is live, it should open on "is everything healthy?" and "what needs my attention today?". Setup controls fold away at the bottom. Every existing control and card stays on the page. Only the order and grouping change.

## New page order

```text
Integration status (title + one-line subtitle)
+--------------------------------------------------------------+
| Health strip: 5 compact tiles, each with a green/amber/red dot |
|  Last sync | Relay | Member email | Account claim | Credentials |
+--------------------------------------------------------------+
| Today                                     (work queue)       |
|  - Today's claim wave: due / released at ...   [Release]     |
|  - Reminders due: 40                           [Send]        |
|  - Grace period: due for removal 0 · next 11/24/2026         |
|  - Last sync error (only when present)         [Run sync]    |
|  "Nothing needs action today" when the list is empty         |
+--------------------------------------------------------------+
| Member sync     Run sync now · Sync history (last 10 runs)   |
| Claim invitation waves   (existing card, unchanged)          |
| Grace period and retention   (existing card, unchanged)      |
| Diagnostics  [collapsed]  Relay health · Credentials check · |
|                           Outbound IP                        |
| Settings     Sync limits · Content ownership · LinkedIn page  |
| Advanced     [collapsed]  Mode details + redirect inbox,      |
|              Release gates, run sync ignoring the drop guard, |
|              clean up expired members, cutover record,        |
|              rehearsal                                       |
+--------------------------------------------------------------+
```

- **Health strip**: replaces the large status card. Each tile shows a dot, a short value and a timestamp, using the same thresholds as Relay health (sync older than 36 hours is amber, a failed sync is red). "Member email" is red when emails are suppressed in live mode. Clicking a tile scrolls to its detail section.
- **Today**: lists only items that need someone to act, each with its existing button. This reuses the claim-wave, reminder and retention figures the cards already load. No new data is added.
- **Advanced**: the risky or one-time controls (drop-guard override, cleanup, gates, cutover) sit behind a collapsible panel. All confirmation prompts stay as they are.

## Technical details

- `src/routes/_staff/integration.tsx`: split the body into `HealthStrip`, `TodayQueue`, and section groups. Move the cutover, rehearsal, gates, mode and redirect-inbox blocks into an `Advanced` group built on the design-system `Collapsible`. Diagnostics also uses `Collapsible`, closed by default.
- Health and queue data: lift the relay-health and claim-campaign fetches into small shared query hooks (React Query keys), so the strip, the queue and the cards share one request each instead of fetching twice. The existing cards read from the same hooks. A small read-only summary for the Today queue comes from the existing retention loader.
- Styling: design-system tokens only (`bg-card`, `bg-teal` / `bg-warn` / `bg-destructive` dots, `Badge`, `Button` variants). No new colours or sizes.
- i18n: new `integration.health*`, `integration.today*`, `integration.section*` and `integration.advanced*` keys in EN/DE/FR/IT.
- Docs: update the integration-screen section in `docs/icf-sync-relay.md` / `docs/architecture.md` to describe the new layout.

## PR note

- **Summary**: reorders the Integration page around daily operations, with a health strip, a "Today" work queue and collapsed setup tools. No behaviour changes.
- **Changes**: UI only, in `integration.tsx`, with shared query hooks for relay health and claim campaign, plus locale keys in four languages.
- **Backend / schema changes**: none.
- **Testing & verification**: as an admin, check that each tile's colour matches the underlying card. Release a wave and send reminders from the Today queue and confirm the card numbers update. Confirm the Advanced controls still work with their confirmations. Check all four languages and a narrow viewport.
- **Risks & rollback**: low, layout only. Revert the commit to restore the old order.
- **Follow-ups**: none planned.
