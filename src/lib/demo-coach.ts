/**
 * Hard-coded demonstration coach profile.
 *
 * Shown at `/coach/demo` while the public Coach Finder is switched off in the
 * CMS, so visitors can still see what a listing will look like. It is a
 * fictional placeholder person — never a database row — so it can never appear
 * in real search results and carries no member data. Vocabulary slugs match
 * the active `cf_*` terms so chips label correctly in every language.
 */
import type { Locale } from "@/i18n/config";
import type { PublicCoachProfile } from "./directory.functions";

/** Sentinel used in the `$profileId` route param. Not a UUID on purpose. */
export const DEMO_PROFILE_ID = "demo";

type DemoCopy = {
  tagline: string;
  description: string;
  approach: string;
  qualifications: string;
  fees_note: string;
  session_length_note: string;
  availability_note: string;
  response_time_note: string;
  testimonial_quote: string;
  testimonial_attribution: string;
};

const COPY: Record<Locale, DemoCopy> = {
  en: {
    tagline: "Leadership coaching for people stepping into a bigger role",
    description:
      "I work with leaders in the middle of a change: a first team, a wider mandate, a move to a new country. Together we look at what you want to be known for, what gets in the way, and what you will practise between our sessions.\n\nSessions are calm, structured, and honest. You bring the situation; I bring the questions, and we agree on one concrete experiment each time.",
    approach:
      "We start with a 30-minute intake call to see whether we fit.\nWe agree on three outcomes and how we will know you reached them.\nWe meet every two weeks for six months, in person or online.\nWe review progress after three months and adjust the goals.",
    qualifications:
      "ACC credential, awarded 2021.\nCoach training: 145 hours of accredited coach-specific education.\nBackground in engineering management before moving into coaching full time.",
    fees_note: "$220 USD per session. Reduced rates for nonprofit and public-sector clients.",
    session_length_note: "60 minutes",
    availability_note: "Accepting new clients from January",
    response_time_note: "Replies within two working days",
    testimonial_quote:
      "I came in wanting a promotion and left with a way of leading I actually recognise as mine.",
    testimonial_attribution: "Team lead, technology sector",
  },
  de: {
    tagline: "Leadership-Coaching für Menschen, die eine grössere Rolle übernehmen",
    description:
      "Ich arbeite mit Führungspersonen mitten in einer Veränderung: das erste Team, ein breiteres Mandat, ein Wechsel in ein neues Land. Gemeinsam schauen wir an, wofür Sie stehen wollen, was Sie bremst und was Sie zwischen den Sitzungen üben.\n\nDie Sitzungen sind ruhig, strukturiert und ehrlich. Sie bringen die Situation mit, ich die Fragen — und wir vereinbaren jedes Mal ein konkretes Experiment.",
    approach:
      "Wir starten mit einem 30-minütigen Kennenlerngespräch.\nWir vereinbaren drei Ziele und woran Sie merken, dass Sie sie erreicht haben.\nWir treffen uns sechs Monate lang alle zwei Wochen, vor Ort oder online.\nNach drei Monaten überprüfen wir den Fortschritt und passen die Ziele an.",
    qualifications:
      "ACC Credential, verliehen 2021.\nCoaching-Ausbildung: 145 Stunden akkreditierte coachspezifische Weiterbildung.\nZuvor Führungserfahrung im Engineering.",
    fees_note: "$220 USD pro Sitzung. Reduzierte Ansätze für Nonprofit und öffentliche Hand.",
    session_length_note: "60 Minuten",
    availability_note: "Nimmt ab Januar neue Klientinnen und Klienten auf",
    response_time_note: "Antwort innerhalb von zwei Arbeitstagen",
    testimonial_quote:
      "Ich kam wegen einer Beförderung und ging mit einer Art zu führen, die sich wirklich nach mir anfühlt.",
    testimonial_attribution: "Teamleitung, Technologiebranche",
  },
  fr: {
    tagline: "Coaching de leadership pour celles et ceux qui prennent un rôle plus large",
    description:
      "J'accompagne des responsables en pleine transition : une première équipe, un mandat élargi, une installation dans un nouveau pays. Ensemble, nous regardons ce pour quoi vous voulez être reconnu, ce qui vous freine et ce que vous allez exercer entre nos séances.\n\nLes séances sont calmes, structurées et honnêtes. Vous apportez la situation, j'apporte les questions, et nous convenons chaque fois d'une expérience concrète.",
    approach:
      "Nous commençons par un entretien de 30 minutes pour vérifier que le courant passe.\nNous fixons trois objectifs et la manière de mesurer leur atteinte.\nNous nous rencontrons toutes les deux semaines pendant six mois, sur place ou en ligne.\nAprès trois mois, nous faisons le point et ajustons les objectifs.",
    qualifications:
      "Credential ACC, obtenu en 2021.\nFormation de coach : 145 heures de formation accréditée spécifique au coaching.\nParcours en management d'ingénierie avant de passer au coaching à plein temps.",
    fees_note: "$220 USD par séance. Tarifs réduits pour le secteur associatif et public.",
    session_length_note: "60 minutes",
    availability_note: "Accepte de nouveaux clients dès janvier",
    response_time_note: "Réponse sous deux jours ouvrables",
    testimonial_quote:
      "Je venais chercher une promotion et je repars avec une façon de diriger qui me ressemble vraiment.",
    testimonial_attribution: "Responsable d'équipe, secteur technologique",
  },
  it: {
    tagline: "Coaching di leadership per chi assume un ruolo più ampio",
    description:
      "Lavoro con persone che guidano nel mezzo di un cambiamento: il primo team, un mandato più ampio, un trasferimento in un nuovo paese. Insieme guardiamo per cosa volete essere riconosciuti, cosa vi ostacola e cosa eserciterete tra un incontro e l'altro.\n\nGli incontri sono calmi, strutturati e onesti. Voi portate la situazione, io le domande, e ogni volta concordiamo un esperimento concreto.",
    approach:
      "Iniziamo con una chiamata conoscitiva di 30 minuti.\nDefiniamo tre obiettivi e come capiremo di averli raggiunti.\nCi incontriamo ogni due settimane per sei mesi, di persona o online.\nDopo tre mesi verifichiamo i progressi e adattiamo gli obiettivi.",
    qualifications:
      "Credential ACC, ottenuto nel 2021.\nFormazione: 145 ore di formazione accreditata specifica per il coaching.\nEsperienza precedente nella gestione di team di ingegneria.",
    fees_note:
      "$220 USD a sessione. Tariffe ridotte per organizzazioni no profit e settore pubblico.",
    session_length_note: "60 minuti",
    availability_note: "Accetta nuovi clienti da gennaio",
    response_time_note: "Risponde entro due giorni lavorativi",
    testimonial_quote:
      "Sono arrivata per una promozione e sono uscita con un modo di guidare che sento davvero mio.",
    testimonial_attribution: "Team lead, settore tecnologico",
  },
};

