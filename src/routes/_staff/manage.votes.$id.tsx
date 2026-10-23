/**
 * Member vote editor (/manage/votes/:id): proposal text with translations,
 * voting window, options, visibility settings and downloadable files.
 * Once voting has started, the server refuses option or start-date changes.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Eye, Languages, Loader2, Sparkles, Trash2, Upload } from "lucide-react";
import {
  Badge,
  Button,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from "@/design-system/icf-welcome-design-system-a835df";
import { MarkdownEditor } from "@/components/cms/MarkdownEditor";
import { useServerFn } from "@tanstack/react-start";
import { suggestBallotQuestion } from "@/lib/ballot-question.functions";
import { translateVoteDraft } from "@/lib/vote-translations.functions";
import { LOCALE_ORDER, type Locale } from "@/i18n/config";
import { Shell } from "@/components/cms/Shell";
import { supabase } from "@/integrations/supabase/client";
import { requireStaffAccess, VOTE_ROLES } from "@/lib/staff-guard";
import { useCms } from "@/i18n/cms";
import {
  addVoteAttachment,
  deleteVote,
  getVoteAdmin,
  removeVoteAttachment,
  saveVote,
} from "@/lib/votes.functions";
import {
  DEFAULT_OPTIONS,
  optionKey,
  votePhase,
  type VoteOption,
  type VoteStatus,
} from "@/lib/votes";

export const Route = createFileRoute("/_staff/manage/votes/$id")({
  beforeLoad: ({ context }) => requireStaffAccess(context.queryClient, VOTE_ROLES),
  head: () => ({
    meta: [
      { title: "Edit member vote — The Switzerland Chapter of ICF CMS" },
      { name: "description", content: "Prepare a proposal for members to vote on." },
      { property: "og:title", content: "Edit member vote — The Switzerland Chapter of ICF CMS" },
      { property: "og:description", content: "Prepare a proposal for members to vote on." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VoteEditorPage,
});

type Loaded = Awaited<ReturnType<typeof getVoteAdmin>>;
type Form = {
  ballot_question: string;
  ballot_question_de: string;
  ballot_question_fr: string;
  ballot_question_it: string;
  title: string;
  title_de: string;
  title_fr: string;
  title_it: string;
  summary: string;
  summary_de: string;
  summary_fr: string;
  summary_it: string;
  description: string;
  description_de: string;
  description_fr: string;
  description_it: string;
  category: string;
  status: VoteStatus;
  opens: string;
  closes: string;
  options: VoteOption[];
  results_mode: "after_vote" | "after_close";
  rationale_enabled: boolean;
  announce_enabled: boolean;
};

const pad = (n: number) => String(n).padStart(2, "0");
/** ISO → value for a local datetime input (staff work in Zurich time). */
function toLocalInput(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const s = (v: string | null) => v ?? "";
const n = (v: string) => (v.trim() === "" ? null : v.trim());

function toForm(v: Loaded["vote"]): Form {
  return {
    ballot_question: s(v.ballot_question),
    ballot_question_de: s(v.ballot_question_de),
    ballot_question_fr: s(v.ballot_question_fr),
    ballot_question_it: s(v.ballot_question_it),
    title: v.title,
    title_de: s(v.title_de),
    title_fr: s(v.title_fr),
    title_it: s(v.title_it),
    summary: s(v.summary),
    summary_de: s(v.summary_de),
    summary_fr: s(v.summary_fr),
    summary_it: s(v.summary_it),
    description: s(v.description),
    description_de: s(v.description_de),
    description_fr: s(v.description_fr),
    description_it: s(v.description_it),
    category: s(v.category),
    status: v.status,
    opens: toLocalInput(v.opens_at),
    closes: toLocalInput(v.closes_at),
    options: v.options,
    results_mode: v.results_mode,
    rationale_enabled: v.rationale_enabled,
    announce_enabled: v.announce_enabled,
  };
}

function VoteEditorPage() {
  const { id } = Route.useParams();
  const { t } = useCms();
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editingLocale, setEditingLocale] = useState<Locale>("en");
  const [translating, setTranslating] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const suggestQuestion = useServerFn(suggestBallotQuestion);
  const [translationNote, setTranslationNote] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      const row = await getVoteAdmin({ data: { id } });
      setLoaded(row);
      setForm(toForm(row.vote));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!form || !loaded) {
    return (
      <Shell compactNavigation>
        <div className="mx-auto max-w-4xl px-6 py-8">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      </Shell>
    );
  }

  const phase = votePhase(loaded.vote);
  const questionField:
    "ballot_question" | "ballot_question_de" | "ballot_question_fr" | "ballot_question_it" =
    editingLocale === "en" ? "ballot_question" : `ballot_question_${editingLocale}`;
  const locked = loaded.vote.status !== "draft" && new Date(loaded.vote.opens_at) <= new Date();
  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setSaved(false);
    setDirty(true);
    setForm({ ...form, [k]: v });
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await saveVote({
        data: {
          id,
          ballot_question: n(form.ballot_question),
          ballot_question_de: n(form.ballot_question_de),
          ballot_question_fr: n(form.ballot_question_fr),
          ballot_question_it: n(form.ballot_question_it),
          title: form.title.trim(),
          title_de: n(form.title_de),
          title_fr: n(form.title_fr),
          title_it: n(form.title_it),
          summary: n(form.summary),
          summary_de: n(form.summary_de),
          summary_fr: n(form.summary_fr),
          summary_it: n(form.summary_it),
          description: n(form.description),
          description_de: n(form.description_de),
          description_fr: n(form.description_fr),
          description_it: n(form.description_it),
          category: n(form.category),
          status: form.status,
          opens_at: new Date(form.opens).toISOString(),
          closes_at: new Date(form.closes).toISOString(),
          options: form.options,
          results_mode: form.results_mode,
          rationale_enabled: form.rationale_enabled,
          announce_enabled: form.announce_enabled,
        },
      });
      setSaved(true);
      setDirty(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const upload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const safe = file.name.replace(/[^\w.-]+/g, "_").slice(-120);
      const path = `${id}/${crypto.randomUUID()}-${safe}`;
      const { error: upErr } = await supabase.storage.from("vote-files").upload(path, file);
      if (upErr) throw new Error(upErr.message);
      await addVoteAttachment({
        data: { voteId: id, filePath: path, fileName: file.name, size: file.size },
      });
      const row = await getVoteAdmin({ data: { id } });
      setLoaded(row);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const translate = async () => {
    if (form.title.trim().length < 3 || locked) return;
    if (
      (form.title_de ||
        form.title_fr ||
        form.title_it ||
        form.ballot_question_de ||
        form.ballot_question_fr ||
        form.ballot_question_it) &&
      !window.confirm(t("votes.admin.translateOverwrite"))
    )
      return;
    setTranslating(true);
    setError(null);
    setTranslationNote(false);
    try {
      const translated = await translateVoteDraft({
        data: {
          ballot_question: form.ballot_question,
          title: form.title,
          summary: form.summary,
          description: form.description,
          options: form.options,
        },
      });
      const fields: Partial<Form> = {};
      for (const locale of ["de", "fr", "it"] as const) {
        fields[`ballot_question_${locale}`] = translated[locale].ballot_question;
        fields[`title_${locale}`] = translated[locale].title;
        fields[`summary_${locale}`] = translated[locale].summary;
        fields[`description_${locale}`] = translated[locale].description;
      }
      setForm({
        ...form,
        ...fields,
        options: form.options.map((option) => ({
          ...option,
          label_de: translated.de.options.find((o) => o.key === option.key)?.label,
          label_fr: translated.fr.options.find((o) => o.key === option.key)?.label,
          label_it: translated.it.options.find((o) => o.key === option.key)?.label,
        })),
      });
      setDirty(true);
      setSaved(false);
      setTranslationNote(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setTranslating(false);
    }
  };

  const suggest = async () => {
    if (locked || suggesting || editingLocale !== "en") return;
    if (form.ballot_question.trim() && !window.confirm(t("votes.admin.questionOverwrite"))) return;
    setSuggesting(true);
    setError(null);
    try {
      const result = await suggestQuestion({
        data: {
          title: form.title,
          summary: form.summary,
          description: form.description,
          options: form.options.map(({ label }) => ({ label })),
        },
      });
      set("ballot_question", result.question);
      setTranslationNote(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSuggesting(false);
    }
  };

  const updateOption = (i: number, label: string) => {
    const next = form.options.map((o, j) =>
      j === i ? { ...o, [editingLocale === "en" ? "label" : `label_${editingLocale}`]: label } : o,
    );
    set("options", next);
  };
  const addOption = () => {
    const label = `Option ${form.options.length + 1}`;
    set("options", [
      ...form.options,
      {
        key: optionKey(
          label,
          form.options.map((o) => o.key),
        ),
        label,
      },
    ]);
  };

  const textFields = (suffix: "" | "_de" | "_fr" | "_it") => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`title${suffix}`}>{t("votes.admin.fTitle")}</Label>
        <Input
          id={`title${suffix}`}
          value={form[`title${suffix}` as keyof Form] as string}
          onChange={(e) => set(`title${suffix}` as keyof Form, e.target.value as never)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`summary${suffix}`}>{t("votes.admin.fSummary")}</Label>
        <Textarea
          id={`summary${suffix}`}
          rows={2}
          value={form[`summary${suffix}` as keyof Form] as string}
          onChange={(e) => set(`summary${suffix}` as keyof Form, e.target.value as never)}
        />
        <p className="text-xs text-muted-foreground">{t("votes.admin.fSummaryHint")}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`description${suffix}`}>{t("votes.admin.fDescription")}</Label>
        <MarkdownEditor
          language={editingLocale}
          modes={["write", "preview"]}
          rows={14}
          value={form[`description${suffix}` as keyof Form] as string}
          onChange={(value) => set(`description${suffix}` as keyof Form, value)}
        />
      </div>
    </div>
  );

  return (
    <Shell compactNavigation>
      <div className="mx-auto max-w-4xl px-6 py-8">
        <Link to="/manage/votes" className="text-sm font-semibold text-primary">
          ← {t("votes.admin.back")}
        </Link>
        <div className="mb-6 mt-3 flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-2xl font-normal">{loaded.vote.title}</h1>
          <Badge variant="secondary">{t(`votes.phase.${phase}`)}</Badge>
          {loaded.vote.announced_at ? (
            <Badge variant="outline">{t("votes.admin.announced")}</Badge>
          ) : null}
          <span className="flex-1" />
          <Button asChild variant="outline">
            <Link
              to="/manage/votes/preview/$slug"
              params={{ slug: loaded.vote.slug }}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Eye aria-hidden />
              {t("votes.admin.preview")}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/manage/votes/$id/results" params={{ id }}>
              {t("votes.admin.results")}
            </Link>
          </Button>
          <Button onClick={() => void save()} disabled={busy || translating || suggesting}>
            {busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {saved ? t("votes.admin.saved") : t("votes.admin.save")}
          </Button>
        </div>
        {error ? (
          <p role="alert" className="mb-4 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Tabs value={editingLocale} onValueChange={(value) => setEditingLocale(value as Locale)}>
            <TabsList>
              {LOCALE_ORDER.map((locale) => (
                <TabsTrigger key={locale} value={locale}>
                  {locale.toUpperCase()}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Button
            variant="outline"
            disabled={translating || busy || suggesting || locked || form.title.trim().length < 3}
            onClick={() => void translate()}
          >
            {translating ? (
              <Loader2 className="animate-spin" aria-hidden />
            ) : (
              <Languages aria-hidden />
            )}
            {t(translating ? "votes.admin.translating" : "votes.admin.translateAll")}
          </Button>
          <span role="status" className="text-sm text-muted-foreground">
            {t(
              translationNote
                ? "votes.admin.translationReview"
                : dirty
                  ? "votes.admin.unsaved"
                  : "votes.admin.saved",
            )}
          </span>
        </div>
        <fieldset disabled={translating || busy || suggesting}>
          <Tabs defaultValue="proposal">
            <TabsList>
              <TabsTrigger value="proposal">{t("votes.admin.content")}</TabsTrigger>
              <TabsTrigger value="ballot">{t("votes.admin.ballot")}</TabsTrigger>
              <TabsTrigger value="publishing">{t("votes.admin.publishing")}</TabsTrigger>
            </TabsList>
            <TabsContent value="proposal">
              <section className="py-5">
                <h2 className="text-sm font-bold">{t("votes.admin.content")}</h2>
                {textFields(editingLocale === "en" ? "" : `_${editingLocale}`)}
                <div className="mt-4 max-w-sm space-y-2">
                  <Label htmlFor="category">{t("votes.admin.fCategory")}</Label>
                  <Input
                    id="category"
                    value={form.category}
                    onChange={(e) => set("category", e.target.value)}
                  />
                </div>
              </section>

              <section className="border-t border-border py-5">
                <h2 className="text-sm font-bold">{t("votes.admin.attachments")}</h2>
                {loaded.attachments.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">{t("votes.admin.noFiles")}</p>
                ) : (
                  <ul className="mt-3 divide-y divide-border">
                    {loaded.attachments.map((f) => (
                      <li key={f.id} className="flex items-center justify-between py-2 text-sm">
                        {f.file_name}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            await removeVoteAttachment({ data: { id: f.id } });
                            setLoaded(await getVoteAdmin({ data: { id } }));
                          }}
                        >
                          {t("votes.admin.remove")}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  className="sr-only"
                  id="vote-file"
                  accept=".pdf,.ppt,.pptx,.key,.doc,.docx,.xlsx,.png,.jpg"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void upload(f);
                  }}
                />
                <Button
                  variant="outline"
                  className="mt-3"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload aria-hidden />
                  {uploading ? t("votes.admin.uploading") : t("votes.admin.upload")}
                </Button>
              </section>
            </TabsContent>
            <TabsContent value="ballot">
              <section className="py-5">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Label htmlFor="ballot-question-input">{t("votes.admin.fQuestion")}</Label>
                    {editingLocale === "en" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={
                          locked ||
                          suggesting ||
                          form.title.trim().length < 3 ||
                          !(form.description.trim() || form.summary.trim())
                        }
                        onClick={() => void suggest()}
                      >
                        {suggesting ? (
                          <Loader2 className="animate-spin" aria-hidden />
                        ) : (
                          <Sparkles aria-hidden />
                        )}
                        {t(
                          suggesting
                            ? "votes.admin.suggestingQuestion"
                            : "votes.admin.suggestQuestion",
                        )}
                      </Button>
                    ) : null}
                  </div>
                  <Textarea
                    id="ballot-question-input"
                    rows={3}
                    maxLength={600}
                    disabled={locked}
                    value={form[questionField]}
                    onChange={(e) => set(questionField, e.target.value)}
                  />
                </div>
                <div className="mt-6 space-y-2">
                  <Label>{t("votes.admin.fOptions")}</Label>
                  <ul className="space-y-2">
                    {form.options.map((o, i) => (
                      <li key={o.key} className="flex items-center gap-2">
                        <Input
                          value={
                            editingLocale === "en" ? o.label : (o[`label_${editingLocale}`] ?? "")
                          }
                          disabled={locked || translating}
                          aria-label={`${t("votes.admin.fOptions")} ${i + 1}`}
                          onChange={(e) => updateOption(i, e.target.value)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={
                            locked ||
                            translating ||
                            editingLocale !== "en" ||
                            form.options.length <= 2
                          }
                          aria-label={t("votes.admin.removeOption")}
                          onClick={() =>
                            set(
                              "options",
                              form.options.filter((_, j) => j !== i),
                            )
                          }
                        >
                          <Trash2 aria-hidden />
                        </Button>
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={
                        locked || translating || editingLocale !== "en" || form.options.length >= 10
                      }
                      onClick={addOption}
                    >
                      {t("votes.admin.addOption")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={editingLocale !== "en" || locked || translating}
                      onClick={() => set("options", DEFAULT_OPTIONS)}
                    >
                      {t("votes.admin.useYesNo")}
                    </Button>
                  </div>
                </div>

                <div className="mt-6 space-y-2">
                  <Label>{t("votes.admin.fResults")}</Label>
                  <RadioGroup
                    value={form.results_mode}
                    onValueChange={(v) => set("results_mode", v as Form["results_mode"])}
                  >
                    <Label className="flex items-center gap-2 font-normal">
                      <RadioGroupItem value="after_vote" />
                      {t("votes.admin.resultsAfterVote")}
                    </Label>
                    <Label className="flex items-center gap-2 font-normal">
                      <RadioGroupItem value="after_close" />
                      {t("votes.admin.resultsAfterClose")}
                    </Label>
                  </RadioGroup>
                </div>

                <div className="mt-6 space-y-3">
                  <Label className="flex items-center gap-3 font-normal">
                    <Switch
                      checked={form.rationale_enabled}
                      onCheckedChange={(v) => set("rationale_enabled", v)}
                    />
                    {t("votes.admin.fRationale")}
                  </Label>
                </div>
              </section>
            </TabsContent>
            <TabsContent value="publishing">
              <section className="py-5">
                <h2 className="text-sm font-bold">{t("votes.admin.settings")}</h2>
                {locked ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t("votes.admin.lockedHint")}
                  </p>
                ) : null}
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>{t("votes.admin.fStatus")}</Label>
                    <RadioGroup
                      value={form.status}
                      onValueChange={(v) => set("status", v as VoteStatus)}
                    >
                      {(["draft", "published", "archived"] as const).map((st) => (
                        <Label key={st} className="flex items-center gap-2 font-normal">
                          <RadioGroupItem value={st} />
                          {t(`votes.admin.status${st.charAt(0).toUpperCase()}${st.slice(1)}`)}
                        </Label>
                      ))}
                    </RadioGroup>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="opens">{t("votes.admin.fOpens")}</Label>
                    <Input
                      id="opens"
                      type="datetime-local"
                      value={form.opens}
                      disabled={locked}
                      onChange={(e) => set("opens", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="closes">{t("votes.admin.fCloses")}</Label>
                    <Input
                      id="closes"
                      type="datetime-local"
                      value={form.closes}
                      onChange={(e) => set("closes", e.target.value)}
                    />
                  </div>
                </div>

                <Label className="flex items-center gap-3 font-normal">
                  <Switch
                    checked={form.announce_enabled}
                    onCheckedChange={(v) => set("announce_enabled", v)}
                  />
                  {t("votes.admin.fAnnounce")}
                </Label>
              </section>
              {loaded.vote.status === "draft" ? (
                <Button
                  variant="destructive"
                  className="mt-6"
                  onClick={async () => {
                    if (!window.confirm(t("votes.admin.deleteConfirm"))) return;
                    await deleteVote({ data: { id } });
                    void navigate({ to: "/manage/votes" });
                  }}
                >
                  {t("votes.admin.delete")}
                </Button>
              ) : null}
            </TabsContent>
          </Tabs>
        </fieldset>
      </div>
    </Shell>
  );
}
