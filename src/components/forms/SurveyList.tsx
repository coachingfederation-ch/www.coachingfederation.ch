/** The "Surveys" tab of the Forms area: list, create (blank or from library), delete. */
import { Link, useNavigate } from "@tanstack/react-router";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/design-system/icf-welcome-design-system-a835df";
import { createSurvey, deleteSurvey, listSurveys, type SurveyRow } from "@/lib/surveys.functions";
import { listFormTemplates, type FormTemplateRow } from "@/lib/forms.functions";

const BLANK = "__blank";

export function SurveyList({ t }: { t: (key: string) => string }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<SurveyRow[] | null>(null);
  const [templates, setTemplates] = useState<FormTemplateRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [source, setSource] = useState(BLANK);
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState<SurveyRow | null>(null);

  const load = useCallback(async () => {
    try {
      setRows(await listSurveys());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);
  useEffect(() => void load(), [load]);
  useEffect(() => {
    if (creating)
      void listFormTemplates()
        .then(setTemplates)
        .catch(() => setTemplates([]));
  }, [creating]);

  const create = async () => {
    setBusy(true);
    try {
      const { id } = await createSurvey({
        data: { name, templateId: source === BLANK ? null : source },
      });
      void navigate({ to: "/manage/surveys/$id", params: { id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-2xl text-sm text-muted-foreground">{t("forms.surveys.hint")}</p>
        <Button size="pill" onClick={() => setCreating(true)}>
          <Plus />
          {t("forms.surveys.new")}
        </Button>
      </div>
      {error ? <p className="mt-6 text-sm text-destructive">{error}</p> : null}
      <div className="mt-6">
        {rows === null ? (
          <p className="text-sm text-muted-foreground">{t("forms.loading")}</p>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">{t("forms.surveys.empty")}</p>
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
            {rows.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <Link
                  to="/manage/surveys/$id"
                  params={{ id: row.id }}
                  className="min-w-0 flex-1 font-semibold text-foreground hover:text-primary"
                >
                  {row.name}
                </Link>
                <Badge variant={row.status === "open" ? "default" : "secondary"}>
                  {t(`forms.surveys.statusLabel.${row.status}`)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {row.response_count} {t("forms.surveys.responses")}
                  {row.closes_at
                    ? ` · ${t("forms.surveys.closes")} ${new Date(row.closes_at).toLocaleDateString()}`
                    : ""}
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
                    <DropdownMenuItem asChild>
                      <Link to="/manage/surveys/$id/results" params={{ id: row.id }}>
                        {t("forms.surveys.results")}
                      </Link>
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

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("forms.surveys.new")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="ns-name">{t("events.forms.name")}</Label>
              <Input
                id="ns-name"
                className="mt-1"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="ns-source">{t("forms.startFrom")}</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger id="ns-source" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={BLANK}>{t("forms.blank")}</SelectItem>
                  {templates.map((tpl) => (
                    <SelectItem key={tpl.id} value={tpl.id}>
                      {t("forms.library")}: {tpl.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
            <AlertDialogTitle>{t("forms.surveys.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("forms.surveys.deleteBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("forms.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!toDelete) return;
                try {
                  await deleteSurvey({ data: { id: toDelete.id } });
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
    </div>
  );
}
