/**
 * Chrome around the event editor: the Deep Blue stage header with its
 * lifecycle stepper, the section list beside the panels, and the save bar that
 * stays on screen. Presentation only — every action is handed in by the route.
 */
import * as React from "react";
import { Button } from "@/design-system/icf-welcome-design-system-a835df";
import { EVENT_STAGES, type EventStage } from "@/lib/event-editor-stages";

export type EditorSection = { id: string; label: string };

/**
 * Deep Blue band: where the event stands, what it is called, the stepper, and
 * the actions that change its published state.
 */
export function EventStageHeader({
  title,
  statusLabel,
  stage,
  onStage,
  onBack,
  backLabel,
  previewHref,
  previewLabel,
  actions,
  t,
}: {
  title: string;
  statusLabel: string;
  stage: EventStage;
  onStage: (next: EventStage) => void;
  onBack: () => void;
  backLabel: string;
  previewHref: string | null;
  previewLabel: string;
  actions?: React.ReactNode;
  t: (k: string) => string;
}) {
  return (
    <header className="sticky top-0 z-30 bg-hero px-6 pb-4 pt-6 text-hero-foreground sm:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <button onClick={onBack} className="eyebrow eyebrow-accent hover:underline">
              ← {backLabel}
            </button>
            <h1 className="mt-1 truncate font-heading text-2xl font-normal">{title}</h1>
            <p className="mt-1 text-xs text-hero-foreground/70">{statusLabel}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {previewHref ? (
              <Button variant="inverse-ghost" size="pill" asChild>
                <a href={previewHref} target="_blank" rel="noopener noreferrer">
                  {previewLabel}
                </a>
              </Button>
            ) : null}
            {actions}
          </div>
        </div>

        <nav
          aria-label={t("events.stage.navLabel")}
          className="mt-6 flex gap-2 overflow-x-auto pb-1"
        >
          {EVENT_STAGES.map((item, index) => {
            const active = item === stage;
            return (
              <button
                key={item}
                type="button"
                onClick={() => onStage(item)}
                aria-current={active ? "step" : undefined}
                className={
                  "flex min-w-24 flex-1 flex-col items-center gap-1 rounded-2xl px-3 py-2 transition " +
                  (active ? "bg-primary-foreground/10" : "hover:bg-primary-foreground/5")
                }
              >
                <span
                  className={
                    "grid size-8 place-items-center rounded-full text-sm font-bold " +
                    (active
                      ? "bg-accent text-accent-foreground"
                      : "bg-primary-foreground/20 text-hero-foreground")
                  }
                >
                  {index + 1}
                </span>
                <span
                  className={
                    "whitespace-nowrap text-xs " +
                    (active ? "font-bold" : "font-medium text-hero-foreground/70")
                  }
                >
                  {t(`events.stage.${item}`)}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

/** The panels of the current stage, plus the extras toggles beneath them. */
export function EventStageNav({
  sections,
  extras,
  title,
  extrasTitle,
}: {
  sections: EditorSection[];
  extras?: React.ReactNode;
  title: string;
  extrasTitle: string;
}) {
  return (
    <>
      {/* Narrow screens get a jump list instead of a rail. */}
      <div className="lg:hidden">
        <label className="block">
          <span className="eyebrow block text-muted-foreground">{title}</span>
          <select
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value=""
            onChange={(e) => {
              const target = document.getElementById(e.target.value);
              target?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            <option value="">{title}</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        {extras ? <div className="mt-3">{extras}</div> : null}
      </div>

      <nav className="sticky top-56 hidden self-start lg:block">
        <p className="eyebrow mb-2 px-3 text-muted-foreground">{title}</p>
        <ul className="space-y-1">
          {sections.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="block rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-card hover:text-foreground"
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
        {extras ? (
          <div className="mt-4 border-t border-border pt-4">
            <p className="eyebrow mb-2 px-3 text-muted-foreground">{extrasTitle}</p>
            {extras}
          </div>
        ) : null}
      </nav>
    </>
  );
}

/** Sticky footer: state of the form and the one primary save. */
export function EventSaveBar({
  dirty,
  saving,
  onSave,
  onDiscard,
  t,
}: {
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
  t: (k: string) => string;
}) {
  return (
    <div className="sticky bottom-0 z-30 border-t border-border bg-card px-6 py-3 shadow-soft sm:px-10">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            {dirty ? t("events.editor.unsaved") : t("events.editor.saved")}
          </p>
          <p className="text-xs text-muted-foreground">{t("events.editor.autoSavedNote")}</p>
        </div>
        <div className="flex items-center gap-2">
          {dirty ? (
            <Button variant="outline" size="pill" onClick={onDiscard} disabled={saving}>
              {t("events.editor.discard")}
            </Button>
          ) : null}
          <Button size="pill" onClick={onSave} disabled={saving || !dirty}>
            {saving ? t("events.saving") : t("events.save")}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Shown when a stage has nothing to show yet, instead of an empty column. */
export function EventStageEmpty({ text }: { text: string }) {
  return (
    <p className="mt-6 rounded-2xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
      {text}
    </p>
  );
}
