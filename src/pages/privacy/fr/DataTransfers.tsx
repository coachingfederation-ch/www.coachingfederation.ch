import { Table } from "../shared";

export function DataTransfersSection() {
  return (
    <>
      <div className="space-y-6">
        <h3 className="text-lg font-semibold tracking-tight"> 6. Des données sont-elles transférées hors de Suisse ? </h3>
        <p className="text-foreground/80"> Les données personnelles traitées en lien avec notre site internet peuvent être transférées hors de Suisse. Les transferts suivants sont connus ou prévus : </p>
        <p className="text-foreground/80">
          <strong> Les données clients </strong> (comptes membres, profils de coachs, inscriptions aux événements et abonnements à la newsletter) sont stockées dans la région Europe (Irlande) de Supabase via Lovable Cloud. L’UE/EEE est reconnue comme assurant un niveau de protection des données adéquat en droit suisse (art. 16, al. 1, LPD) ; aucune garantie supplémentaire n’est donc requise pour ce stockage. </p>
        <p className="text-foreground/80"> Toutefois, Lovable Labs Inc. (société américaine) dispose d’un accès à ces données en qualité de sous-traitant, et les données de service de Lovable (journaux techniques et télémétrie d’utilisation) sont traitées aux États-Unis. Ces transferts sont couverts par les garanties énumérées ci-dessous. </p>
        <Table
          headers={["Destinataire", "Pays / région", "Garantie"]}
          rows={[
  [
    "Lovable (Lovable Labs Inc.)",
    "États-Unis (Delaware)",
    "CCT de l’UE, module 2 (responsable du traitement vers sous-traitant), appliquées aux transferts depuis la Suisse ; avenant britannique. Voir le DPA de Lovable"
  ],
  [
    "Sous-traitants ultérieurs de Lovable",
    "Divers (voir trust.lovable.dev)",
    "Obligations contractuelles équivalentes à celles des DPA de Lovable"
  ],
  [
    "Supabase (via Lovable Cloud)",
    "Europe (Irlande)",
    "Sous-traitant ultérieur de Lovable ; couvert par le DPA de Lovable. UE/EEE reconnue comme adéquate selon la LPD suisse"
  ],
  [
    "Cloudflare",
    "Réseau mondial",
    "Routage en périphérie, DNS et Workers (CDN). Sous-traitant ultérieur de Lovable ; couvert par le DPA de Lovable"
  ],
  [
    "MailerLite",
    "Union européenne (Allemagne)",
    "UE/EEE reconnue comme adéquate selon la LPD suisse ; avenant relatif au traitement des données de MailerLite"
  ],
  [
    "Stripe",
    "États-Unis",
    "Clauses contractuelles types ; contrat de sous-traitance de Stripe"
  ],
  [
    "ICF Global",
    "États-Unis (administration par Associations International)",
    "Chapter Agreement et API Agreement avec ICF Global"
  ],
  [
    "Google Maps (Google LLC)",
    "États-Unis",
    "Clauses contractuelles types de l’UE / Swiss-US Data Privacy Framework (Google)"
  ],
  [
    "Unsplash (Unsplash Inc.)",
    "États-Unis",
    "Utilisation par le personnel uniquement (sélecteur d’images du CMS) ; aucune donnée de visiteur"
  ],
  [
    "OpenAI (via Lovable AI Gateway)",
    "États-Unis",
    "Sous-traitant ultérieur de Lovable, couvert par le DPA de Lovable ; aucune utilisation pour l’entraînement des modèles"
  ]
]}
        />
        <p className="text-foreground/80"> Lorsque des données sont transférées vers des pays n’assurant pas un niveau de protection des données adéquat selon le droit suisse, nous veillons à la mise en place de garanties appropriées, notamment : </p>
        <ul className="list-disc space-y-1 pl-5 text-foreground/80">
          <li> Clauses contractuelles types (CCT) ou garanties contractuelles équivalentes </li>
          <li> Règles d’entreprise contraignantes (le cas échéant) </li>
          <li> Exceptions spécifiques prévues à l’art. 16, al. 2, LPD </li>
        </ul>
      </div>
    </>
  );
}
