/**
 * Speaker picker for the event editor.
 *
 * Speakers are a chapter-wide library, so the panel does two jobs: attach an
 * existing speaker to this event, and create or correct a speaker record
 * (name, photo, short bio, link). Saving is immediate — speakers are not part
 * of the event form's save payload.
 */
import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Pencil, Trash2 } from "lucide-react";
import { useCms } from "@/i18n/cms";
import { supabase } from "@/integrations/supabase/client";
import { ARTICLE_IMAGE_BUCKET } from "@/lib/storage";
import { MAX_SPEAKER_BIO, type EventSpeaker } from "@/lib/event-speakers";
import {
  listEventSpeakers,
  saveEventSpeaker,
  searchEventSpeakers,
  setEventSpeakers,
} from "@/lib/events-admin.functions";

const inputClass = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm";

type Draft = { id?: string; name: string; bio: string; url: string; imagePath: string | null };

const emptyDraft: Draft = { name: "", bio: "", url: "", imagePath: null };

export function EventSpeakersPanel({ eventId }: { eventId: string }) {
  const { t } = useCms();
  const [speakers, setSpeakers] = useState<EventSpeaker[]>([]);
  const [candidates, setCandidates] = useState<EventSpeaker[]>([]);
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listEventSpeakers({ data: { eventId } })
      .then((rows) => setSpeakers(rows as EventSpeaker[]))
      .catch(() => setError(t("events.speakers.loadError")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  // Debounced library search; an empty term simply lists the first entries.
  useEffect(() => {
    const timer = setTimeout(() => {
      void searchEventSpeakers({ data: { term: search.trim() } })
        .then((rows) => setCandidates(rows as EventSpeaker[]))
        .catch(() => setCandidates([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const commit = async (next: EventSpeaker[]) => {
    setBusy(true);
    setError(null);
    try {
      const saved = await setEventSpeakers({
        data: { eventId, speakerIds: next.map((s) => s.id) },
      });
      setSpeakers(saved as EventSpeaker[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("events.speakers.saveError"));
    } finally {
      setBusy(false);
    }
  };

  const add = () => {
    const found = candidates.find((c) => c.id === picked);
    if (!found || speakers.some((s) => s.id === found.id)) return;
    setPicked("");
    void commit([...speakers, found]);
  };

  const move = (index: number, delta: number) => {
    const next = [...speakers];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    void commit(next);
  };

  /** Bytes stay on the browser client; storage RLS is the boundary. */
  const upload = async (file: File) => {
    if (!draft) return;
    setUploading(true);
    setError(null);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `speakers/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(ARTICLE_IMAGE_BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      setDraft({ ...draft, imagePath: path });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("events.speakers.uploadError"));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const saveDraft = async () => {
    if (!draft || draft.name.trim().length < 2) return;
    setBusy(true);
    setError(null);
    try {
      const { id } = await saveEventSpeaker({
        data: {
          id: draft.id,
          name: draft.name.trim(),
          bio: draft.bio.trim() || null,
          url: draft.url.trim() || null,
          imagePath: draft.imagePath,
        },
      });
      const wasAttached = draft.id ? speakers.some((s) => s.id === draft.id) : false;
      const refreshed = (await searchEventSpeakers({
        data: { term: draft.name.trim() },
      })) as EventSpeaker[];
      const saved = refreshed.find((s) => s.id === id);
      setDraft(null);
      if (saved) {
        if (wasAttached) {
          setSpeakers((prev) => prev.map((s) => (s.id === id ? saved : s)));
        } else {
          await commit([...speakers, saved]);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("events.speakers.saveError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <ul className="divide-y divide-border">
        {speakers.map((speaker, index) => (
          <li key={speaker.id} className="flex items-center gap-3 py-2">
            {speaker.imageUrl ? (
              <img src={speaker.imageUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <span className="h-9 w-9 rounded-full bg-secondary" aria-hidden />
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{speaker.name}</span>
              {speaker.bio ? (
                <span className="block truncate text-xs text-muted-foreground">{speaker.bio}</span>
              ) : null}
            </span>
            <button
              type="button"
              disabled={busy || index === 0}
              onClick={() => move(index, -1)}
              aria-label={t("events.speakers.moveUp")}
              className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={busy || index === speakers.length - 1}
              onClick={() => move(index, 1)}
              aria-label={t("events.speakers.moveDown")}
              className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                setDraft({
                  id: speaker.id,
                  name: speaker.name,
                  bio: speaker.bio ?? "",
                  url: speaker.url ?? "",
                  imagePath: speaker.imagePath,
                })
              }
              aria-label={t("events.speakers.edit")}
              className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void commit(speakers.filter((s) => s.id !== speaker.id))}
              aria-label={t("events.speakers.remove")}
              className="rounded p-1 text-muted-foreground hover:text-destructive disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
        {speakers.length === 0 ? (
          <li className="py-2 text-sm text-muted-foreground">{t("events.speakers.none")}</li>
        ) : null}
      </ul>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("events.speakers.search")}
          aria-label={t("events.speakers.search")}
          className={inputClass + " w-56"}
        />
        <select
          aria-label={t("events.speakers.select")}
          value={picked}
          onChange={(e) => setPicked(e.target.value)}
          className={inputClass + " w-56"}
        >
          <option value="">{t("events.speakers.select")}</option>
          {candidates
            .filter((c) => !speakers.some((s) => s.id === c.id))
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </select>
        <button
          type="button"
          onClick={add}
          disabled={!picked || busy}
          className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary disabled:opacity-50"
        >
          {t("events.speakers.add")}
        </button>
        <button
          type="button"
          onClick={() => setDraft({ ...emptyDraft })}
          disabled={busy || draft !== null}
          className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary disabled:opacity-50"
        >
          {t("events.speakers.new")}
        </button>
      </div>

      {draft ? (
        <div className="mt-4 rounded-2xl border border-border bg-background p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                {t("events.speakers.fieldName")}
              </span>
              <input
                className={inputClass}
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                {t("events.speakers.fieldUrl")}
              </span>
              <input
                className={inputClass}
                value={draft.url}
                placeholder="https://"
                onChange={(e) => setDraft({ ...draft, url: e.target.value })}
              />
            </label>
          </div>
          <label className="mt-3 block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">
              {t("events.speakers.fieldBio")}
            </span>
            <textarea
              className={inputClass + " min-h-20"}
              maxLength={MAX_SPEAKER_BIO}
              value={draft.bio}
              onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
            />
          </label>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-muted-foreground">
              {t("events.speakers.fieldImage")}
            </span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              aria-label={t("events.speakers.fieldImage")}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void upload(file);
              }}
              className="text-xs"
            />
            {uploading ? (
              <span className="text-xs text-muted-foreground">
                {t("events.speakers.uploading")}
              </span>
            ) : draft.imagePath ? (
              <span className="text-xs text-muted-foreground">
                {t("events.speakers.imageReady")}
              </span>
            ) : null}
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => void saveDraft()}
              disabled={busy || uploading || draft.name.trim().length < 2}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {t("events.speakers.save")}
            </button>
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary"
            >
              {t("events.speakers.cancel")}
            </button>
          </div>
        </div>
      ) : null}

      <p className="mt-2 text-xs text-muted-foreground">{t("events.speakers.hint")}</p>
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
