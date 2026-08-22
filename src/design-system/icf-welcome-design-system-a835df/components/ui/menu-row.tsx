/**
 * MenuRow — the menu-row skin for lightweight, non-Radix menus.
 *
 * Header account menus and language switchers are often plain anchors (or
 * router links) inside a `shadow-soft` card rather than a Radix menu. MenuRow
 * applies the same treatment `DropdownMenuItem` uses, via the token-driven
 * `menu-item` utility, so both kinds of menu read identically. Pass `asChild`
 * to keep your own element (an `<a>`, a router `Link`, a `<button>`).
 */
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/design-system/icf-welcome-design-system-a835df/lib/utils";

export type MenuRowProps = React.HTMLAttributes<HTMLElement> & {
  /** Render the child element instead of a `<button>` (links, router Links). */
  asChild?: boolean;
};

export const MenuRow = React.forwardRef<HTMLElement, MenuRowProps>(
  ({ className, asChild = false, ...props }, ref) => {
    const Comp = (asChild ? Slot : "button") as React.ElementType;
    return (
      <Comp
        ref={ref}
        className={cn("menu-item w-full cursor-pointer", className)}
        {...(asChild ? {} : { type: "button" })}
        {...props}
      />
    );
  },
);
MenuRow.displayName = "MenuRow";
