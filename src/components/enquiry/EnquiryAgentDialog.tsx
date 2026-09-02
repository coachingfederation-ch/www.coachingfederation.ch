"use client";

/**
 * Opens an enquiry conversation in an overlay: a bottom sheet on phones, a
 * centred dialog from the tablet breakpoint up. Used by the contact section on
 * /about and the "propose an event" band on /events, so both flows share one
 * behaviour and one panel.
 *
 * Exports: EnquiryAgentDialog.
 */
import { useState, type ReactNode } from "react";
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
import { EnquiryAgentPanel, type EnquiryAgentPanelProps } from "./EnquiryAgentPanel";

export type EnquiryAgentDialogProps = Omit<EnquiryAgentPanelProps, "className" | "variant"> & {
  /** The button that opens the overlay. */
  trigger: ReactNode;
};

export function EnquiryAgentDialog({ trigger, tp, ...panelProps }: EnquiryAgentDialogProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  /** Remounts the panel after a completed conversation, so reopening starts fresh. */
  const [session, setSession] = useState(0);
  const [completed, setCompleted] = useState(false);

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next && completed) {
      setCompleted(false);
      setSession((n) => n + 1);
    }
  };

  const panel = (
    <EnquiryAgentPanel
      key={session}
      {...panelProps}
      tp={tp}
      variant="overlay"
      className="min-h-0 flex-1"
      onComplete={() => setCompleted(true)}
    />
  );

  const title = tp("overlayTitle");
  const lede = tp("overlayLede");

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="h-[92dvh] text-left">
          <DrawerHeader className="text-left">
            <DrawerTitle className="font-heading text-xl">{title}</DrawerTitle>
            <DrawerDescription>{lede}</DrawerDescription>
          </DrawerHeader>
          {panel}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="flex h-[80dvh] max-w-2xl flex-col gap-0 rounded-3xl p-0 text-left">
        <DialogHeader className="space-y-2 border-b border-border px-8 pb-6 pt-8 text-left">
          <DialogTitle className="font-heading text-2xl">{title}</DialogTitle>
          <DialogDescription>{lede}</DialogDescription>
        </DialogHeader>
        {panel}
      </DialogContent>
    </Dialog>
  );
}
