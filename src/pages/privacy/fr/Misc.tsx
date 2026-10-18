import { MailLink } from "../shared";

export function MiscSection() {
  return (
    <>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold tracking-tight"> 12. Données des enfants </h3>
        <p className="text-foreground/80"> Notre site internet ne s’adresse pas aux enfants de moins de 16 ans. Nous ne collectons pas sciemment de données personnelles concernant des enfants de moins de 16 ans. Si vous pensez que nous avons collecté des données personnelles concernant un enfant, veuillez nous contacter ; nous prendrons les mesures nécessaires pour supprimer ces données. </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold tracking-tight"> 13. Modifications de la présente politique de confidentialité </h3>
        <p className="text-foreground/80"> Nous pouvons mettre à jour la présente politique de confidentialité de temps à autre afin de tenir compte des changements de nos pratiques de traitement des données, des exigences légales ou des services que nous proposons. La version en vigueur sera toujours disponible sur cette page. Nous vous recommandons de la consulter périodiquement. </p>
        <p className="text-foreground/80"> La date de la dernière mise à jour figure au bas de cette page. </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold tracking-tight"> 14. Contact </h3>
        <p className="text-foreground/80"> Pour toute question concernant la présente politique de confidentialité ou nos pratiques de traitement des données, veuillez contacter : </p>
        <div className="rounded-2xl border border-border/70 bg-card p-6 text-foreground/80">
          <p className="font-semibold text-foreground"> The Switzerland Chapter of ICF </p>
          <p className="mt-2"> Weitegasse 6 </p>
          <p> 9320 Arbon </p>
          <p> Suisse </p>
          <p className="mt-2"> Courriel : <MailLink address="office@coachingfederation.ch" />
          </p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground"> Dernière mise à jour : 18 octobre 2026 </p>
    </>
  );
}
