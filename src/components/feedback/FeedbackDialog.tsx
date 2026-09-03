"use client";

/**
 * Generic feedback overlay: a bottom sheet on phones, a centred dialog from the
 * tablet breakpoint up. Owns nothing but presentation — the caller controls
 * `open` and passes the form as children — so other surfaces (events, coach
 * pages) can reuse the same shell.
 *
 * Exports: FeedbackDialog.
 */
import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/design-system/icf-welcome-design-system-a835df";
import { useIsMobile } from "@/hooks/use-mobile";

export type FeedbackDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Optional inline trigger; omit when the dialog is opened programmatically. */
  trigger?: ReactNode;
  children: ReactNode;
};

export function FeedbackDialog({
  open,
  onOpenChange,
  title,
  description,
  trigger,
  children,
}: FeedbackDialogProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        {trigger ? <DrawerTrigger asChild>{trigger}</DrawerTrigger> : null}
        <DrawerContent className="max-h-[92dvh] text-left">
          <DrawerHeader className="text-left">
            <DrawerTitle className="font-heading text-xl">{title}</DrawerTitle>
            {description ? <DrawerDescription>{description}</DrawerDescription> : null}
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8">{children}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="flex max-h-[88dvh] max-w-2xl flex-col gap-0 rounded-3xl p-0 text-left">
        <DialogHeader className="space-y-2 border-b border-border px-8 pb-6 pt-8 text-left">
          <DialogTitle className="font-heading text-2xl">{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
