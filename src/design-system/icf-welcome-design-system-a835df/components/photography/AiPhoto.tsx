import * as React from "react";
import { cn } from "@/design-system/icf-welcome-design-system-a835df/lib/utils";

/**
 * Badge that marks an image as AI generated. Required on every AI-generated
 * photograph the brand publishes — transparency is part of the brand's
 * Humanity behaviour, so the mark is never optional and never hidden.
 */
export interface AiBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Label text. Keep it short and explicit. */
  label?: string | undefined;
}

export const AiBadge = React.forwardRef<HTMLSpanElement, AiBadgeProps>(
  ({ className, label = "AI generated", ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-primary/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-primary-foreground backdrop-blur-sm",
        className,
      )}
      {...props}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-cyan" />
      {label}
    </span>
  ),
);
AiBadge.displayName = "AiBadge";

export interface AiPhotoProps extends React.ComponentPropsWithoutRef<"img"> {
  /** Required: describe the scene for assistive technology. */
  alt: string;
  /** Optional caption rendered under the image. */
  caption?: React.ReactNode;
  /** Badge label override. */
  badgeLabel?: string;
  /** Corner the badge sits in. */
  badgePosition?: "bottom-left" | "bottom-right" | "top-left" | "top-right";
  /** Class applied to the wrapping figure. */
  figureClassName?: string;
}

const BADGE_POSITION: Record<NonNullable<AiPhotoProps["badgePosition"]>, string> = {
  "bottom-left": "bottom-3 left-3",
  "bottom-right": "bottom-3 right-3",
  "top-left": "top-3 left-3",
  "top-right": "top-3 right-3",
};

/**
 * An AI-generated photograph with its mandatory AI badge baked in. Use this
 * instead of a bare <img> whenever the image was generated rather than shot,
 * so the disclosure cannot be dropped by accident.
 */
export const AiPhoto = React.forwardRef<HTMLImageElement, AiPhotoProps>(
  (
    {
      alt,
      caption,
      badgeLabel,
      badgePosition = "bottom-left",
      figureClassName,
      className,
      loading = "lazy",
      ...props
    },
    ref,
  ) => (
    <figure className={cn("m-0", figureClassName)}>
      <div className="relative overflow-hidden rounded-2xl bg-muted">
        <img
          ref={ref}
          alt={alt}
          loading={loading}
          className={cn("block h-full w-full object-cover", className)}
          {...props}
        />
        <AiBadge label={badgeLabel} className={cn("absolute", BADGE_POSITION[badgePosition])} />
      </div>
      {caption ? (
        <figcaption className="mt-3 text-[13px] leading-[1.6] text-muted-foreground">{caption}</figcaption>
      ) : null}
    </figure>
  ),
);
AiPhoto.displayName = "AiPhoto";
