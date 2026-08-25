/**
 * Password reset (recovery) email — the one auth email members actually use.
 *
 * Copy is localised in-file for the four chapter languages because there is no
 * reliable per-account locale at send time: the sign-in screen carries the
 * chosen language through the reset link, and anything unknown falls back to
 * English rather than failing the send.
 *
 * Exports: RecoveryEmail, recoverySubject. Rendered by
 * routes/lovable/email/auth/webhook.ts.
 */
import * as React from "react";
import {
  AuthButton,
  AuthEmailShell,
  AuthFallbackLink,
  AuthHr,
  AuthText,
  authStyles,
  normalizeAuthLocale,
  type AuthLocale,
} from "./auth-shell";

interface RecoveryEmailProps {
  confirmationUrl: string;
  locale?: string;
}

const COPY: Record<AuthLocale, Record<string, string>> = {
  en: {
    subject: "Reset your password",
    tag: "Password reset",
    preview: "Choose a new password for your Member Area account.",
    heading: "Reset your password",
    intro:
      "We received a request to set a new password for your account at The Switzerland Chapter of ICF. Choose a new password with the button below.",
    cta: "Set a new password",
    expiry: "This link works once and expires shortly, so please use it soon.",
    fallback: "If the button does not work, copy this address into your browser:",
    help: "Need a hand? Write to us at office@coachingfederation.ch and we will help you.",
    ignore:
      "If you did not request this, you can safely ignore this email — your password stays unchanged.",
  },
  de: {
    subject: "Passwort zurücksetzen",
    tag: "Passwort zurücksetzen",
    preview: "Wählen Sie ein neues Passwort für Ihr Mitgliederbereich-Konto.",
    heading: "Passwort zurücksetzen",
    intro:
      "Wir haben eine Anfrage erhalten, ein neues Passwort für Ihr Konto bei The Switzerland Chapter of ICF zu setzen. Wählen Sie über die Schaltfläche unten ein neues Passwort.",
    cta: "Neues Passwort setzen",
    expiry: "Dieser Link funktioniert einmal und läuft bald ab – bitte nutzen Sie ihn zeitnah.",
    fallback:
      "Falls die Schaltfläche nicht funktioniert, kopieren Sie diese Adresse in Ihren Browser:",
    help: "Brauchen Sie Hilfe? Schreiben Sie uns an office@coachingfederation.ch.",
    ignore:
      "Falls Sie das nicht angefordert haben, können Sie diese E-Mail ignorieren – Ihr Passwort bleibt unverändert.",
  },
  fr: {
    subject: "Réinitialiser votre mot de passe",
    tag: "Mot de passe",
    preview: "Choisissez un nouveau mot de passe pour votre espace membre.",
    heading: "Réinitialiser votre mot de passe",
    intro:
      "Nous avons reçu une demande de nouveau mot de passe pour votre compte auprès de The Switzerland Chapter of ICF. Choisissez un nouveau mot de passe avec le bouton ci-dessous.",
    cta: "Définir un nouveau mot de passe",
    expiry: "Ce lien est à usage unique et expire rapidement : utilisez-le sans tarder.",
    fallback: "Si le bouton ne fonctionne pas, copiez cette adresse dans votre navigateur :",
    help: "Besoin d’aide ? Écrivez-nous à office@coachingfederation.ch.",
    ignore:
      "Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail — votre mot de passe reste inchangé.",
  },
  it: {
    subject: "Reimposta la tua password",
    tag: "Password",
    preview: "Scegli una nuova password per la tua area membri.",
    heading: "Reimposta la tua password",
    intro:
      "Abbiamo ricevuto una richiesta di nuova password per il tuo account presso The Switzerland Chapter of ICF. Scegli una nuova password con il pulsante qui sotto.",
    cta: "Imposta una nuova password",
    expiry: "Questo link è valido una sola volta e scade a breve: usalo subito.",
    fallback: "Se il pulsante non funziona, copia questo indirizzo nel tuo browser:",
    help: "Hai bisogno di aiuto? Scrivici a office@coachingfederation.ch.",
    ignore:
      "Se non hai richiesto tu questa operazione, puoi ignorare questa e-mail: la password resta invariata.",
  },
};

export function recoverySubject(locale?: string) {
  return COPY[normalizeAuthLocale(locale)]["subject"] as string;
}

export const RecoveryEmail = ({ confirmationUrl, locale }: RecoveryEmailProps) => {
  const l = normalizeAuthLocale(locale);
  const c = COPY[l];
  return (
    <AuthEmailShell
      locale={l}
      preview={c["preview"] as string}
      tag={c["tag"] as string}
      heading={c["heading"] as string}
    >
      <AuthText style={authStyles.lede}>{c["intro"]}</AuthText>
      <AuthButton href={confirmationUrl}>{c["cta"]} →</AuthButton>
      <AuthText style={authStyles.muted}>{c["expiry"]}</AuthText>
      <AuthFallbackLink label={c["fallback"] as string} href={confirmationUrl} />
      <AuthHr style={authStyles.hr} />
      <AuthText style={authStyles.closing}>{c["help"]}</AuthText>
      <AuthText style={authStyles.muted}>{c["ignore"]}</AuthText>
    </AuthEmailShell>
  );
};

export default RecoveryEmail;
