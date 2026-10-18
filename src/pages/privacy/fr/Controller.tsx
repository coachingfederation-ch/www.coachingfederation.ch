import { ExternalLink, MailLink } from "../shared";

export function ControllerSection() {
  return (
    <>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold tracking-tight"> 1. Qui est responsable ? </h3>
        <p className="text-foreground/80"> Le responsable du traitement des données personnelles sur ce site internet est : </p>
        <div className="space-y-2 text-foreground/80">
          <p className="font-semibold text-foreground"> The Switzerland Chapter of ICF </p>
          <p> Association de droit suisse </p>
          <p> IDE : CHE-205.048.647 </p>
        </div>
        <address className="not-italic text-foreground/80"> Weitegasse 6 <br /> 9320 Arbon <br /> Suisse </address>
        <p className="text-foreground/80"> Courriel : <MailLink address="office@coachingfederation.ch" />
        </p>
        <p className="text-foreground/80"> Pour toute question relative à la protection des données, vous pouvez nous contacter à l’adresse électronique ci-dessus. </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold tracking-tight"> 2. Quel est l’objet de la présente politique de confidentialité ? </h3>
        <p className="text-foreground/80"> La présente politique de confidentialité décrit la manière dont The Switzerland Chapter of ICF (&quot;nous&quot;, &quot;l’association&quot;) traite les données personnelles sur le site internet suivant et en lien avec celui-ci :{" "} <ExternalLink href="https://www.coachingfederation.ch"> www.coachingfederation.ch </ExternalLink> . Elle s’applique aux éléments suivants : </p>
        <ul className="list-disc space-y-1 pl-5 text-foreground/80">
          <li>
            <strong> Site internet public </strong> : page d’accueil, liste des événements, blog (&quot;Insights&quot;), pages de présentation, annuaire des coachs </li>
          <li>
            <strong> Annuaire des coachs </strong> (&quot;Find a Coach&quot;) : profils publics des membres ICF </li>
          <li>
            <strong> Espace membres </strong> : espace dans lequel les membres gèrent leur profil dans l’annuaire et leur compte </li>
          <li>
            <strong> Outils du personnel </strong> : CMS, administration des membres et commandes d’intégration ICF </li>
          <li>
            <strong> Newsletter et communications </strong> : abonnements par courriel via le site internet </li>
          <li>
            <strong> Formulaires de contact et d’inscription aux événements </strong> : formulaires permettant de transmettre des données personnelles </li>
        </ul>
        <p className="text-foreground/80"> La présente politique de confidentialité est rédigée conformément à la loi fédérale suisse sur la protection des données (LPD, RS 235.1). Lorsque le traitement concerne également des personnes dans l’Espace économique européen, le règlement général sur la protection des données (RGPD) peut en outre s’appliquer. </p>
      </div>
    </>
  );
}