/** The demo profile in the visitor's language, shaped like a real listing. */
export function demoCoachProfile(locale: Locale): PublicCoachProfile {
  const copy = COPY[locale] ?? COPY.en;
  return {
    profile_id: DEMO_PROFILE_ID,
    member_id: null,
    full_name: "Anna Muster",
    organisation: "Muster Coaching",
    city: "Zürich",
    country: "Switzerland",
    tagline: copy.tagline,
    description: copy.description,
    approach: copy.approach,
    qualifications: copy.qualifications,
    fees_note: copy.fees_note,
    session_length_note: copy.session_length_note,
    availability_note: copy.availability_note,
    availability_slug: "accepting",
    response_time_note: copy.response_time_note,
    testimonial_quote: copy.testimonial_quote,
    testimonial_attribution: copy.testimonial_attribution,
    credential_slug: "ACC",
    credential_awarded_on: "2021-06-01",
    experience_band: "6-10",
    language_slugs: ["de", "en"],
    region_slugs: ["zurich", "central"],
    specialisation_slugs: ["leadership", "transition", "team"],
    format_slugs: ["online", "in-person"],
    client_type_slugs: ["organisational", "personal"],
    services: ["coaching", "mentoring"],
    coaching_available: true,
    mentoring_available: true,
    supervision_available: false,
    mentor_accredited: false,
    supervision_accredited: false,
    has_directory_credential: true,
    is_active_member: true,
    is_directory_eligible: true,
    is_directory_visible: true,
    primary_locale: locale,
    resolvedLocale: locale,
    translations: null,
    profile_image_path: null,
    image_url: null,
    // A demo profile must never invite real contact attempts.
    contact_email: null,
    booking_url: null,
    website_url: null,
    linkedin_url: null,
    updated_at: null,
    links: [],
  };
}
