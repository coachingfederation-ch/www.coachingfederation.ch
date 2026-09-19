/**
 * Member credits dashboard.
 *
 * Shows what the signed-in member has earned towards their ICF Credential
 * renewal: confirmed hours from certificates we issued, plus training they
 * recorded themselves. The two are always labelled, never silently merged.
 *
 * The cycle window comes from the server (credential expiry, or a start date
 * the member maintains). With no anchor we show every credit in one list and
 * invite them to set the start date, rather than inventing a window.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Award, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { useCms } from "@/i18n/cms";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from "@/design-system/icf-welcome-design-system-a835df";
import {
  deleteMyCreditEntry,
  getMyCredits,
  saveMyCreditEntry,
  setMyCycleStart,
  type CreditRow,
  type CreditsDashboard as CreditsData,
} from "@/lib/member-credits.functions";

type Draft = {
  id?: string;
  occurredOn: string;
  title: string;
  provider: string;
  ccHours: string;
  rdHours: string;
  note: string;
  linkUrl: string;
};

const EMPTY_DRAFT: Draft = {
  occurredOn: new Date().toISOString().slice(0, 10),
  title: "",
  provider: "",
  ccHours: "0",
  rdHours: "0",
  note: "",
  linkUrl: "",
};

function sum(rows: CreditRow[], key: "ccHours" | "rdHours") {
  return rows.reduce((total, row) => total + row[key], 0);
}

/** Two decimals at most, trailing zeros trimmed: 2.5, 1.25, 0. */
function hours(value: number) {
  return value.toFixed(2).replace(/\.?0+$/, "") || "0";
}

/** Steps the window back three years at a time until the date is covered. */
function cycleIndexOf(date: string, start: string) {
  const from = new Date(`${start}T00:00:00Z`).getTime();
  const at = new Date(`${date}T00:00:00Z`).getTime();
  if (at >= from) return 0;
  const years = (from - at) / (1000 * 60 * 60 * 24 * 365.25);
  return Math.ceil(years / 3);
}

