/**
 * DEIB commitment section for the About page. Highlights the chapter's
 * Diversity, Equity, Inclusion and Belonging work with a yellow accent
 * and a list of concrete approach items.
 */
import { Check } from "lucide-react";
import { Mark } from "@/components/marks";
import { useI18n } from "@/i18n";

export function DeibCommitment() {
  const { t, tList } = useI18n();
  const items = tList<string>("about.deib.approachItems");

  return (
    <section className="bg-background py-24">
      <div className="mx-auto max-w-7xl px-8">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:items-start">
          <div>
            <p className="eyebrow">{t("about.deib.eyebrow")}</p>
            <h2 className="mt-3 display-lg">{t("about.deib.title")}</h2>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
              {t("about.deib.intro")}
            </p>
          </div>
          <div className="relative grid min-h-[16rem] place-items-center rounded-2xl border border-border/70 bg-card p-8">
            <Mark name="asterisk2" className="h-32 w-32 text-mark-yellow" />
          </div>
        </div>

        <div className="mt-16">
          <h3 className="text-xl font-semibold tracking-tight text-foreground">
            {t("about.deib.approachTitle")}
          </h3>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <li
                key={item}
                className="rounded-2xl border border-border/70 bg-card p-6 shadow-soft"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                    <Check className="h-3 w-3" />
                  </span>
                  <span className="text-sm leading-relaxed text-foreground">{item}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
