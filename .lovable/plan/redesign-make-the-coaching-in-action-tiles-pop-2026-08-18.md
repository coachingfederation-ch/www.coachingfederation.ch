# Redesign: make the "Coaching in action" tiles pop

The selected section on the homepage (`#main > section:nth-of-type(3)`) is the "Coaching in action" insights grid. It currently sits on the Bone (`bg-background`) surface with white (`bg-card`) cards that have a light border and a colored mark tile at the top. The goal is to increase the contrast between the cards and the surrounding section so the tiles read as a clear, tactile content block.

## What stays the same

- Keep the existing i18n keys and route logic.
- Keep the official ICF palette: Deep Blue `#212251`, Blue `#2B379B`, Light Blue `#5778FA`, Yellow `#EFCB30`, Bone `#F8F0E4`, White `#FFFFFF`.
- Keep the existing Quicksand + Plus Jakarta Sans typography.
- Keep the four audience card arrangement and the brush-stroke marks.
- Keep accessibility (WCAG 2.2 AA) for text, chips, borders, buttons, and focus states.

## Three contrast directions to explore

I will generate three rendered directions using the redesign skill, then ask you to pick one.

1. **Direction A — Deep Blue band, white cards**
   - Turn the section background into Deep Blue (`bg-hero`) and keep the cards white (`bg-card`).
   - Use Yellow or Light Blue as the accent on the mark tiles and the "Explore all insights" CTA.
   - This is the highest contrast but places Deep Blue outside the hero/CTA, so it will be used only if you explicitly want to bend that rhythm rule.

2. **Direction B — Bone band, stronger card lift**
   - Keep the section background Bone (`bg-background`) but make the cards pop through a stronger border, a subtle shadow, and a hover lift.
   - Add a faint brand mark texture behind the grid to break the flat surface.
   - This respects the current surface rhythm while adding more tactile separation.

3. **Direction C — Blue section, white cards**
   - Use the Blue (`bg-primary`) as the section band color and white cards on top.
   - Deep Blue foreground text on the band, Yellow or Light Blue mark tiles.
   - This keeps the tiles in a brand color family and adds more color without relying on Deep Blue for the entire background.

## Implementation approach

After you choose a direction:
- Update the section wrapper class in `src/pages/Home.tsx` (the `CoachingInAction` component around line 184).
- Adjust the card classes (`bg-card`, `border-border`, hover states) to match the chosen direction.
- Update any tile background or CTA classes if needed.
- Verify contrast and keyboard focus on the new combination.
- Check the same section at 390 px, 768 px, and 1440 px widths.

## Risks & rollback

Only the styling of this section is affected. The underlying data, i18n, and routing remain unchanged. A rollback is a single revert of the class changes in `src/pages/Home.tsx`.
