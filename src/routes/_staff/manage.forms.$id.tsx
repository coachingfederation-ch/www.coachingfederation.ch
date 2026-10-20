/**
 * Builder for one library form (/manage/forms/:id). Events copy from it, so
 * saving here never changes an event that already uses the form.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Badge } from "@/design-system/icf-welcome-design-system-a835df";
import { Shell } from "@/components/cms/Shell";
import { FormBuilder } from "@/components/forms/FormBuilder";
import {
  copyQuestionsFrom,
  copySourcesFor,
  loadTemplateAsForm,
  templateQuestions,
} from "@/components/forms/form-actions";
import { requireStaffAccess, EVENT_ROLES } from "@/lib/staff-guard";
import { useCms } from "@/i18n/cms";
import { saveFormTemplate } from "@/lib/forms.functions";
import type { BuilderForm } from "@/lib/forms/builder-state";

export const Route = createFileRoute("/_staff/manage/forms/$id")({
  beforeLoad: ({ context }) => requireStaffAccess(context.queryClient, EVENT_ROLES),
  head: () => ({
    meta: [
      { title: "Edit library form — The Switzerland Chapter of ICF CMS" },
      { name: "description", content: "Build a reusable form for events." },
      { property: "og:title", content: "Edit library form — The Switzerland Chapter of ICF CMS" },
      { property: "og:description", content: "Build a reusable form for events." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LibraryFormPage,
});

function LibraryFormPage() {
  const { id } = Route.useParams();
  const { t } = useCms();
  const [loaded, setLoaded] = useState<{
    kind: "registration" | "follow_up";
    form: BuilderForm;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTemplateAsForm(id)
      .then(setLoaded)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [id]);

  return (
    <Shell>
      <div className="mx-auto max-w-6xl px-6 py-8">
        <Link to="/manage/forms" className="text-sm font-semibold text-primary">
          ← {t("forms.backToLibrary")}
        </Link>
        {error ? <p className="mt-6 text-sm text-destructive">{error}</p> : null}
        {!loaded && !error ? (
          <p className="mt-6 text-sm text-muted-foreground">{t("forms.loading")}</p>
        ) : null}
        {loaded ? (
          <>
            <div className="mb-6 mt-3 flex flex-wrap items-center gap-3">
              <h1 className="font-heading text-2xl font-normal">{loaded.form.name}</h1>
              <Badge variant="secondary">
                {loaded.kind === "registration"
                  ? t("events.forms.kindRegistration")
                  : t("events.forms.kindFollowUp")}
              </Badge>
              <span className="text-xs text-muted-foreground">{t("forms.libraryEditHint")}</span>
            </div>
            <FormBuilder
              kind={loaded.kind}
              initial={loaded.form}
              scope="template"
              onSave={async (form) => {
                await saveFormTemplate({
                  data: {
                    id,
                    name: form.name,
                    intro: form.intro || null,
                    thank_you: form.thankYou || null,
                    questions: templateQuestions(form.questions),
                  },
                });
              }}
              copySources={async () =>
                (await copySourcesFor(null, t("forms.library"))).filter(
                  (s) => s.id !== `tpl:${id}`,
                )
              }
              copyFrom={copyQuestionsFrom}
              t={t}
            />
          </>
        ) : null}
      </div>
    </Shell>
  );
}
