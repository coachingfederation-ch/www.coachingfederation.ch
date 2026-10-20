/**
 * Custom forms for one event — the compact list in the event editor.
 *
 * Building happens in the Forms module's builder (its own page); this panel
 * only lists the event's forms and adds new ones, blank or copied from the
 * library. Each event keeps its own copy, so library edits never reach it.
 */
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
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
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/design-system/icf-welcome-design-system-a835df";
import { Section } from "./EventEditorSections";
import { KindChoice } from "@/components/forms/KindChoice";
import { addEventForm } from "@/components/forms/form-actions";
import { deleteEventForm, listEventForms } from "@/lib/event-forms.functions";
import { listFormTemplates, type FormTemplateRow } from "@/lib/forms.functions";

type Kind = "registration" | "follow_up";

type FormRow = {
  id: string;
  kind: Kind;
  name: string;
  is_active: boolean;
  question_count: number;
  sent_count: number;
  response_count: number;
};

const BLANK = "__blank__";

export function EventFormsSection({ eventId, t }: { eventId: string; t: (k: string) => string }) {
  const navigate = useNavigate();
  const [forms, setForms] = useState<FormRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [kind, setKind] = useState<Kind>("registration");
  const [templates, setTemplates] = useState<FormTemplateRow[]>([]);
  const [source, setSource] = useState(BLANK);
  const [busy, setBusy] = useState(false);
  const [toDetach, setToDetach] = useState<FormRow | null>(null);

  const load = useCallback(async () => {
    try {
      setForms((await listEventForms({ data: { eventId } })) as unknown as FormRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [eventId]);
  useEffect(() => void load(), [load]);

  const hasRegistration = (forms ?? []).some((f) => f.kind === "registration");

  const openAdd = () => {
    setKind(hasRegistration ? "follow_up" : "registration");
    setSource(BLANK);
    setAdding(true);
    void listFormTemplates()
      .then(setTemplates)
      .catch(() => setTemplates([]));
  };

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const tpl = templates.find((x) => x.id === source);
      const formId = await addEventForm({
        eventId,
        kind,
        name:
          tpl?.name ??
          (kind === "registration"
            ? t("events.forms.registrationName")
            : t("events.forms.followUpName")),
        templateId: tpl?.id ?? null,
      });
      void navigate({
        to: "/manage/events/$id/forms/$formId/edit",
        params: { id: eventId, formId },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  const matching = templates.filter((x) => x.kind === kind);

  return (
    <Section title={t("events.forms.title")} hint={t("events.forms.hint")}>
      {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}

      {forms === null ? (
        <p className="text-sm text-muted-foreground">{t("forms.loading")}</p>
      ) : forms.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("events.forms.empty")}</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {forms.map((form) => (
            <li key={form.id} className="flex flex-wrap items-center gap-3 p-3">
              <Badge variant="secondary">
                {form.kind === "registration"
                  ? t("events.forms.kindRegistration")
                  : t("events.forms.kindFollowUp")}
              </Badge>
              <span className="text-sm font-semibold">{form.name}</span>
              {!form.is_active ? <Badge variant="outline">{t("events.forms.inactive")}</Badge> : null}
              <span className="text-xs text-muted-foreground">
                {form.question_count} {t("events.forms.questionsLabel")}
                {form.kind === "follow_up"
                  ? ` · ${form.sent_count} ${t("events.forms.sentLabel")} · ${form.response_count} ${t("events.forms.responsesLabel")}`
                  : ""}
              </span>
              <div className="ml-auto flex items-center gap-2">
                <Button size="sm" asChild>
                  <Link
                    to="/manage/events/$id/forms/$formId/edit"
                    params={{ id: eventId, formId: form.id }}
                  >
                    {t("events.forms.edit")}
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link
                    to="/manage/events/$id/forms/$formId"
                    params={{ id: eventId, formId: form.id }}
                  >
                    {t("events.forms.openResults")}
                  </Link>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`${t("forms.moreActions")}: ${form.name}`}
                    >
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="text-destructive" onSelect={() => setToDetach(form)}>
                      {t("forms.detach")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4">
        <Button variant="outline" size="sm" onClick={openAdd}>
          <Plus />
          {t("forms.addForm")}
        </Button>
      </div>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("forms.addForm")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <KindChoice
              value={kind}
              onChange={(k) => {
                setKind(k);
                setSource(BLANK);
              }}
              disableRegistration={hasRegistration}
              t={t}
            />
            <div>
              <Label htmlFor="af-source">{t("forms.startFrom")}</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger id="af-source" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={BLANK}>{t("forms.blank")}</SelectItem>
                  {matching.map((tpl) => (
                    <SelectItem key={tpl.id} value={tpl.id}>
                      {t("forms.library")}: {tpl.name} ({tpl.question_count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {matching.length === 0 ? (
                <p className="mt-1 text-xs text-muted-foreground">{t("forms.noLibraryForKind")}</p>
              ) : null}
            </div>
          </div>
          <DialogFooter>
            <Button disabled={busy} onClick={() => void create()}>
              {t("forms.createAndOpen")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={toDetach !== null} onOpenChange={(o) => !o && setToDetach(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("forms.detachTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("forms.detachBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("forms.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!toDetach) return;
                try {
                  await deleteEventForm({ data: { formId: toDetach.id } });
                  setToDetach(null);
                  await load();
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e));
                  setToDetach(null);
                }
              }}
            >
              {t("forms.detach")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Section>
  );
}
