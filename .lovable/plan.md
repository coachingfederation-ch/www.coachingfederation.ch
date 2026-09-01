# Community view: honeycomb instead of ring

Replace the blue circle with a ring of round avatars by a single connected honeycomb of hexagons — the same shape language the team page already uses, so communities and the team read as one system.

## The new cluster

- Every volunteer is a hexagon tile with their photo (initials on a bone/primary tint when there is no photo), tiles touching edge to edge in offset rows.
- One tile in the cluster is the community itself: Deep Blue fill, the community name in it, no photo. It sits in the visual centre of the comb, so the cluster reads as "this community and its people" without a separate circle.
- Rows grow outward: 1 person → name hex plus one tile; a full community → a compact comb that stays roughly square instead of a long strip.
- Hover/focus reveals the name and role over the tile (same treatment as the team page) and activating it opens the existing member modal. Every tile stays a real focusable button with an aria-label.
- Small screens: the comb shrinks with the viewport rather than switching to a list, and the tap targets stay at least 44px; below that width the current avatar list stays as the fallback.
- Empty community: just the Deep Blue name hexagon plus the existing "no members yet" note.

## Where it appears

1. Community detail page (`/communities/<slug>`).
2. The featured community preview on the About page.
3. The `/communities` overview cards: the round overlapping avatar stack becomes a small row of hexagon avatars, so the cards echo the same language at card scale.

## Technical notes

- New shared tile: extract the hexagon clip-path and photo/initials/hover-label tile from `src/components/team/TeamGrid.tsx` into a small shared component so the team page, the community comb, and the card stack use one implementation instead of three.
- `src/components/communities/CommunityRing.tsx` becomes a honeycomb: drop the circle hub, `ringPosition`, and the percentage-positioned absolute layout; build offset rows the way `combRows` does on the team page, with the name tile injected at the centre index.
- `src/lib/communities.ts`: `ringPosition` is removed; `splitRing` keeps the 12-tile cap and overflow note (renamed to fit the comb).
- `src/components/communities/CommunityCard.tsx`: `AvatarStack` switches from `rounded-full` to the hexagon tile.
- No data, schema, server-function, or i18n changes. All colour, radius and spacing come from existing tokens (`bg-primary`, `text-primary-foreground`, `bg-primary/10`, `border-border`).

## PR note

**Summary** — Replaces the circular community hub-and-ring with a connected hexagon honeycomb, so the community view shares the team page's shape language.

**Changes**
- UI: shared hexagon tile extracted from `TeamGrid`; `CommunityRing` rebuilt as an offset-row honeycomb with a Deep Blue name tile; community card avatar stack hexagonal.
- Cleanup: `ringPosition` and the circular hub markup deleted.

**Backend / Schema Changes** — None.

**Testing & Verification** — Check `/communities/community-basel` (2 members), a 0-member community, and a large community for comb shape at 1280px, 768px and 375px; keyboard-tab through tiles to confirm focus ring, label reveal and member modal; check the About page preview and the `/communities` cards.

**Risks & Rollback** — Presentation only; revert the four touched files. The shared-tile extraction also touches the team page, so verify the team honeycomb is unchanged.

**Follow-ups** — None planned.
