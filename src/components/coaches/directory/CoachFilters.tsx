/**
 * Filter chip/tab primitives and the sidebar filter panel for the Coach
 * Finder: free-text search, region/language selects, facet chips and the
 * accepting-only toggle. Mode switching lives here too (`ModeTabs`).
 */
import { CARD_SHADOW } from "@/components/site-chrome";
import { useI18n } from "@/i18n";
import type { FinderMode, VocabRow } from "@/lib/vocabularies";

export function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={
        "inline-flex min-h-11 items-center rounded-full border px-4 text-xs font-semibold transition sm:min-h-8 " +
        (active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground")
      }
    >
      {children}
    </button>
  );
}

export const FIELD =
  "h-10 w-full rounded-full border border-border bg-card px-4 text-sm text-foreground outline-none transition focus:border-primary";

/**
 * Segmented mode switcher. Rendered only when settings enable more than one
 * finder mode; labels come from `coach_finder_config`, never from a hardcoded
 * list in this file.
 */
export function ModeTabs({
  modes,
  value,
  onChange,
  ariaLabel,
}: {
  modes: FinderMode[];
  value: string;
  onChange: (slug: string) => void;
  ariaLabel: string;
}) {
  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const index = modes.findIndex((m) => m.slug === value);
    const next = modes[(index + delta + modes.length) % modes.length];
    if (next) onChange(next.slug);
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={
        "inline-flex flex-wrap gap-1 rounded-full border border-border/70 bg-card p-1 " +
        CARD_SHADOW
      }
    >
      {modes.map((mode) => {
        const active = mode.slug === value;
        return (
          <button
            key={mode.slug}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(mode.slug)}
            className={
              "inline-flex min-h-10 items-center rounded-full px-5 text-sm font-semibold transition " +
              (active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}

export function CoachFilters({
  query,
  setQuery,
  region,
  setRegion,
  language,
  setLanguage,
  regions,
  languages,
  credentialTerms,
  specialisationTerms,
  formatTerms,
  credentials,
  setCredentials,
  specializations,
  setSpecializations,
  formats,
  setFormats,
  acceptingOnly,
  setAcceptingOnly,
  actcOnly,
  setActcOnly,
  label,
  toggle,
  setPage,
}: {
  query: string;
  setQuery: (v: string) => void;
  region: string;
  setRegion: (v: string) => void;
  language: string;
  setLanguage: (v: string) => void;
  regions: VocabRow[];
  languages: VocabRow[];
  credentialTerms: VocabRow[];
  specialisationTerms: VocabRow[];
  formatTerms: VocabRow[];
  credentials: string[];
  setCredentials: (v: string[]) => void;
  specializations: string[];
  setSpecializations: (v: string[]) => void;
  formats: string[];
  setFormats: (v: string[]) => void;
  acceptingOnly: boolean;
  setAcceptingOnly: (v: boolean) => void;
  actcOnly: boolean;
  setActcOnly: (v: boolean) => void;
  label: (row: VocabRow) => string;
  toggle: (list: string[], set: (v: string[]) => void, value: string) => void;
  setPage: (v: number) => void;
}) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <label htmlFor="coach-search" className="btn-mono mb-2 block">
          {t("directory.filters.searchLabel")}
        </label>
        <input
          id="coach-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("directory.filters.searchPlaceholder")}
          className={FIELD}
        />
      </div>

      <div>
        <label htmlFor="coach-region" className="btn-mono mb-2 block">
          {t("directory.filters.regionLabel")}
        </label>
        <select
          id="coach-region"
          value={region}
          onChange={(e) => {
            setPage(0);
            setRegion(e.target.value);
          }}
          className={FIELD}
        >
          <option value="all">{t("directory.filters.regionAll")}</option>
          {regions.map((r) => (
            <option key={r.id} value={r.slug}>
              {label(r)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="coach-language" className="btn-mono mb-2 block">
          {t("directory.filters.languageLabel")}
        </label>
        <select
          id="coach-language"
          value={language}
          onChange={(e) => {
            setPage(0);
            setLanguage(e.target.value);
          }}
          className={FIELD}
        >
          <option value="all">{t("directory.filters.languageAll")}</option>
          {languages.map((l) => (
            <option key={l.id} value={l.slug}>
              {label(l)}
            </option>
          ))}
        </select>
      </div>

      {credentialTerms.length > 0 && (
        <div>
          <p className="btn-mono mb-2">{t("directory.filters.credentialLabel")}</p>
          <div className="flex flex-wrap gap-2">
            {credentialTerms.map((c) => (
              <Chip
                key={c.id}
                active={credentials.includes(c.slug)}
                onClick={() => toggle(credentials, setCredentials, c.slug)}
              >
                {c.slug}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {specialisationTerms.length > 0 && (
        <div>
          <p className="btn-mono mb-2">{t("directory.filters.specializationLabel")}</p>
          <div className="flex flex-wrap gap-2">
            {specialisationTerms.map((s) => (
              <Chip
                key={s.id}
                active={specializations.includes(s.slug)}
                onClick={() => toggle(specializations, setSpecializations, s.slug)}
              >
                {label(s)}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {formatTerms.length > 0 && (
        <div>
          <p className="btn-mono mb-2">{t("directory.filters.formatLabel")}</p>
          <div className="flex flex-wrap gap-2">
            {formatTerms.map((f) => (
              <Chip
                key={f.id}
                active={formats.includes(f.slug)}
                onClick={() => toggle(formats, setFormats, f.slug)}
              >
                {label(f)}
              </Chip>
            ))}
          </div>
        </div>
      )}

      <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm text-foreground">
        <input
          type="checkbox"
          checked={acceptingOnly}
          onChange={(e) => setAcceptingOnly(e.target.checked)}
          className="h-4 w-4 accent-[var(--color-primary)]"
        />
        {t("directory.filters.acceptingLabel")}
      </label>

      <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm text-foreground">
        <input
          type="checkbox"
          checked={actcOnly}
          onChange={(e) => {
            setActcOnly(e.target.checked);
            setPage(0);
          }}
          className="h-4 w-4 accent-[var(--color-primary)]"
        />
        {t("directory.filters.actcLabel")}
      </label>

      <div className={"rounded-2xl border border-border bg-background p-5 " + CARD_SHADOW}>
        <p className="text-sm font-bold text-foreground">{t("directory.note.title")}</p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {t("directory.note.body")}
        </p>
      </div>
    </div>
  );
}
