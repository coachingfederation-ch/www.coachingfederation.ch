/**
 * Attendance import — staff card on the door screen.
 *
 * The preview here is advisory only: the database routine re-checks every
 * seat's eligibility when the import is applied, so a stale preview can never
 * mark somebody present who may not be.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileUp } from "lucide-react";
import {
  applyAttendanceImport,
  discardAttendanceImport,
  getAttendanceImportFileUrl,
  listAttendanceImports,
  loadAttendanceImport,
  setImportRowDecision,
  uploadAttendanceCsv,
  type AttendanceImport,
  type AttendancePreview,
} from "@/lib/attendance-import.functions";
import type { CheckInAttendee } from "@/lib/check-in.functions";

type Props = {
  eventId: string;
  attendees: CheckInAttendee[];
  t: (key: string) => string;
  onChanged: () => Promise<void>;
};

const buttonPrimary =
  "min-h-11 w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50";
const buttonGhost =
  "min-h-11 w-full rounded-full border border-border px-5 py-3 text-sm font-semibold hover:bg-secondary disabled:opacity-50";

export function AttendanceImportCard({ eventId, attendees, t, onChanged }: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<AttendancePreview | null>(null);
  const [history, setHistory] = useState<AttendanceImport[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const refreshHistory = useCallback(async () => {
    try {
      setHistory(await listAttendanceImports({ data: { eventId } }));
    } catch {
      // A missing history list must not hide the uploader itself.
    }
  }, [eventId]);

  useEffect(() => {
    void refreshHistory();
  }, [refreshHistory]);

  const linkable = useMemo(
    () => attendees.filter((a) => a.status === "confirmed" && !a.checked_in_at),
    [attendees],
  );

  const pickFile = async (file: File) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const content = await file.text();
      setPreview(
        await uploadAttendanceCsv({ data: { eventId, filename: file.name, content } }),
      );
      await refreshHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("events.attendance.import.uploadFailed"));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const updateRow = async (
    rowId: string,
    patch: { decision: "check_in" | "skip"; registrationId?: string | null },
  ) => {
    if (!preview) return;
    setBusy(true);
    try {
      await setImportRowDecision({ data: { rowId, ...patch } });
      setPreview(await loadAttendanceImport({ data: { importId: preview.import.id } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("events.attendance.import.uploadFailed"));
    } finally {
      setBusy(false);
    }
  };

  const apply = async () => {
    if (!preview) return;
    setBusy(true);
    setConfirming(false);
    setError(null);
    try {
      const result = await applyAttendanceImport({ data: { importId: preview.import.id } });
      setNotice(
        `${t("events.attendance.import.checkedIn")}: ${result.checked_in ?? 0} · ${t(
          "events.attendance.import.already",
        )}: ${result.already ?? 0} · ${t("events.attendance.import.skipped")}: ${
          result.skipped ?? 0
        }`,
      );
      setPreview(null);
      await refreshHistory();
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("events.attendance.import.applyFailed"));
    } finally {
      setBusy(false);
    }
  };

  const discard = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      await discardAttendanceImport({ data: { importId: preview.import.id } });
      setPreview(null);
      await refreshHistory();
    } finally {
      setBusy(false);
    }
  };

  const download = async (importId: string) => {
    const { url } = await getAttendanceImportFileUrl({ data: { importId } });
    if (url) window.open(url, "_blank", "noopener");
  };

  const willCheckIn = preview?.rows.filter((r) => r.apply_decision === "check_in").length ?? 0;

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <FileUp className="h-4 w-4 shrink-0" />
        {t("events.attendance.import.title")}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{t("events.attendance.import.help")}</p>

      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      {notice ? <p className="mt-3 text-sm font-semibold">{notice}</p> : null}

      {preview ? null : (
        <div className="mt-3">
          <label className="text-xs text-muted-foreground" htmlFor="attendance-csv">
            {t("events.attendance.import.fileLabel")}
          </label>
          <input
            id="attendance-csv"
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void pickFile(file);
            }}
            className="mt-1 block w-full text-sm"
          />
        </div>
      )}

      {preview ? (
        <div className="mt-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            {t("events.attendance.import.threshold")} {preview.thresholdMinutes}{" "}
            {t("events.attendance.import.minutes")} ({preview.minPercent}% ·{" "}
            {preview.lengthMinutes} {t("events.attendance.import.minutes")})
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">{t("events.attendance.import.colName")}</th>
                  <th className="py-2 pr-3">{t("events.attendance.import.colEmail")}</th>
                  <th className="py-2 pr-3">{t("events.attendance.import.colDuration")}</th>
                  <th className="py-2 pr-3">{t("events.attendance.import.colMatch")}</th>
                  <th className="py-2">{t("events.attendance.import.colDecision")}</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => {
                  const matched = attendees.find((a) => a.id === row.match_registration_id);
                  return (
                    <tr key={row.id} className="border-t border-border align-top">
                      <td className="py-2 pr-3">{row.raw_name ?? "—"}</td>
                      <td className="py-2 pr-3 break-all">{row.raw_email ?? "—"}</td>
                      <td className="py-2 pr-3">
                        {row.duration_minutes === null ? "—" : Math.round(row.duration_minutes)}
                      </td>
                      <td className="py-2 pr-3">
                        {matched ? (
                          matched.full_name
                        ) : (
                          <select
                            className="w-44 rounded-md border border-border bg-background px-2 py-1 text-xs"
                            value=""
                            disabled={busy}
                            onChange={(e) =>
                              void updateRow(row.id, {
                                decision: "check_in",
                                registrationId: e.target.value || null,
                              })
                            }
                          >
                            <option value="">{t("events.attendance.import.unmatched")}</option>
                            {linkable.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.full_name}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="py-2">
                        {row.apply_decision === "check_in" ? (
                          <span className="font-semibold">
                            {t("events.attendance.import.willCheckIn")}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            {t(`events.attendance.import.reason.${row.skip_reason ?? "skip"}`)}
                          </span>
                        )}
                        {row.skip_reason === "below_threshold" && row.match_registration_id ? (
                          <label className="mt-1 flex items-center gap-2 text-xs">
                            <input
                              type="checkbox"
                              checked={false}
                              disabled={busy}
                              onChange={() => void updateRow(row.id, { decision: "check_in" })}
                            />
                            {t("events.attendance.import.checkInAnyway")}
                          </label>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {confirming ? (
            <div className="rounded-xl border border-border p-3">
              <p className="text-sm">
                {t("events.attendance.import.confirm")} {willCheckIn}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button type="button" className={buttonPrimary} disabled={busy} onClick={apply}>
                  {t("events.attendance.import.apply")} {willCheckIn}
                </button>
                <button
                  type="button"
                  className={buttonGhost}
                  onClick={() => setConfirming(false)}
                >
                  {t("events.attendance.import.cancel")}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                className={buttonPrimary}
                disabled={busy || willCheckIn === 0}
                onClick={() => setConfirming(true)}
              >
                {t("events.attendance.import.apply")} {willCheckIn}
              </button>
              <button type="button" className={buttonGhost} disabled={busy} onClick={discard}>
                {t("events.attendance.import.discard")}
              </button>
            </div>
          )}
        </div>
      ) : null}

      {history.length ? (
        <ul className="mt-4 space-y-2 border-t border-border pt-3">
          {history.map((item) => (
            <li key={item.id} className="text-xs text-muted-foreground">
              <button
                type="button"
                onClick={() => void download(item.id)}
                className="font-semibold text-foreground underline-offset-2 hover:underline"
              >
                {item.original_filename}
              </button>{" "}
              · {new Date(item.created_at).toLocaleString()} · {item.provider} ·{" "}
              {t("events.attendance.import.checkedIn")}: {item.stats?.checked_in ?? 0}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