export function CreditsDashboard() {
  const { t, locale } = useCms();
  const [data, setData] = useState<CreditsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [cycleInput, setCycleInput] = useState("");

  const reload = useCallback(async () => {
    try {
      const next = await getMyCredits();
      setData(next);
      setCycleInput(next.cycle.start ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("member.credits.failed"));
    }
  }, [t]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const dateFormat = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }),
    [locale],
  );
  const formatDate = useCallback(
    (iso: string) => dateFormat.format(new Date(`${iso}T12:00:00Z`)),
    [dateFormat],
  );

  const groups = useMemo(() => {
    const rows = data?.rows ?? [];
    const start = data?.cycle.start ?? null;
    if (!start) return { current: rows, earlier: [] as { index: number; rows: CreditRow[] }[] };
    const current: CreditRow[] = [];
    const buckets = new Map<number, CreditRow[]>();
    for (const row of rows) {
      const index = cycleIndexOf(row.occurredOn, start);
      if (index === 0) current.push(row);
      else buckets.set(index, [...(buckets.get(index) ?? []), row]);
    }
    return {
      current,
      earlier: [...buckets.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([index, group]) => ({ index, rows: group })),
    };
  }, [data]);

  const run = useCallback(
    async (action: () => Promise<unknown>) => {
      setBusy(true);
      setError(null);
      try {
        await action();
        await reload();
      } catch (e) {
        setError(e instanceof Error ? e.message : t("member.credits.failed"));
      } finally {
        setBusy(false);
      }
    },
    [reload, t],
  );

  const saveDraft = useCallback(() => {
    if (!draft) return;
    void run(async () => {
      await saveMyCreditEntry({
        data: {
          id: draft.id,
          occurredOn: draft.occurredOn,
          title: draft.title.trim(),
          provider: draft.provider.trim() || null,
          ccHours: Number(draft.ccHours) || 0,
          rdHours: Number(draft.rdHours) || 0,
          note: draft.note.trim() || null,
          linkUrl: draft.linkUrl.trim() || null,
        },
      });
      setDraft(null);
    });
  }, [draft, run]);

  const cc = sum(groups.current, "ccHours");
  const rd = sum(groups.current, "rdHours");

  const renderTable = (rows: CreditRow[]) => (
    <div className="overflow-x-auto">
      <Table className="min-w-2xl">
        <TableHeader>
          <TableRow>
            <TableHead>{t("member.credits.table.date")}</TableHead>
            <TableHead>{t("member.credits.table.activity")}</TableHead>
            <TableHead className="text-right">{t("member.credits.table.cc")}</TableHead>
            <TableHead className="text-right">{t("member.credits.table.rd")}</TableHead>
            <TableHead className="text-right">{t("member.credits.table.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                {t("member.credits.empty")}
              </TableCell>
            </TableRow>
          ) : null}
          {rows.map((row) => (
            <TableRow key={`${row.source}-${row.id}`}>
              <TableCell className="whitespace-nowrap">{formatDate(row.occurredOn)}</TableCell>
              <TableCell className="break-words">
                <span className="font-semibold">{row.title}</span>
                <span className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge variant={row.source === "chapter" ? "default" : "secondary"}>
                    {row.source === "chapter"
                      ? t("member.credits.source.chapter")
                      : t("member.credits.source.self")}
                  </Badge>
                  {row.provider ? (
                    <span className="text-xs text-muted-foreground">{row.provider}</span>
                  ) : null}
                  {row.note ? (
                    <span className="text-xs text-muted-foreground">{row.note}</span>
                  ) : null}
                </span>
              </TableCell>
              <TableCell className="text-right tabular-nums">{hours(row.ccHours)}</TableCell>
              <TableCell className="text-right tabular-nums">{hours(row.rdHours)}</TableCell>
              <TableCell className="text-right whitespace-nowrap">
                {row.source === "chapter" && row.publicToken ? (
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={`/verify/certificate/${row.publicToken}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink aria-hidden />
                      {t("member.credits.table.certificate")}
                    </a>
                  </Button>
                ) : null}
                {row.source === "self" ? (
                  <span className="inline-flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      aria-label={t("member.credits.edit")}
                      onClick={() =>
                        setDraft({
                          id: row.id,
                          occurredOn: row.occurredOn,
                          title: row.title,
                          provider: row.provider ?? "",
                          ccHours: String(row.ccHours),
                          rdHours: String(row.rdHours),
                          note: row.note ?? "",
                          linkUrl: row.linkUrl ?? "",
                        })
                      }
                    >
                      <Pencil aria-hidden />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      aria-label={t("member.credits.delete")}
                      onClick={() => {
                        if (!window.confirm(t("member.credits.deleteConfirm"))) return;
                        void run(() => deleteMyCreditEntry({ data: { id: row.id } }));
                      }}
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  </span>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 sm:px-10">
      <h1 className="font-heading text-3xl text-primary">{t("member.credits.title")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("member.credits.intro")}</p>

      <section className="mt-6 rounded-3xl bg-hero p-6 text-hero-foreground">
        <p className="eyebrow eyebrow-inverse">{t("member.credits.cycle")}</p>
        <p className="mt-1 text-sm opacity-90">
          {data?.cycle.start && data.cycle.end
            ? `${formatDate(data.cycle.start)} – ${formatDate(data.cycle.end)}`
            : t("member.credits.noCycle")}
        </p>
        <dl className="mt-5 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-sm opacity-90">{t("member.credits.cc")}</dt>
            <dd className="font-heading text-4xl">{hours(cc)}</dd>
          </div>
          <div>
            <dt className="text-sm opacity-90">{t("member.credits.rd")}</dt>
            <dd className="font-heading text-4xl">{hours(rd)}</dd>
          </div>
          <div>
            <dt className="text-sm opacity-90">{t("member.credits.total")}</dt>
            <dd className="font-heading text-4xl">{hours(cc + rd)}</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs opacity-80">
          {data?.cycle.anchor === "credential"
            ? t("member.credits.anchorCredential")
            : data?.cycle.anchor === "member"
              ? t("member.credits.anchorMember")
              : t("member.credits.anchorNone")}
        </p>
      </section>

      <section className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-5">
        <div className="grow">
          <Label htmlFor="cycle-start">{t("member.credits.cycleStart")}</Label>
          <Input
            id="cycle-start"
            type="date"
            value={cycleInput}
            onChange={(e) => setCycleInput(e.target.value)}
            className="mt-2 max-w-xs"
          />
        </div>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() =>
            void run(() => setMyCycleStart({ data: { cycleStartOn: cycleInput || null } }))
          }
        >
          {t("member.credits.saveCycle")}
        </Button>
        <Button disabled={busy} onClick={() => setDraft({ ...EMPTY_DRAFT })}>
          <Plus aria-hidden />
          {t("member.credits.add")}
        </Button>
      </section>

      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

      <section className="mt-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Award className="h-5 w-5 text-primary" aria-hidden />
          {t("member.credits.table.title")}
        </h2>
        <div className="mt-4">{renderTable(groups.current)}</div>
      </section>

      {groups.earlier.length > 0 ? (
        <section className="mt-6 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-lg font-bold">{t("member.credits.earlier")}</h2>
          {groups.earlier.map((group) => (
            <details key={group.index} className="mt-4">
              <summary className="cursor-pointer text-sm font-semibold">
                {t("member.credits.earlierCycle").replace("{count}", String(group.index))} ·{" "}
                {hours(sum(group.rows, "ccHours") + sum(group.rows, "rdHours"))}
              </summary>
              <div className="mt-3">{renderTable(group.rows)}</div>
            </details>
          ))}
        </section>
      ) : null}

      <Dialog open={draft !== null} onOpenChange={(open) => (open ? null : setDraft(null))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("member.credits.dialogTitle")}</DialogTitle>
            <DialogDescription>{t("member.credits.dialogHelp")}</DialogDescription>
          </DialogHeader>
          {draft ? (
            <div className="grid gap-4">
              <div>
                <Label htmlFor="credit-date">{t("member.credits.table.date")}</Label>
                <Input
                  id="credit-date"
                  type="date"
                  value={draft.occurredOn}
                  onChange={(e) => setDraft({ ...draft, occurredOn: e.target.value })}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="credit-title">{t("member.credits.table.activity")}</Label>
                <Input
                  id="credit-title"
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="credit-provider">{t("member.credits.provider")}</Label>
                <Input
                  id="credit-provider"
                  value={draft.provider}
                  onChange={(e) => setDraft({ ...draft, provider: e.target.value })}
                  className="mt-2"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="credit-cc">{t("member.credits.cc")}</Label>
                  <Input
                    id="credit-cc"
                    type="number"
                    min="0"
                    step="0.25"
                    value={draft.ccHours}
                    onChange={(e) => setDraft({ ...draft, ccHours: e.target.value })}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="credit-rd">{t("member.credits.rd")}</Label>
                  <Input
                    id="credit-rd"
                    type="number"
                    min="0"
                    step="0.25"
                    value={draft.rdHours}
                    onChange={(e) => setDraft({ ...draft, rdHours: e.target.value })}
                    className="mt-2"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="credit-link">{t("member.credits.link")}</Label>
                <Input
                  id="credit-link"
                  type="url"
                  value={draft.linkUrl}
                  onChange={(e) => setDraft({ ...draft, linkUrl: e.target.value })}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="credit-note">{t("member.credits.note")}</Label>
                <Textarea
                  id="credit-note"
                  value={draft.note}
                  onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                  className="mt-2"
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>
              {t("member.credits.cancel")}
            </Button>
            <Button disabled={busy || !draft?.title.trim()} onClick={saveDraft}>
              {t("member.credits.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
