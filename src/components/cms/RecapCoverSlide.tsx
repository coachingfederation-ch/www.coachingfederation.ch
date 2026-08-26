/**
 * The optional branded first slide of a recap carousel.
 * Exports: RecapCoverSlide, RECAP_COVER_SIZE. Rendered off-screen at full size
 * by RecapPostEditor.tsx and rasterised with html-to-image.
 *
 * Square, because LinkedIn crops a carousel to one shared aspect and the
 * gallery photos that follow are mixed portrait and landscape. Colours are
 * written as literal hex here — the same deliberate deviation the article card
 * documents: html-to-image inlines computed styles and cannot resolve the
 * oklch() token values, so a token class would rasterise as black.
 */
import { forwardRef } from "react";
import icfLogo from "@/assets/icf-switzerland-charter-chapter.png.asset.json";

/** LinkedIn's square carousel canvas. */
export const RECAP_COVER_SIZE = 1200;

export const RecapCoverSlide = forwardRef<
  HTMLDivElement,
  { kicker: string; headline: string; meta: string }
>(function RecapCoverSlide({ kicker, headline, meta }, ref) {
  return (
    <div
      ref={ref}
      style={{ width: RECAP_COVER_SIZE, height: RECAP_COVER_SIZE }}
      className="relative flex flex-col justify-between overflow-hidden bg-[#212251] p-20 text-white"
    >
      <img src={icfLogo.url} alt="" className="h-28 w-auto object-contain object-left" />
      <div>
        <div className="mb-6 text-[20px] font-bold uppercase tracking-[0.22em] text-[#EFCB30]">
          {kicker}
        </div>
        <h2 className="font-heading text-[76px] leading-[1.05]">{headline}</h2>
      </div>
      <p className="text-[26px] text-[#F8F0E4]">{meta}</p>
    </div>
  );
});
