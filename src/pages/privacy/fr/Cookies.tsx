import { InfoCallout } from "../shared";

export function CookiesSection() {
  return (
    <>
      <div className="space-y-6">
        <h3 className="text-lg font-semibold tracking-tight"> 8. Cookies et technologies similaires </h3>
        <p className="text-foreground/80"> Notre site internet ne dépose qu’un seul cookie techniquement nécessaire (__cf_bm), placé par notre réseau d’hébergement Cloudflare pour distinguer les véritables visiteurs des robots. Il ne contient aucun profil personnel, n’est pas utilisé à des fins de suivi et expire après 30 minutes. Nous ne déposons aucun cookie d’analyse, de marketing ou de suivi. </p>
        <p className="text-foreground/80"> Pour un petit nombre de fonctions techniques, nous utilisons le{" "} <strong> stockage local </strong> de votre navigateur (localStorage et sessionStorage) plutôt que des cookies : mémorisation de votre préférence linguistique, sauvegarde des brouillons pendant la rédaction (éditeur CMS, inscription aux événements), conservation de l’historique des conversations du module d’assistance et mémorisation des avis que vous avez fermés. Ces données restent dans votre navigateur. Nous n’utilisons pas ces technologies à des fins de suivi ou de publicité et ne recourons ni à la prise d’empreinte numérique ni à des techniques similaires. </p>
        <InfoCallout>
          <p> Comme nous utilisons uniquement un cookie de sécurité strictement nécessaire et aucune technologie de suivi ou de publicité, aucune bannière de consentement aux cookies n’est requise. Si cela devait changer, nous mettrions à jour la présente politique et mettrions en place un mécanisme de consentement. </p>
        </InfoCallout>

        <h4 className="text-base font-semibold tracking-tight"> Gestion des cookies et des données du site </h4>
        <p className="text-foreground/80"> Vous pouvez contrôler et supprimer les cookies et les données du site dans les paramètres de votre navigateur. </p>
      </div>
    </>
  );
}
