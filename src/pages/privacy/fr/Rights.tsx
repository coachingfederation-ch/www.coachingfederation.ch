import { ExternalLink, MailLink } from "../shared";

export function RightsSection() {
  return (
    <>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold tracking-tight"> 9. Quels sont vos droits en matière de protection des données ? </h3>
        <p className="text-foreground/80"> En vertu de la loi fédérale sur la protection des données (LPD), vous disposez des droits suivants concernant vos données personnelles : </p>
        <ul className="list-disc space-y-2 pl-5 text-foreground/80">
          <li>
            <strong> Droit d’accès </strong> : vous pouvez demander si nous traitons des données personnelles vous concernant et, le cas échéant, lesquelles (art. 25 LPD). </li>
          <li>
            <strong> Droit de rectification </strong> : vous pouvez demander la rectification de données personnelles inexactes ou incomplètes (art. 32 LPD). </li>
          <li>
            <strong> Droit à l’effacement </strong> : vous pouvez demander la suppression de vos données personnelles, sous réserve des obligations légales de conservation et d’autres exceptions (art. 32 LPD). </li>
          <li>
            <strong> Droit d’opposition </strong> : vous pouvez vous opposer au traitement de vos données personnelles dans certaines circonstances, notamment lorsque le traitement repose sur un intérêt prépondérant (art. 31 LPD) ou, lorsque le RGPD s’applique, sur des intérêts légitimes (art. 21 RGPD). </li>
          <li>
            <strong> Droit à la portabilité des données </strong> : vous pouvez demander que nous vous remettions vos données personnelles dans un format structuré, couramment utilisé et lisible par machine (art. 28 LPD). </li>
          <li>
            <strong> Droit de retirer votre consentement </strong> : lorsque le traitement repose sur votre consentement, vous pouvez le retirer à tout moment. Ce retrait ne remet pas en cause la licéité du traitement effectué avant celui-ci. </li>
          <li>
            <strong> Droit de déposer une plainte </strong> : vous avez le droit de déposer une plainte auprès du Préposé fédéral à la protection des données et à la transparence (PFPDT / EDÖB) : </li>
        </ul>
        <div className="rounded-2xl border border-border/70 bg-card p-6 text-foreground/80">
          <p className="font-semibold text-foreground"> Eidgenössischer Datenschutz- und Öffentlichkeitsbeauftragter (EDÖB) </p>
          <p className="mt-2"> Feldeggweg 1 </p>
          <p> 3003 Bern </p>
          <p> Suisse </p>
          <p className="mt-2"> Site internet :{" "} <ExternalLink href="https://www.edoeb.admin.ch"> www.edoeb.admin.ch </ExternalLink>
          </p>
        </div>
        <p className="text-foreground/80"> Pour exercer l’un de ces droits, veuillez nous contacter à l’adresse{" "} <MailLink address="office@coachingfederation.ch" /> . Nous répondrons à votre demande dans un délai de 30 jours. Dans les cas complexes, ce délai peut être prolongé ; nous vous informerons de toute prolongation et de ses motifs. </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold tracking-tight"> 10. Décisions individuelles automatisées </h3>
        <p className="text-foreground/80"> Nous ne prenons aucune décision fondée exclusivement sur un traitement automatisé produisant des effets juridiques à votre égard ou vous affectant de manière significative (art. 21 LPD). En particulier : </p>
        <ul className="list-disc space-y-1 pl-5 text-foreground/80">
          <li> La recherche et le filtrage dans l’annuaire des coachs aident les visiteurs à trouver des coachs ; ils ne prennent aucune décision automatisée concernant des personnes. </li>
          <li> La création des comptes membres et la gestion des profils font l’objet d’une supervision humaine. </li>
          <li> Aucun profilage produisant des effets juridiques ou des effets similaires significatifs à votre égard n’est effectué. </li>
        </ul>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold tracking-tight"> 11. Comment protégeons-nous vos données ? </h3>
        <p className="text-foreground/80"> Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger les données personnelles contre tout accès non autorisé, perte, destruction ou modification. Ces mesures comprennent : </p>
        <ul className="list-disc space-y-1 pl-5 text-foreground/80">
          <li> Transmission chiffrée des données (TLS/SSL) </li>
          <li> Contrôles d’accès fondés sur les rôles et authentification </li>
          <li> Examens réguliers de la sécurité de nos systèmes </li>
          <li> Stockage des données dans une base de données gérée avec des règles de sécurité au niveau des lignes </li>
          <li> Hébergement des données sur une infrastructure certifiée SOC 2 Type II et ISO 27001 fournie par notre plateforme d’hébergement (voir la section 5b) </li>
        </ul>
        <p className="text-foreground/80"> En cas de violation de la sécurité des données susceptible d’entraîner un risque élevé pour vos droits et libertés, nous en informerons le PFPDT (EDÖB) dans les meilleurs délais, conformément à l’art. 24 LPD. </p>
      </div>
    </>
  );
}
