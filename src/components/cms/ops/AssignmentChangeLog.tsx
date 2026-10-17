import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowRight, RefreshCw, Search } from "lucide-react";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/design-system/icf-welcome-design-system-a835df";
import { listOpsAssignmentHistory } from "@/lib/ops-admin.functions";
import { useCms } from "@/i18n/cms";
import type { ProjectRow } from "./types";

type Entry = {
  id: string;
  created_at: string;
  action: "assigned" | "unassigned";
  member_name: string | null;
  project_name: string | null;
  role_name: string | null;
  actor_id: string | null;
  actor_name: string | null;
  project_id: string;
};

export function AssignmentChangeLog({ projects }: { projects: ProjectRow[] }) {
  const { t, locale } = useCms();
  const loadHistory = useServerFn(listOpsAssignmentHistory);
  const request = useRef(0);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [projectId, setProjectId] = useState("all");
  const [action, setAction] = useState("all");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const current = ++request.current;
    let active = true;
    setBusy(true);
    setError(false);
    void loadHistory({
      data: {
        offset,
        ...(projectId !== "all" ? { projectId } : {}),
        ...(action === "assigned" || action === "unassigned" ? { action } : {}),
        ...(appliedSearch ? { search: appliedSearch } : {}),
      },
    })
      .then((result) => {
        if (!active || request.current !== current) return;
        setEntries(result.entries as Entry[]);
        setTotal(result.total);
      })
      .catch(() => {
        if (active && request.current === current) setError(true);
      })
      .finally(() => {
        if (active && request.current === current) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [offset, projectId, action, appliedSearch, revision, loadHistory]);

  // Include historical/deleted projects without requiring any public metadata reads.
  const projectOptions = new Map(projects.map((project) => [project.id, project.name]));
  for (const entry of entries) {
    if (!projectOptions.has(entry.project_id))
      projectOptions.set(entry.project_id, entry.project_name ?? t("ops.audit.unknown"));
  }

  return (
    <section className="mt-6 space-y-4" aria-busy={busy}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-xl font-normal">{t("ops.audit.title")}</h2>
        <Button
          variant="outline"
          size="icon"
          aria-label={t("ops.audit.refresh")}
          title={t("ops.audit.refresh")}
          disabled={busy}
          onClick={() => setRevision((value) => value + 1)}
        >
          <RefreshCw />
        </Button>
      </div>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setOffset(0);
          setAppliedSearch(search.trim());
        }}
      >
        <div className="min-w-0 flex-1 space-y-2">
          <Label htmlFor="assignment-log-search">{t("ops.audit.search")}</Label>
          <Input
            id="assignment-log-search"
            value={search}
            maxLength={120}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="assignment-log-project">{t("ops.audit.project")}</Label>
          <Select
            value={projectId}
            onValueChange={(value) => {
              setOffset(0);
              setProjectId(value);
            }}
          >
            <SelectTrigger id="assignment-log-project">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("ops.audit.allProjects")}</SelectItem>
              {Array.from(projectOptions).map(([id, name]) => (
                <SelectItem key={id} value={id}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="assignment-log-action">{t("ops.audit.action")}</Label>
          <Select
            value={action}
            onValueChange={(value) => {
              setOffset(0);
              setAction(value);
            }}
          >
            <SelectTrigger id="assignment-log-action">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("ops.audit.allActions")}</SelectItem>
              <SelectItem value="assigned">{t("ops.audit.assigned")}</SelectItem>
              <SelectItem value="unassigned">{t("ops.audit.unassigned")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          type="submit"
          variant="outline"
          size="icon"
          aria-label={t("ops.audit.search")}
          title={t("ops.audit.search")}
          disabled={busy}
        >
          <Search />
        </Button>
      </form>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{t("ops.audit.error")}</AlertDescription>
        </Alert>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("ops.audit.when")}</TableHead>
              <TableHead>{t("ops.member")}</TableHead>
              <TableHead>{t("ops.audit.assignment")}</TableHead>
              <TableHead>{t("ops.audit.action")}</TableHead>
              <TableHead>{t("ops.audit.by")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {busy ? (
              <TableRow>
                <TableCell colSpan={5}>{t("ops.audit.loading")}</TableCell>
              </TableRow>
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  {t(
                    projectId !== "all" || action !== "all" || appliedSearch
                      ? "ops.audit.noMatches"
                      : "ops.audit.empty",
                  )}
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <time dateTime={entry.created_at}>
                      {new Date(entry.created_at).toLocaleString(locale, {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: "Europe/Zurich",
                      })}
                    </time>
                  </TableCell>
                  <TableCell>{entry.member_name ?? t("ops.audit.unknown")}</TableCell>
                  <TableCell>
                    <div>{entry.project_name ?? t("ops.audit.unknown")}</div>
                    <div className="text-muted-foreground">
                      {entry.role_name ?? t("ops.audit.unknown")}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={entry.action === "assigned" ? "secondary" : "outline"}>
                      {t(`ops.audit.${entry.action}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {entry.actor_name ??
                      t(entry.actor_id ? "ops.audit.unknownActor" : "ops.audit.system")}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" role="status">
          {!busy && !error
            ? t("ops.audit.count")
                .replace("{from}", String(total ? offset + 1 : 0))
                .replace("{to}", String(Math.min(offset + entries.length, total)))
                .replace("{total}", String(total))
            : ""}
        </p>
        <nav className="flex gap-2" aria-label={t("ops.audit.pages")}>
          <Button
            variant="outline"
            disabled={busy || offset === 0}
            onClick={() => setOffset((value) => Math.max(0, value - 10))}
          >
            <ArrowLeft />
            {t("ops.audit.previous")}
          </Button>
          <Button
            variant="outline"
            disabled={busy || error || offset + 10 >= total}
            onClick={() => setOffset((value) => value + 10)}
          >
            {t("ops.audit.next")}
            <ArrowRight />
          </Button>
        </nav>
      </div>
    </section>
  );
}
