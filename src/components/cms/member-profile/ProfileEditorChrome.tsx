/**
 * Layout chrome for the Member Area profile editor.
 *
 * The editor used to be one flat stack of fourteen identical cards with the
 * publish control only reachable at the very bottom. These primitives give it
 * the same shape as the rest of the Member Area: a Deep Blue header band with
 * the live publication state and the save/publish actions, a sticky list of
 * the profile's areas, and a small number of grouped cards.
 *
 * Consumed by MemberProfileEditor.tsx.
 */
import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/design-system/icf-welcome-design-system-a835df";

/**
 * Sections rendered inside a group drop their own card chrome — the group is
 * the card. Kept as context so the existing section components stay untouched.
 */
export const InProfileGroup = React.createContext(false);

export type ProfileGroupDef = { id: string; label: string };

export function ProfileEditorHeader({
  t,
  title,
  subtitle,
  visibility,
  publishBlocked,
  status,
  profileId,
  onSave,
}: {
  t: (key: string) => string;
  title: string;
  subtitle: string;
  visibility: string;
  publishBlocked: string | null;
  status: "idle" | "saving" | "saved";
  profileId: string | null;
  onSave: (visibility?: "draft" | "published") => void;
}) {
  const published = visibility === "published";
  return (
    <header className="rounded-3xl bg-hero p-6 text-hero-foreground shadow-soft md:p-10">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl sm:text-3xl md:text-4xl">{title}</h1>
          <p className="mt-2 max-w-xl text-sm text-hero-foreground/80">{subtitle}</p>
        </div>
        <div className="rounded-2xl border border-hero-foreground/20 bg-hero-foreground/10 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="eyebrow eyebrow-inverse">{t("member.publicationTitle")}</p>
              <p className="mt-1 flex items-center gap-2 text-sm font-semibold">
                <span
                  aria-hidden
                  className={
                    "inline-block h-2 w-2 shrink-0 rounded-full " +
                    (published ? "bg-accent" : "bg-highlight")
                  }
                />
                {t(`members.visibility.${visibility}`)}
              </p>
            </div>
            {published && profileId ? (
              <Button asChild variant="inverse-ghost" size="pill">
                <Link to="/coach/$profileId" params={{ profileId }} target="_blank">
                  {t("member.viewPublic")}
                </Link>
              </Button>
            ) : null}
          </div>
          {/* The same actions live in the mobile save bar, so they only need to
              be reachable here from lg upwards. */}
          <div className="mt-4 hidden flex-wrap gap-2 lg:flex">
            <Button
              type="button"
              variant="inverse-ghost"
              size="pill"
              disabled={status === "saving"}
              onClick={() => onSave()}
            >
              {status === "saving" ? t("member.saving") : t("member.save")}
            </Button>
            {published ? (
              <Button
                type="button"
                variant="inverse-ghost"
                size="pill"
                disabled={status === "saving"}
                onClick={() => onSave("draft")}
              >
                {t("member.unpublish")}
              </Button>
            ) : (
              <Button
                type="button"
                variant="inverse"
                size="pill"
                disabled={status === "saving" || Boolean(publishBlocked)}
                onClick={() => onSave("published")}
              >
                {t("member.publish")}
              </Button>
            )}
          </div>
          {publishBlocked ? (
            <p className="mt-3 text-xs text-hero-foreground/80">{publishBlocked}</p>
          ) : null}
          {status === "saved" ? (
            <p className="mt-3 text-xs text-hero-foreground/80">{t("member.saved")}</p>
          ) : null}
        </div>
      </div>
    </header>
  );
}

/**
 * In-page list of the profile's areas. Desktop keeps the sticky column; on
 * phones the same anchors become a sideways-scrolling chip row under the
 * header, so a member can jump between areas of a very long form.
 */
export function ProfileEditorNav({ groups, label }: { groups: ProfileGroupDef[]; label: string }) {
  return (
    <>
      <nav aria-label={label} className="sticky top-8 hidden flex-col gap-2 lg:flex">
        {groups.map((group) => (
          <a
            key={group.id}
            href={`#${group.id}`}
            className="rounded-2xl bg-card px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
          >
            {group.label}
          </a>
        ))}
      </nav>
      <nav
        aria-label={label}
        className="-mx-6 overflow-x-auto border-b border-border px-6 pb-3 lg:hidden"
      >
        <ul className="flex w-max list-none gap-2 p-0">
          {groups.map((group) => (
            <li key={group.id}>
              <a
                href={`#${group.id}`}
                className="inline-flex whitespace-nowrap rounded-full bg-card px-4 py-2 text-sm font-semibold text-foreground"
              >
                {group.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}

/**
 * Mobile-only save bar. The form is thousands of pixels tall on a phone, so
 * saving and publishing stay one tap away at the bottom of the screen.
 */
export function ProfileSaveBar({
  t,
  visibility,
  publishBlocked,
  status,
  onSave,
}: {
  t: (key: string) => string;
  visibility: string;
  publishBlocked: string | null;
  status: "idle" | "saving" | "saved";
  onSave: (visibility?: "draft" | "published") => void;
}) {
  const published = visibility === "published";
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-hero px-6 py-3 text-hero-foreground lg:hidden">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 text-xs text-hero-foreground/80">
          {status === "saving"
            ? t("member.saving")
            : status === "saved"
              ? t("member.saved")
              : t(`members.visibility.${visibility}`)}
        </p>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            type="button"
            variant="inverse-ghost"
            size="pill"
            disabled={status === "saving"}
            onClick={() => onSave()}
          >
            {t("member.save")}
          </Button>
          {published ? (
            <Button
              type="button"
              variant="inverse-ghost"
              size="pill"
              disabled={status === "saving"}
              onClick={() => onSave("draft")}
            >
              {t("member.unpublish")}
            </Button>
          ) : (
            <Button
              type="button"
              variant="inverse"
              size="pill"
              disabled={status === "saving" || Boolean(publishBlocked)}
              onClick={() => onSave("published")}
            >
              {t("member.publish")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProfileGroup({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <InProfileGroup.Provider value>
      <section
        id={id}
        className="scroll-mt-20 rounded-3xl border border-border bg-card p-6 shadow-soft md:p-8"
      >
        <div className="flex items-center gap-3">
          <span aria-hidden className="h-7 w-1.5 shrink-0 rounded-full bg-highlight" />
          <h2 className="font-heading text-xl text-foreground">{title}</h2>
        </div>
        <div className="mt-2">{children}</div>
      </section>
    </InProfileGroup.Provider>
  );
}
