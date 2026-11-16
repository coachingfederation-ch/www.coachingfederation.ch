/**
 * Read-only presentation for the `organizer_readonly` grant.
 *
 * The server and RLS already refuse every write from this role; this only
 * keeps the screens honest by not offering actions that would be refused.
 * `ReadOnlyRegion` disables every field inside it and hides its buttons, so
 * a settings panel stays readable without one edit control per component.
 * Links (`<a>`) stay usable, which keeps "view" and "download" navigation.
 */
import type { ReactNode } from "react";
import { useMyRoles } from "@/lib/roles";

/** True when the viewer holds only the read-only event grant. */
export function useEventReadOnly(): boolean {
  return useMyRoles().roles.isEventReadOnly;
}

export function ReadOnlyRegion({ readOnly, children }: { readOnly: boolean; children: ReactNode }) {
  if (!readOnly) return <>{children}</>;
  return (
    <fieldset disabled aria-readonly="true" className="min-w-0 [&_button:disabled]:hidden">
      {children}
    </fieldset>
  );
}
