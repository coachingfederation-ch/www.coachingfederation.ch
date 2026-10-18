import { Table } from "../shared";

export function PurposesSection() {
  return (
    <>
      <div className="space-y-6">
        <h3 className="text-lg font-semibold tracking-tight"> 4. À quelles fins et sur quelles bases juridiques traitons-nous vos données ? </h3>
        <p className="text-foreground/80"> Nous traitons les données personnelles aux fins suivantes : </p>
        <Table
          headers={["Finalité", "Catégories de données"]}
          rows={[
  [
    "Fonctionnement technique, sécurité et maintenance du site internet",
    "Données techniques (IP, navigateur, appareil, journaux)"
  ],
  [
    "Réponse aux demandes et communications",
    "Données de contact"
  ],
  [
    "Gestion des adhésions et des comptes membres",
    "Données du compte membre, données d’intégration ICF Global"
  ],
  [
    "Publication des profils dans l’annuaire des coachs",
    "Données du profil dans l’annuaire des coachs"
  ],
  [
    "Organisation des événements et gestion des inscriptions",
    "Données d’inscription aux événements"
  ],
  [
    "Gestion des Guest Pass pour les personnes invitées par des membres",
    "Données Guest Pass"
  ],
  [
    "Envoi de newsletters et de communications de l’association",
    "Données d’abonnement à la newsletter"
  ],
  [
    "Administration du contenu, gestion des membres et intégration ICF",
    "Données des utilisateurs du personnel/CMS, données d’intégration ICF Global"
  ],
  [
    "Respect des obligations légales et réglementaires",
    "Diverses données, selon les exigences"
  ]
]}
        />

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight"> Cadre juridique en droit suisse </h4>
          <p className="text-foreground/80"> Selon la loi fédérale sur la protection des données (LPD), le traitement de données personnelles par des personnes privées est en principe admissible s’il respecte les principes de l’art. 6 LPD (licéité, bonne foi, proportionnalité, finalité, transparence, exactitude et sécurité des données) et ne porte pas atteinte à la personnalité de la personne concernée. </p>
          <p className="text-foreground/80"> Lorsqu’un traitement est susceptible de porter atteinte à la personnalité, il peut être justifié par : </p>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li> le consentement de la personne concernée, </li>
            <li> une obligation légale, ou </li>
            <li> un intérêt privé ou public prépondérant (art. 31 LPD). </li>
          </ul>
          <p className="text-foreground/80"> Pour les activités de traitement décrites ci-dessus : </p>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li>
              <strong> Les abonnements à la newsletter </strong> reposent sur votre consentement actif. Vous pouvez vous désabonner à tout moment. </li>
            <li>
              <strong> Les profils dans l’annuaire des coachs </strong> sont publiés dans le cadre de la participation du membre à l’association, selon ses paramètres de visibilité. Un profil n’est publié que lorsque le membre règle sa visibilité sur &quot;publié&quot; ; les profils ne sont pas publiés par défaut et les membres peuvent les masquer ou les supprimer à tout moment. </li>
            <li>
              <strong> Le traitement des données techniques </strong> est nécessaire au fonctionnement et à la sécurité du site internet. </li>
            <li>
              <strong> Les données des membres et l’intégration ICF Global </strong> servent à l’exécution de la relation d’adhésion et à la réalisation du but de l’association. </li>
            <li>
              <strong> Les données d’inscription aux événements </strong> sont traitées pour organiser les événements et gérer la participation. </li>
            <li>
              <strong> Les données Guest Pass </strong> sont traitées pour examiner le pass, préparer la place offerte à la personne invitée et la contacter au sujet de l’événement. Toute prise de contact au-delà de l’événement repose sur son consentement distinct, qu’elle peut retirer à tout moment. </li>
          </ul>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight"> Lorsque le RGPD s’applique également </h4>
          <p className="text-foreground/80"> Lorsque le traitement concerne également des personnes dans l’Espace économique européen et que le RGPD s’applique, les bases juridiques pertinentes comprennent : le consentement (art. 6, par. 1, let. a, RGPD), la nécessité contractuelle (art. 6, par. 1, let. b, RGPD), une obligation légale (art. 6, par. 1, let. c, RGPD) et les intérêts légitimes (art. 6, par. 1, let. f, RGPD). </p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold tracking-tight"> 4a. D’où proviennent vos données personnelles ? </h3>
        <p className="text-foreground/80"> Nous obtenons des données personnelles auprès des sources suivantes : </p>
        <ul className="list-disc space-y-1 pl-5 text-foreground/80">
          <li>
            <strong> Directement auprès de vous </strong> : lorsque vous nous contactez, vous abonnez à la newsletter, vous inscrivez à un événement, créez ou gérez un compte membre ou modifiez votre profil dans l’annuaire des coachs. </li>
          <li>
            <strong> Auprès d’ICF Global </strong> : au moyen de la synchronisation nocturne automatisée des données des membres (voir la section 3h). </li>
          <li>
            <strong> Auprès d’un membre invitant </strong> : le membre qui demande un Guest Pass nous communique le nom et l’adresse électronique de la personne invitée afin que nous puissions l’inviter à compléter elle-même ses informations. </li>
          <li>
            <strong> Auprès des systèmes techniques </strong> : données techniques collectées automatiquement lorsque vous consultez le site internet (voir la section 3a). </li>
          <li>
            <strong> Auprès des prestataires de services </strong> : ICF Global (dossiers des membres par synchronisation nocturne) et MailerLite (inscriptions à la newsletter effectuées via le site internet). </li>
        </ul>
        <p className="text-foreground/80"> Lorsque nous obtenons des données personnelles qui n’ont pas été collectées directement auprès de vous (art. 19, al. 3, LPD), nous vous informons de leur provenance et des catégories de données traitées. </p>
      </div>
    </>
  );
}
