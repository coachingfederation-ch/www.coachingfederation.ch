/**
 * Hand-over between the creation wizard and the event editor.
 *
 * Two of the wizard's "extras" answers have nowhere to live on a fresh row:
 * a repeat rule is only stored once dates are generated, and a custom form
 * only exists once one is built. Rather than add columns for intent, the
 * answers ride along in sessionStorage for the single hop into the editor,
 * which uses them to decide which optional panels start open.
 */
export type WizardExtras = { repeat: boolean; forms: boolean; cce: boolean };

const key = (eventId: string) => `icf.event-wizard-extras.${eventId}`;

export function rememberWizardExtras(eventId: string, extras: WizardExtras) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key(eventId), JSON.stringify(extras));
  } catch {
    // Private-mode storage failures are not worth interrupting the flow.
  }
}

/** Reads and clears the hand-over; the editor's own state takes over after that. */
export function takeWizardExtras(eventId: string): WizardExtras | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(key(eventId));
    if (!raw) return null;
    window.sessionStorage.removeItem(key(eventId));
    const parsed = JSON.parse(raw) as Partial<WizardExtras>;
    return {
      repeat: parsed.repeat === true,
      forms: parsed.forms === true,
      cce: parsed.cce === true,
    };
  } catch {
    return null;
  }
}
