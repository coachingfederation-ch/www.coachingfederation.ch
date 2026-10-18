import { Table } from "../shared";

export function RetentionSection() {
  return (
    <>
      <div className="space-y-6">
        <h3 className="text-lg font-semibold tracking-tight"> 7. Combien de temps conservons-nous vos données ? </h3>
        <p className="text-foreground/80"> Nous conservons les données personnelles uniquement aussi longtemps que nécessaire à la réalisation des finalités pour lesquelles elles ont été collectées ou aussi longtemps que la loi l’exige. Les durées de conservation spécifiques sont les suivantes : </p>
        <Table
          headers={["Catégorie", "Durée de conservation / critères"]}
          rows={[
  [
    "Données techniques (journaux)",
    "Les données de journalisation sont conservées par Lovable aussi longtemps que nécessaire à la sécurité et au fonctionnement de la plateforme (voir la section 5b)"
  ],
  [
    "Demandes de contact",
    "Pendant le traitement de la demande et les 3 mois suivants pour le suivi. L’enregistrement temporaire créé pendant qu’une demande du site attend votre confirmation par courriel est supprimé par une tâche quotidienne automatique sept jours après sa création, qu’il ait été confirmé ou non"
  ],
  [
    "Abonnements à la newsletter",
    "Jusqu’à votre désabonnement ; une liste d’exclusion est conservée pour empêcher toute réinscription sans consentement"
  ],
  [
    "Données du compte membre",
    "Pendant la durée de l’adhésion ICF ; suppression ou anonymisation 90 jours après la fin de l’adhésion"
  ],
  [
    "Profils dans l’annuaire des coachs",
    "Aussi longtemps que le membre maintient un profil public ; retrait lorsque le membre désactive son profil ou que son adhésion prend fin"
  ],
  [
    "Données d’inscription aux événements",
    "Pendant la durée de l’événement et les 12 mois suivants pour la comptabilité et le suivi"
  ],
  [
    "Dossiers Guest Pass",
    "12 mois après la fin de l’événement ; suppression par une tâche quotidienne automatique et anonymisation simultanée de l’inscription offerte. Le retrait du consentement au suivi met fin aux contacts ultérieurs, sans entraîner une suppression anticipée du dossier"
  ],
  [
    "Retours sur les articles",
    "Les évaluations anonymes, souhaits de sujets et commentaires sont conservés pendant 24 mois pour orienter notre planification éditoriale. Une adresse électronique n’est enregistrée que si vous l’ajoutez vous-même et sert uniquement à poser une question de suivi concernant votre retour"
  ],
  [
    "Données des utilisateurs du CMS/personnel",
    "Pendant la durée des fonctions de l’utilisateur ; suppression 90 jours après la révocation de l’accès"
  ],
  [
    "Données d’intégration ICF Global",
    "Synchronisation nocturne ; conservation selon le statut de l’adhésion"
  ],
  [
    "Pièces de paiement et factures",
    "10 ans, conformément au droit comptable suisse (art. 958f CO)"
  ]
]}
        />
        <p className="text-foreground/80"> Lorsque des obligations légales ou réglementaires imposent une conservation plus longue (par exemple pour les pièces comptables selon le droit fiscal et commercial suisse), les données sont conservées pendant la durée légalement requise. </p>
      </div>
    </>
  );
}
