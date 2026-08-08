/**
 * Lead capture form and file downloader for the organisational partnership deck.
 * Exports: DeckDownload. Consumed by the DeckSection carousel.
 */
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useI18n } from "@/i18n";
import { recordDeckDownload } from "@/lib/deck-download.functions";
import { trackGoal } from "@/lib/plausible";
import deckEn from "@/assets/deck/deck-en.pdf.asset.json";
import deckDe from "@/assets/deck/deck-de.pdf.asset.json";
import deckFr from "@/assets/deck/deck-fr.pdf.asset.json";
import deckIt from "@/assets/deck/deck-it.pdf.asset.json";

const DECKS: Record<string, { url: string; original_filename: string }> = {
  en: deckEn,
  de: deckDe,
  fr: deckFr,
  it: deckIt,
};

export function DeckDownload() {
  const { t, locale } = useI18n();
  const record = useServerFn(recordDeckDownload);
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const deck = DECKS[locale] ?? DECKS.en;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const value = email.trim();
    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      setError(t("organisations.deck.download.invalidEmail"));
      return;
    }
    try {
      await record({
        data: { locale: locale as "en", email: value, consent: Boolean(value), website },
      });
    } catch {
      // Never block the download on tracking failure.
    }
    trackGoal("Deck Download", { locale });
    const a = document.createElement("a");
    a.href = deck.url;
    a.download = deck.original_filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setDone(true);
  }

  return (
    <div className="mt-10 rounded-2xl border border-accent/40 bg-card p-6 shadow-lg md:p-8">
      {done ? (
        <div className="flex flex-col gap-2">
          <p className="text-lg font-semibold tracking-tight">
            {t("organisations.deck.download.doneTitle")}
          </p>
          <p className="text-sm text-foreground/80">
            {t("organisations.deck.download.doneBody")}
          </p>
          <a
            href={deck.url}
            download={deck.original_filename}
            className="mt-2 text-sm font-semibold text-primary underline underline-offset-4"
          >
            {t("organisations.deck.download.again")}
          </a>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="eyebrow">{t("organisations.deck.download.eyebrow")}</p>
            <h3 className="mt-2 text-xl font-bold tracking-tight md:text-2xl">
              {t("organisations.deck.download.title")}
            </h3>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-foreground/80">
              {t("organisations.deck.download.body")}
            </p>
          </div>
          <form onSubmit={onSubmit} className="flex w-full flex-col gap-3 md:w-auto">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-foreground/70">
                {t("organisations.deck.download.emailLabel")}
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("organisations.deck.download.emailPlaceholder")}
                className="h-11 w-full rounded-full border border-foreground/25 bg-background px-4 text-sm text-foreground placeholder:text-foreground/50 outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 md:w-72"
              />
            </label>
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="hidden"
            />
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              {t("organisations.deck.download.cta")}
            </button>
            <p className="text-xs text-foreground/70">{t("organisations.deck.download.note")}</p>
          </form>
        </div>
      )}
    </div>
  );
}
