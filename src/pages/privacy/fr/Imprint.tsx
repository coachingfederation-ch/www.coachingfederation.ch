import { ExternalLink, MailLink } from "../shared";

export function ImprintSection() {
  return (
    <>
      <section className="space-y-8">
        <h2 className="text-2xl font-bold tracking-tight"> Mentions légales </h2>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold tracking-tight"> Prestataire </h3>
          <div className="space-y-2 text-foreground/80">
            <p className="font-semibold text-foreground"> The Switzerland Chapter of ICF </p>
            <p> Forme juridique : association de droit suisse </p>
            <p> IDE : CHE-205.048.647 </p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold tracking-tight"> Adresse </h3>
          <address className="not-italic text-foreground/80"> Weitegasse 6 <br /> 9320 Arbon <br /> Suisse </address>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold tracking-tight"> Contact </h3>
          <div className="space-y-2 text-foreground/80">
            <p> Courriel : <MailLink address="office@coachingfederation.ch" />
            </p>
            <p> Site internet :{" "} <ExternalLink href="https://www.coachingfederation.ch"> www.coachingfederation.ch </ExternalLink>
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold tracking-tight"> Responsabilité du contenu </h3>
          <p className="text-foreground/80"> Le comité de The Switzerland Chapter of ICF est responsable du contenu de ce site internet conformément au droit suisse. </p>
          <p className="text-foreground/80"> Contact : <MailLink address="office@coachingfederation.ch" />
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold tracking-tight"> Responsabilité relative au contenu </h3>
          <p className="text-foreground/80"> Le contenu de ce site internet a été élaboré avec le plus grand soin. Toutefois, The Switzerland Chapter of ICF ne garantit ni l’exactitude, ni l’exhaustivité, ni l’actualité des informations fournies. Dans la mesure permise par le droit suisse, toute prétention en responsabilité à l’encontre de The Switzerland Chapter of ICF pour un dommage matériel ou immatériel résultant de l’utilisation ou de la non-utilisation des informations fournies ou de l’utilisation d’informations inexactes ou incomplètes est exclue. </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold tracking-tight"> Responsabilité relative aux liens </h3>
          <p className="text-foreground/80"> Ce site internet peut contenir des liens vers des sites internet externes de tiers sur le contenu desquels The Switzerland Chapter of ICF n’exerce aucune influence. The Switzerland Chapter of ICF décline par conséquent toute responsabilité quant au contenu des sites externes. Le prestataire ou l’exploitant du site lié demeure seul responsable de son contenu. </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold tracking-tight"> Droit d’auteur </h3>
          <p className="text-foreground/80"> Les contenus et œuvres publiés sur ce site internet, notamment les textes, images, graphiques et éléments de conception, sont soumis au droit suisse d’auteur. Toute reproduction, adaptation, diffusion ou utilisation commerciale du contenu au-delà de ce qu’autorise le droit d’auteur requiert le consentement écrit de The Switzerland Chapter of ICF ou, le cas échéant, du titulaire des droits concerné. </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold tracking-tight"> Droit applicable </h3>
          <p className="text-foreground/80"> Les présentes mentions légales et toutes les relations juridiques découlant de l’utilisation de ce site internet sont soumises au droit suisse. </p>
        </div>
      </section>
    </>
  );
}
