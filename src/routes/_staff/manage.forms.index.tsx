/**
 * Form library (/manage/forms): reusable forms that events copy from.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { MoreHorizontal, Plus } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/design-system/icf-welcome-design-system-a835df";
import { Shell } from "@/components/cms/Shell";
import { SurveyList } from "@/components/forms/SurveyList";
import { KindChoice } from "@/components/forms/KindChoice";
import { loadTemplateAsForm, saveFormAsTemplate } from "@/components/forms/form-actions";
import { requireStaffAccess, EVENT_ROLES } from "@/lib/staff-guard";
import { useCms } from "@/i18n/cms";
import {
  createFormTemplate,
  deleteFormTemplate,
  listFormTemplates,
  type FormTemplateRow,
} from "@/lib/forms.functions";

export const Route = createFileRoute("/_staff/manage/forms/")({
  validateSearch: (search: Record<string, unknown>): { tab?: "surveys" } =>
    search["tab"] === "surveys" ? { tab: "surveys" } : {},
  beforeLoad: ({ context }) => requireStaffAccess(context.queryClient, EVENT_ROLES),
  head: () => ({
    meta: [
      { title: "Forms — The Switzerland Chapter of ICF CMS" },
      { name: "description", content: "Reusable registration and follow-up forms for events." },
      { property: "og:title", content: "Forms — The Switzerland Chapter of ICF CMS" },
      {
        property: "og:description",
        content: "Reusable registration and follow-up forms for events.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FormLibraryPage,
});

type Kind = "registration" | "follow_up";

function FormLibraryPage() {
  const { t } = useCms();
  const navigate = useNavigate();
  const { tab } = Route.useSearch();
  const [rows, setRows] = useState<FormTemplateRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<Kind>("registration");
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState<FormTemplateRow | null>(null);

  const load = useCallback(async () => {
    try {
      setRows(await listFormTemplates());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);
  useEffect(() => void load(), [load]);

  const create = async () => {
    setBusy(true);
    try {
      const { id } = await createFormTemplate({ data: { kind, name, questions: [] } });
      void navigate({ to: "/manage/forms/$id", params: { id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  const duplicate = async (row: FormTemplateRow) => {
    try {
      const { kind: k, form } = await loadTemplateAsForm(row.id);
      await saveFormAsTemplate(k, { ...form, name: `${form.name} (${t("forms.copySuffix")})` });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Shell>
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-muted-foreground">{t("forms.library")}</p>
            <h1 className="mt-1 font-heading text-3xl font-normal">{t("forms.libraryTitle")}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("forms.libraryHint")}</p>
          </div>
        </div>

        <Tabs
          className="mt-8"
          value={tab ?? "library"}
          onValueChange={(v) =>
            void navigate({
              to: "/manage/forms",
              search: v === "surveys" ? { tab: "surveys" } : {},
            })
          }
        >
          <TabsList>
            <TabsTrigger value="library">{t("forms.surveys.tabLibrary")}</TabsTrigger>
            <TabsTrigger value="surveys">{t("forms.surveys.tabSurveys")}</TabsTrigger>
          </TabsList>
          <TabsContent value="surveys" className="mt-6">
            <SurveyList t={t} />
          </TabsContent>
          <TabsContent value="library" className="mt-6">
            <div className="flex justify-end">
              <Button size="pill" onClick={() => setCreating(true)}>
                <Plus />
                {t("forms.newForm")}
              </Button>
            </div>

            {error ? <p className="mt-6 text-sm text-destructive">{error}</p> : null}

            <div className="mt-6">
              {rows === null ? (
                <p className="text-sm text-muted-foreground">{t("forms.loading")}</p>
              ) : rows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
                  <p className="text-sm text-muted-foreground">{t("forms.libraryEmpty")}</p>
                </div>
              ) : (
                <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
                  {rows.map((row) => (
                    <li key={row.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <Link
                        to="/manage/forms/$id"
                        params={{ id: row.id }}
                        className="min-w-0 flex-1 font-semibold text-foreground hover:text-primary"
                      >
                        {row.name}
                      </Link>
                      <Badge variant="secondary">
                        {row.kind === "registration"
                          ? t("events.forms.kindRegistration")
                          : t("events.forms.kindFollowUp")}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {row.question_count} {t("events.forms.questionsLabel")} ·{" "}
                        {t("forms.usedBy")} {row.event_count}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`${t("forms.moreActions")}: ${row.name}`}
                          >
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => void duplicate(row)}>
                            {t("forms.duplicate")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onSelect={() => setToDelete(row)}
                          >
                            {t("forms.delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("forms.newForm")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="nf-name">{t("events.forms.name")}</Label>
              <Input
                id="nf-name"
                className="mt-1"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <KindChoice value={kind} onChange={setKind} t={t} />
          </div>
          <DialogFooter>
            <Button disabled={busy || name.trim().length < 2} onClick={() => void create()}>
              {t("forms.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={toDelete !== null} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("forms.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("forms.deleteBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("forms.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!toDelete) return;
                try {
                  await deleteFormTemplate({ data: { id: toDelete.id } });
                  setToDelete(null);
                  await load();
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e));
                }
              }}
            >
              {t("forms.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Shell>
  );
}
