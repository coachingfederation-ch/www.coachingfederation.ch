/**
 * Copy for the "member wants to join your community" notification, in the four
 * chapter languages. Held here rather than in the app's i18n bundles because
 * the mail is rendered server-side, where there is no UI language context.
 */
import type { Locale } from "@/i18n/config";

export type CommunityJoinCopy = {
  subject: string;
  banner: string;
  preview: string;
  heading: string;
  intro: string;
  nameLabel: string;
  emailLabel: string;
  communityLabel: string;
  closing: string;
};

export const COMMUNITY_JOIN_COPY: Record<Locale, CommunityJoinCopy> = {
  en: {
    subject: "New member interested in joining {community}",
    banner: "Community interest",
    preview: "{name} would like to join {community}.",
    heading: "A member would like to join your community",
    intro:
      "{name} pressed “Join community” in the Member Area and asked to be part of {community}.",
    nameLabel: "Member",
    emailLabel: "Email",
    communityLabel: "Community",
    closing: "Reply to this email to welcome them and share the next meet-up.",
  },
  de: {
    subject: "Neues Mitglied möchte {community} beitreten",
    banner: "Interesse an der Community",
    preview: "{name} möchte {community} beitreten.",
    heading: "Ein Mitglied möchte deiner Community beitreten",
    intro:
      "{name} hat im Mitgliederbereich auf «Community beitreten» geklickt und möchte Teil von {community} werden.",
    nameLabel: "Mitglied",
    emailLabel: "E-Mail",
    communityLabel: "Community",
    closing:
      "Antworte einfach auf diese E-Mail, um sie oder ihn willkommen zu heissen und das nächste Treffen zu teilen.",
  },
  fr: {
    subject: "Un membre souhaite rejoindre {community}",
    banner: "Intérêt pour la communauté",
    preview: "{name} souhaite rejoindre {community}.",
    heading: "Un membre souhaite rejoindre votre communauté",
    intro:
      "{name} a cliqué sur « Rejoindre la communauté » dans l’espace membres et souhaite faire partie de {community}.",
    nameLabel: "Membre",
    emailLabel: "E-mail",
    communityLabel: "Communauté",
    closing:
      "Répondez à cet e-mail pour lui souhaiter la bienvenue et partager la prochaine rencontre.",
  },
  it: {
    subject: "Un membro desidera unirsi a {community}",
    banner: "Interesse per la community",
    preview: "{name} desidera unirsi a {community}.",
    heading: "Un membro desidera unirsi alla vostra community",
    intro:
      "{name} ha premuto «Unisciti alla community» nell’area riservata e desidera far parte di {community}.",
    nameLabel: "Membro",
    emailLabel: "E-mail",
    communityLabel: "Community",
    closing: "Rispondete a questa e-mail per dare il benvenuto e condividere il prossimo incontro.",
  },
};

export const fill = (value: string, vars: Record<string, string>) =>
  value.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? "");
