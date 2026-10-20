/**
 * Builder for one event's form (/manage/events/:id/forms/:formId/edit).
 * The form belongs to this event alone; "Save to library" copies it out.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/design-system/icf-welcome-design-system-a835df";
import { Shell } from "@/components/cms/Shell";
import { FormBuilder } from "@/components/forms/FormBuilder";
import {
  copyQuestionsFrom,
  copySourcesFor,
  saveEventFormAsTemplateSafe,
  saveEventFormFromBuilder,
} from "@/components/forms/event-form-page";
import { requireStaffAccess, EVENT_ROLES } from "@/lib/staff-guard";
import { useCms } from "@/i18n/cms";
import { deleteEventForm, getEventForm } from "@/lib/event-forms.functions";
import { formFromEventRow, type BuilderForm } from "@/lib/forms/builder-state";

export const Route = createFileRoute("/_staff/manage/events/$id_/forms/$formId_/edit")({
  beforeLoad: ({ context }) => requireStaffAccess(context.queryClient, EVENT_ROLES),
  head: () => ({
    meta: [
      { title: "Edit form — The Switzerland Chapter of ICF CMS" },
      { name: "description", content: "Build the questions for one event form." },
      { property: "og:title", content: "Edit form — The Switzerland Chapter of ICF CMS" },
      { property: "og:description", content: "Build the questions for one event form." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EventFormBuilderPage,
});

function EventFormBuilderPage() {
  const { id, formId } = Route.useParams();
  const { t } = useCms();
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState<{
    kind: "registration" | "follow_up";
    form: BuilderForm;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const lastSaved = useRef<BuilderForm | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const { form, questions } = (await getEventForm({ data: { formId } })) as unknown as {
          form: Record<string, unknown>;
          questions: Record<string, unknown>[];
        };
        const built = formFromEventRow(form, questions);
        lastSaved.current = built;
        setLoaded({ kind: form["kind"] as "registration" | "follow_up", form: built });
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [formId]);

  return (
    <Shell>
      <div className="mx-auto max-w-6xl px-6 py-8">
        <Link
          to="/manage/events/$id"
          params={{ id }}
          className="text-sm font-semibold text-primary"
        >
          ← {t("events.forms.backToEvent")}
        </Link>

        {error ? <p className="mt-6 text-sm text-destructive">{error}</p> : null}
        {!loaded && !error ? (
          <p className="mt-6 text-sm text-muted-foreground">{t("forms.loading")}</p>
        ) : null}

        {loaded ? (
          <>
            <div className="mb-6 mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h1 className="font-heading text-2xl font-normal">{loaded.form.name}</h1>
                <Badge variant="secondary">
                  {loaded.kind === "registration"
                    ? t("events.forms.kindRegistration")
                    : t("events.forms.kindFollowUp")}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {notice ? <span className="text-xs text-muted-foreground">{notice}</span> : null}
                <Button variant="outline" size="sm" asChild>
                  <Link to="/manage/events/$id/forms/$formId" params={{ id, formId }}>
                    {t("events.forms.openResults")}
                  </Link>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label={t("forms.moreActions")}>
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onSelect={async () => {
                        if (!lastSaved.current) return;
                        const ok = await saveEventFormAsTemplateSafe(loaded.kind, lastSaved.current);
                        setNotice(ok ? t("forms.savedToLibrary") : t("forms.saveToLibraryFailed"));
                      }}
                    >
                      {t("forms.saveToLibrary")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onSelect={() => setConfirmDelete(true)}
                    >
                      {t("forms.detach")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <FormBuilder
              kind={loaded.kind}
              initial={loaded.form}
              scope="event"
              onSave={async (form) => {
                await saveEventFormFromBuilder(formId, form, loaded.kind);
                lastSaved.current = form;
              }}
              copySources={() => copySourcesFor(formId, t("forms.library"))}
              copyFrom={copyQuestionsFrom}
              t={t}
            />
          </>
        ) : null}
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("forms.detachTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("forms.detachBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("forms.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await deleteEventForm({ data: { formId } });
                  void navigate({ to: "/manage/events/$id", params: { id } });
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e));
                }
              }}
            >
              {t("forms.detach")}
            </AlertDialogAction>
          </AlertDialogContent>
        </AlertDialogFooter>
      </AlertDialog>
    </Shell>
  );
}
