import { ExternalLink, MailLink } from "../shared";

export function ThirdPartiesSection() {
  return (
    <>
      <div className="space-y-6">
        <h3 className="text-lg font-semibold tracking-tight"> 5. Qui reçoit vos données ? </h3>
        <p className="text-foreground/80"> Nous communiquons des données personnelles aux catégories de destinataires suivantes : </p>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight"> a) Prestataires d’hébergement et d’infrastructure </h4>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li>
              <strong> Supabase </strong> : fournit la base de données, l’authentification, le stockage de fichiers et l’infrastructure en temps réel de notre site internet. L’accès à Supabase s’effectue via Lovable Cloud ; Supabase est donc un sous-traitant ultérieur de Lovable et non un sous-traitant direct de The Switzerland Chapter of ICF. Les données personnelles stockées dans Supabase sont traitées conformément au contrat de sous-traitance de Lovable. Localisation des données : Europe (Irlande). Le projet Lovable Cloud est configuré pour stocker les données dans la région UE (Irlande). L’UE/EEE est reconnue comme assurant un niveau de protection des données adéquat en droit suisse. </li>
            <li>
              <strong> Cloudflare </strong> : fournit le routage en périphérie, le DNS et les Workers (réseau de diffusion de contenu) dans le cadre de la plateforme d’hébergement Lovable, qui diffuse le site via le réseau mondial de périphérie de Cloudflare. Cloudflare est un sous-traitant ultérieur de Lovable ; son traitement des données est couvert par le contrat de sous-traitance de Lovable. </li>
          </ul>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight"> b) Plateforme du site internet et hébergement : Lovable </h4>
          <p className="text-foreground/80"> Le site internet de The Switzerland Chapter of ICF est hébergé et exploité sur la plateforme{" "} <strong> Lovable </strong> (Lovable Labs Incorporated, société américaine). Lovable fournit l’hébergement de l’application web, les outils de développement et l’infrastructure de déploiement de coachingfederation.ch. </p>
          <p className="text-foreground/80"> Lovable traite les données personnelles en qualité de <strong> sous-traitant </strong> pour le compte de The Switzerland Chapter of ICF. Principales informations issues de la{" "} <ExternalLink href="https://lovable.dev/privacy"> politique de confidentialité de Lovable </ExternalLink>{" "}
            (dernière mise à jour : avril 2026) :
          </p>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li>
              <strong> Entité juridique : </strong> Lovable Labs Incorporated (Delaware, États-Unis) </li>
            <li>
              <strong> Représentant dans l’UE : </strong> Lovable Labs AB, Regeringsgatan 25, 111 53 Stockholm, Suède </li>
            <li>
              <strong> Contact du délégué à la protection des données : </strong> <MailLink address="dpo@lovable.dev" />
            </li>
            <li>
              <strong> Rôle : </strong> Pour les données de votre compte, de vos formulaires et de votre profil (données clients), Lovable agit en qualité de sous-traitant pour notre compte. Pour les données techniques de journalisation et d’utilisation (notamment l’adresse IP et les données du navigateur et de l’appareil), Lovable agit en qualité de responsable du traitement indépendant conformément à sa propre politique de confidentialité et peut conserver ces données aussi longtemps qu’un besoin commercial légitime le justifie. </li>
            <li>
              <strong> Infrastructure d’hébergement : </strong> Lovable Cloud stocke et traite l’ensemble des données clients, y compris la base de données du site, l’authentification, le stockage de fichiers et les données de l’application, sur l’infrastructure Supabase. Supabase est un sous-traitant ultérieur de Lovable, accessible via Lovable Cloud. The Switzerland Chapter of ICF n’a aucune relation contractuelle directe avec Supabase. Nous utilisons l’AI Gateway de Lovable, qui transmet des données à des fournisseurs tiers d’IA (actuellement OpenAI). </li>
            <li>
              <strong> Sous-traitants ultérieurs : </strong> Lovable fait appel à des sous-traitants ultérieurs, notamment Google Cloud Platform (hébergement), Cloudflare (routage en périphérie, DNS et CDN), Supabase (base de données et authentification), Stripe (paiements) et OpenAI (AI Gateway). La liste complète est disponible à l’adresse{" "} <ExternalLink href="https://trust.lovable.dev"> trust.lovable.dev </ExternalLink> . </li>
            <li>
              <strong> Transferts internationaux : </strong> Lovable peut transférer des données personnelles aux États-Unis. Lovable garantit ces transferts au moyen des clauses contractuelles types de l’UE (module 2, responsable du traitement vers sous-traitant), appliquées aux transferts depuis la Suisse, et de l’avenant britannique relatif aux transferts internationaux de données. </li>
            <li>
              <strong> Conservation des données : </strong> Lovable conserve les données de journalisation aussi longtemps que nécessaire à la sécurité et au fonctionnement de la plateforme ; les données clients sont supprimées dans les 30 jours suivant la résiliation du compte. </li>
            <li>
              <strong> Sécurité : </strong> Centres de données certifiés SOC 2 Type II et ISO 27001, contrôles d’accès fondés sur les rôles, authentification multifacteur, chiffrement des données en transit et au repos, sauvegardes continues, réponse aux incidents 24 h/24 et 7 j/7. </li>
            <li>
              <strong> Cookies sur la plateforme Lovable : </strong> Lovable utilise des cookies sur sa propre plateforme (PostHog, Google Analytics, TikTok, Facebook/Meta, Google Ads). Ils concernent uniquement les administrateurs du site utilisant l’éditeur Lovable et ne sont pas déposés pour les visiteurs de coachingfederation.ch. </li>
          </ul>
          <p className="text-foreground/80"> Nous utilisons l’ <strong> offre Business </strong> de Lovable, qui comprend un contrat de sous-traitance (DPA) avec Lovable. Nous avons examiné la liste complète des sous-traitants ultérieurs de Lovable à l’adresse{" "} <ExternalLink href="https://trust.lovable.dev"> trust.lovable.dev </ExternalLink> et vérifié qu’elle correspond à nos besoins de traitement des données. </p>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight"> c) Prestataires de messagerie et de communication </h4>
          <p className="text-foreground/80"> Nous utilisons <strong> MailerLite </strong> (MailerLite Ltd, Lituanie) pour envoyer notre newsletter et nos courriels transactionnels. MailerLite traite les données sur des serveurs situés dans l’Union européenne (Allemagne) et fournit un avenant relatif au traitement des données ; l’UE/EEE est reconnue comme assurant un niveau de protection des données adéquat en droit suisse. </p>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight"> d) Prestataires d’analyse </h4>
          <p className="text-foreground/80"> Nous n’utilisons aucun outil d’analyse ou de suivi. </p>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight"> e) ICF Global </h4>
          <p className="text-foreground/80"> Nous recevons des données de membres d’ICF Global au moyen d’une synchronisation nocturne automatisée ; nous ne renvoyons aucune donnée de profil. Ces données sont traitées par ICF Global aux États-Unis, où les dossiers des membres sont administrés par sa société de gestion associative, Associations International (Lexington, Kentucky, États-Unis). Le transfert est régi par notre Chapter Agreement et notre API Agreement avec ICF Global. </p>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight"> f) Prestataires de paiement (le cas échéant) </h4>
          <p className="text-foreground/80"> Les paiements des inscriptions aux événements sont traités par <strong> Stripe </strong> (Stripe, Inc., société américaine). Stripe est également un sous-traitant ultérieur de Lovable pour la propre facturation de Lovable. Les données de paiement sont traitées par Stripe conformément à son contrat de sous-traitance, les transferts étant couverts par des clauses contractuelles types. </p>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight"> g) Accès interne </h4>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li> Membres du comité de The Switzerland Chapter of ICF </li>
            <li> Personnel et bénévoles autorisés disposant d’un accès au CMS et aux outils d’administration des membres </li>
            <li> Les accès sont accordés selon les rôles et le besoin d’en connaître </li>
          </ul>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight"> h) Autres services tiers </h4>
          <p className="text-foreground/80"> Les polices sont hébergées sur notre propre infrastructure (Quicksand pour les titres, Plus Jakarta Sans pour le corps du texte) ; aucune requête externe de police n’est effectuée. </p>
          <p className="text-foreground/80"> Les services tiers suivants sont utilisés sur le site internet : </p>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li>
              <strong> Google Maps </strong> (Google LLC, États-Unis) : affiche des cartes sur les pages des événements. Lors du chargement d’une carte, votre adresse IP est transmise à Google. </li>
            <li>
              <strong> Unsplash </strong> (Unsplash Inc., États-Unis) : utilisé uniquement par le personnel dans le sélecteur d’images du CMS ; aucune donnée de visiteur n’est transmise. </li>
            <li>
              <strong> OpenAI </strong> (via Lovable AI Gateway, États-Unis) : traite les conversations avec l’assistant IA sur la page de présentation (voir la section 3b). </li>
          </ul>
          <p className="text-foreground/80"> Nous n’utilisons ni vidéos intégrées, ni contenus ou modules de réseaux sociaux intégrés, ni CAPTCHA ou protection contre les robots, ni pixels de suivi dans la newsletter. </p>
          <p className="text-foreground/80"> Nous ne vendons aucune donnée personnelle à des tiers. </p>
        </div>
      </div>
    </>
  );
}
