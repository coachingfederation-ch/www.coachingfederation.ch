/**
 * Focused payment overlay for ticketed event registration.
 *
 * The Stripe embedded checkout used to render inside the narrow registration
 * sidebar, which left the iframe cramped on desktop and unusable on a phone.
 * Radix Dialog gives us the focus trap, Escape handling and scroll lock; the
 * content is a centred modal from `sm` up and a near-full-height sheet below.
 *
 * The provider is mounted only while the overlay is open and the `options`
 * object is memoised by the caller, so Stripe never sees a changed client
 * secret on an existing provider instance.
 */
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { X } from "lucide-react";
import { getStripe } from "@/lib/stripe";

export function PaymentOverlay({
  open,
  onClose,
  title,
  closeLabel,
  eventTitle,
  summary,
  options,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  eventTitle: string;
  summary: string | null;
  options: { fetchClientSecret: () => Promise<string> };
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => (next ? null : onClose())}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-deep-blue/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-border/70 bg-card data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="sticky top-0 flex items-start gap-4 border-b border-border/70 bg-card px-5 py-4">
            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title className="font-quicksand text-lg leading-tight">
                {title}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1 truncate text-xs text-muted-foreground">
                {eventTitle}
                {summary ? ` · ${summary}` : ""}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close
              className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={closeLabel}
            >
              <X className="h-5 w-5" aria-hidden />
            </DialogPrimitive.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 sm:px-4 sm:pb-4">
            {open ? (
              <EmbeddedCheckoutProvider stripe={getStripe()} options={options}>
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            ) : null}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
