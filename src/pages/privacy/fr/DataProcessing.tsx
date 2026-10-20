import { ExternalLink } from "../shared";

export function DataProcessingSection() {
  return (
    <>
      <div className="space-y-6">
        <h3 className="text-lg font-semibold tracking-tight"> 3. Quelles données personnelles traitons-nous ? </h3>
        <p className="text-foreground/80"> Nous traitons les catégories de données personnelles suivantes : </p>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight"> a) Données techniques (tous les visiteurs du site) </h4>
          <p className="text-foreground/80"> Lorsque vous consultez notre site internet, nous et notre plateforme d’hébergement Lovable traitons automatiquement les données techniques transmises par votre navigateur : </p>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li> Adresse IP (ou adresse IP tronquée) </li>
            <li> Type et version du navigateur </li>
            <li> Système d’exploitation </li>
            <li> Type d’appareil </li>
            <li> URL de provenance (la page consultée avant la nôtre) </li>
            <li> Date et heure de l’accès </li>
            <li> Pages consultées et durée de la visite </li>
          </ul>
          <p className="text-foreground/80"> Ces données sont traitées pour assurer le fonctionnement technique, la sécurité et la stabilité du site internet. Pour les données de votre compte, de vos formulaires et de votre profil, Lovable agit en qualité de sous-traitant pour notre compte. Pour les données techniques de journalisation et d’utilisation (notamment l’adresse IP et les données du navigateur et de l’appareil), Lovable agit en qualité de responsable du traitement indépendant conformément à sa propre{" "} <ExternalLink href="https://lovable.dev/privacy"> politique de confidentialité </ExternalLink> et peut conserver ces données aussi longtemps qu’un besoin commercial légitime le justifie. </p>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight"> b) Données de contact et de demande </h4>
          <p className="text-foreground/80"> Lorsque vous nous contactez par courriel ou au moyen d’un formulaire de contact, nous traitons : </p>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li> Nom </li>
            <li> Adresse électronique </li>
            <li> Toute autre information que vous choisissez de communiquer dans votre message </li>
          </ul>
          <p className="text-foreground/80"> Sur notre page de présentation, vous pouvez préparer votre demande en dialoguant avec un assistant d’intelligence artificielle plutôt qu’en remplissant un formulaire. La conversation est traitée par OpenAI (États-Unis) via l’AI Gateway de Lovable. Elle n’est pas stockée sur nos serveurs et, conformément à notre contrat de sous-traitance, elle n’est jamais utilisée pour entraîner des modèles d’IA. L’historique de vos conversations est conservé uniquement dans votre propre navigateur (voir la section 8). Lorsque vous appuyez sur &quot;Vérifier et envoyer&quot;, l’assistant rédige un résumé que vous pouvez modifier ; nous recevons la version que vous approuvez. Nous stockons ensuite temporairement votre nom, votre adresse électronique, l’objet et le message, puis envoyons un lien de confirmation à votre adresse électronique ; votre message ne parvient à notre secrétariat que lorsque vous cliquez sur ce lien. Cela vous protège contre l’envoi de messages en votre nom par des tiers. Les demandes confirmées comme les demandes non confirmées sont automatiquement supprimées sept jours après leur création. </p>
        </div>


        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight"> c) Données d’abonnement à la newsletter </h4>
          <p className="text-foreground/80"> Lorsque vous vous abonnez à notre newsletter via le site internet, nous traitons : </p>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li> Adresse électronique </li>
            <li> Date et statut de l’abonnement </li>
          </ul>
          <p className="text-foreground/80"> Seule l’adresse électronique est collectée lors de l’inscription ; aucun champ supplémentaire (tel que le nom ou les centres d’intérêt) n’est collecté. </p>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight"> d) Données du compte membre </h4>
          <p className="text-foreground/80"> Lorsque vous créez un compte membre ou en revendiquez l’accès, nous traitons : </p>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li> Nom </li>
            <li> Adresse électronique </li>
            <li> Informations relatives à l’adhésion ICF (identifiant du membre, certifications, statut de l’adhésion) </li>
            <li> Données d’authentification du compte (par exemple, identifiants de connexion gérés par notre prestataire d’authentification) </li>
            <li> Préférences et paramètres du profil </li>
          </ul>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight"> e) Données du profil dans l’annuaire des coachs </h4>
          <p className="text-foreground/80"> Pour les membres dont le profil figure dans l’annuaire public &quot;Find a Coach&quot;, nous traitons et publions : </p>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li> Nom et certifications </li>
            <li> Photographie </li>
            <li> Biographie et spécialités de coaching </li>
            <li> Coordonnées (telles que rendues publiques par le membre) </li>
            <li> Langues parlées </li>
            <li> Localité / région </li>
            <li> Domaines de coaching </li>
            <li> Liens vers des profils externes (par exemple site internet, LinkedIn), s’ils sont fournis par le membre </li>
          </ul>
          <p className="text-foreground/80"> Le profil d’un coach n’est rendu public que lorsque le membre règle lui-même sa visibilité sur &quot;publié&quot;. Les profils sont créés sous forme de brouillons non publiés et ne deviennent jamais publics automatiquement ; les membres peuvent masquer ou supprimer leur profil à tout moment. La publication exige en outre une adhésion ICF active et une certification en cours de validité. Nous ne publions donc aucun profil sans intervention du membre lui-même. </p>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight"> f) Données d’inscription aux événements </h4>
          <p className="text-foreground/80"> Lorsque vous vous inscrivez à un événement, nous traitons : </p>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li> Nom </li>
            <li> Adresse électronique </li>
            <li> Statut de l’inscription et informations de paiement, le cas échéant </li>
          </ul>
          <p className="text-foreground/80"> Outre le nom et l’adresse électronique, l’inscription aux événements ne collecte aucune donnée permettant d’identifier une personne. Les formulaires de certains événements peuvent demander des informations supplémentaires lorsque l’événement l’exige. Ces données sont utilisées uniquement pour cet événement et sont supprimées avec les données d’inscription. Nous ne collectons ni exigences alimentaires, ni besoins d’accessibilité, ni aucune autre catégorie de données personnelles sensibles (art. 5, let. c, LPD) lors de l’inscription aux événements. </p>
          <p className="text-foreground/80">Nous réalisons également des sondages auxquels chacun peut répondre via un lien partagé. Les réponses sont anonymes, sauf si un sondage demande votre nom et votre adresse e-mail, ce qui est toujours indiqué sur la page du sondage. Les réponses ne sont consultables que par notre équipe, sont utilisées uniquement pour l’évaluation du sondage concerné et sont supprimées 12 mois après la clôture du sondage.</p>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight"> g) Données du personnel et des utilisateurs du CMS </h4>
          <p className="text-foreground/80"> Pour le personnel et les utilisateurs autorisés du CMS et des outils d’administration, nous traitons : </p>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li> Nom et adresse électronique </li>
            <li> Rôle et autorisations d’accès </li>
            <li> Données d’authentification </li>
            <li> Journaux d’activité dans le CMS </li>
          </ul>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight"> h) Données issues de l’intégration ICF Global </h4>
          <p className="text-foreground/80"> Nous recevons des données de membres de l’International Coaching Federation (ICF Global) au moyen d’une synchronisation nocturne automatisée. Ces données comprennent : </p>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li> Numéro de membre ICF (identifiant interne du membre) </li>
            <li> Prénom, nom et nom complet </li>
            <li> Adresse électronique et numéro de téléphone </li>
            <li> Ville et pays de résidence </li>
            <li> Organisation (si elle figure dans le dossier ICF) </li>
            <li> Type et statut de l’adhésion </li>
            <li> Date d’adhésion et date d’expiration </li>
            <li> Certification (ACC, PCC ou MCC) et dates d’obtention et d’expiration </li>
          </ul>
          <p className="text-foreground/80"> Ces données sont traitées pour tenir à jour les dossiers des membres et les profils de l’annuaire. </p>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight"> i) Données Guest Pass </h4>
          <p className="text-foreground/80"> Les membres peuvent inviter à un événement une personne non membre au moyen d’un Guest Pass. Le membre invitant fournit uniquement le nom et l’adresse électronique de la personne invitée et confirme l’en avoir informée. Nous envoyons ensuite à cette personne un lien personnel par courriel ; elle décide elle-même des autres informations qu’elle souhaite communiquer : </p>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li> Nom et adresse électronique (fournis par le membre invitant) </li>
            <li> Langue de préférence </li>
            <li> À titre facultatif : numéro de téléphone, lieu d’établissement, niveau ou parcours en coaching, domaine d’activité principal, autres associations de coaching et toute remarque souhaitée </li>
            <li> Consentement éventuel de la personne invitée à être contactée ultérieurement au sujet du chapitre </li>
          </ul>
          <p className="text-foreground/80"> Nous utilisons ces données pour examiner la demande de Guest Pass, inscrire la personne invitée à l’événement en cas d’approbation et la contacter au sujet de cet événement. La demande ne parvient à notre équipe Membership &amp; Engagement qu’une fois complétée par la personne invitée elle-même ; cette équipe, qui statue sur le pass, est seule à voir ses coordonnées et les informations facultatives ci-dessus. Les responsables de communauté et de projet de l’événement voient le nom de la personne invitée et celui du membre invitant afin de pouvoir l’accueillir. Toute prise de contact au-delà de l’événement n’a lieu que si la personne invitée y a consenti ; ce consentement peut être retiré à tout moment. </p>
          <p className="text-foreground/80"> Un Guest Pass n’est pas une inscription ordinaire à un événement : la place est offerte, aucune donnée de paiement n’est générée et le dossier contient tant le lien d’invitation que l’inscription. Les dossiers Guest Pass sont automatiquement supprimés 12 mois après l’événement. </p>
        </div>
      </div>
    </>
  );
}
