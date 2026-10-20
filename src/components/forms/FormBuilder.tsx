/**
 * Preview-first form builder, used for event forms and for library templates.
 *
 * Left: the form as attendees will see it. Clicking a question selects it and
 * turns its wording into editable fields in place; a "+" between questions
 * inserts a new one. Right: a side panel with three tabs — the selected
 * question's settings, the form's own settings, and the translations (rarely
 * needed, so never the default tab). Below 768px the side panel becomes a
 * bottom sheet. One save bar with Ctrl/Cmd-S covers everything.
 *
 * Persistence is handed in through `onSave`, so the same builder serves both
 * scopes. German, French and Italian are machine-translated on every save;
 * a failed translation never blocks the save.
 */
import * as React from "react";
import { ArrowDown, ArrowUp, Eye, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Accordion,
  Badge,
  Button,
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from "@/design-system/icf-welcome-design-system-a835df";
import { FormQuestionFields } from "./FormQuestionFields";
import { QUESTION_TYPES, conditionValuesFor, type QuestionType } from "@/lib/event-forms";
import {
  TRANSLATED_LOCALES,
  applyTranslation,
  builderReducer,
  canBeConditionSource,
  snapshot,
  toPreviewQuestions,
  translationInput,
  usesOptions,
  validateForm,
  type BuilderForm,
  type BuilderQuestion,
  type TranslatedLocale,
} from "@/lib/forms/builder-state";
import { translateEventForm } from "@/lib/event-form-translations.functions";
import { useSaveShortcut } from "@/hooks/use-save-shortcut";
import { useIsMobile } from "@/hooks/use-mobile";

const fieldClass =
  "mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export type CopySource = { id: string; label: string };

export function FormBuilder({
  kind,
  initial,
  scope,
  onSave,
  copySources,
  copyFrom,
  t,
}: {
  kind: "registration" | "follow_up";
  initial: BuilderForm;
  /** Event forms have Active and automatic sending; templates do not. */
  scope: "event" | "template";
  onSave: (form: BuilderForm) => Promise<void>;
  copySources?: () => Promise<CopySource[]>;
  copyFrom?: (id: string) => Promise<BuilderQuestion[]>;
  t: (k: string) => string;
}) {
  const [form, dispatch] = React.useReducer(builderReducer, initial);
  const [saved, setSaved] = React.useState(() => snapshot(initial));
  const [savedForm, setSavedForm] = React.useState(initial);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState("question");
  const [tryIt, setTryIt] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const isMobile = useIsMobile();
  const withTexts = kind === "follow_up";

  const dirty = snapshot(form) !== saved;
  const issues = validateForm(form);
  const current = form.questions.find((q) => q.uid === selected) ?? null;

  const select = (uid: string) => {
    setSelected(uid);
    setTab("question");
    setTryIt(false);
  };

  const add = (qtype: QuestionType, at: number) => {
    const uid = `n${Date.now().toString(36)}${at}`;
    dispatch({ type: "add", qtype, at, uid });
    select(uid);
  };

  const translate = async (source: BuilderForm) => {
    const result = await translateEventForm({ data: translationInput(source, withTexts) });
    return applyTranslation(source, result);
  };

  const save = async () => {
    if (saving || !dirty || issues.length > 0) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    let next = form;
    let translationFailed = false;
    try {
      next = await translate(form);
    } catch {
      translationFailed = true;
    }
    try {
      await onSave(next);
      dispatch({ type: "replace", form: next });
      setSaved(snapshot(next));
      setSavedForm(next);
      setMessage(translationFailed ? t("events.forms.savedNoTranslation") : t("events.forms.saved"));
    } catch (e) {
      // The draft stays on screen so nothing typed is lost.
      setError(e instanceof Error ? e.message : String(e));
    }
    setSaving(false);
  };

  const retranslate = async () => {
    setSaving(true);
    setError(null);
    try {
      dispatch({ type: "replace", form: await translate(form) });
      setMessage(t("forms.translations.done"));
    } catch {
      setError(t("forms.translations.failed"));
    }
    setSaving(false);
  };

  useSaveShortcut(save, saving || !dirty);

  const inspector = (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="w-full">
        <TabsTrigger value="question" className="flex-1">
          {t("forms.tab.question")}
        </TabsTrigger>
        <TabsTrigger value="form" className="flex-1">
          {t("forms.tab.form")}
        </TabsTrigger>
        <TabsTrigger value="translations" className="flex-1">
          {t("forms.tab.translations")}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="question" className="mt-4">
        {current ? (
          <QuestionInspector
            question={current}
            earlier={form.questions.slice(
              0,
              form.questions.findIndex((q) => q.uid === current.uid),
            )}
            onPatch={(patch) => dispatch({ type: "patch", uid: current.uid, patch })}
            onRemove={() => {
              dispatch({ type: "remove", uid: current.uid });
              setSelected(null);
            }}
            t={t}
          />
        ) : (
          <p className="text-sm text-muted-foreground">{t("forms.selectHint")}</p>
        )}
      </TabsContent>

      <TabsContent value="form" className="mt-4 space-y-4">
        <div>
          <Label htmlFor="fb-name">{t("events.forms.name")}</Label>
          <Input
            id="fb-name"
            className="mt-1"
            value={form.name}
            onChange={(e) => dispatch({ type: "setForm", patch: { name: e.target.value } })}
          />
        </div>
        {scope === "event" ? (
          <SwitchRow
            id="fb-active"
            label={t("events.forms.active")}
            hint={t("forms.activeHint")}
            checked={form.active}
            onChange={(v) => dispatch({ type: "setForm", patch: { active: v } })}
          />
        ) : null}
        {scope === "event" && withTexts ? (
          <SwitchRow
            id="fb-autosend"
            label={t("events.forms.autoSend")}
            hint={
              form.autoSentAt
                ? `${t("events.forms.autoSentOn")} ${new Date(form.autoSentAt).toLocaleString()}`
                : t("events.forms.autoSendHint")
            }
            checked={form.autoSend}
            onChange={(v) => dispatch({ type: "setForm", patch: { autoSend: v } })}
          />
        ) : null}
        {withTexts ? (
          <>
            <div>
              <Label htmlFor="fb-intro">{t("events.forms.intro")}</Label>
              <Textarea
                id="fb-intro"
                className="mt-1"
                rows={3}
                value={form.intro}
                onChange={(e) => dispatch({ type: "setForm", patch: { intro: e.target.value } })}
              />
            </div>
            <div>
              <Label htmlFor="fb-thanks">{t("events.forms.thankYou")}</Label>
              <Textarea
                id="fb-thanks"
                className="mt-1"
                rows={3}
                value={form.thankYou}
                onChange={(e) =>
                  dispatch({ type: "setForm", patch: { thankYou: e.target.value } })
                }
              />
            </div>
          </>
        ) : null}
        {copySources && copyFrom ? (
          <CopyQuestions
            sources={copySources}
            onPick={async (id) => {
              try {
                dispatch({ type: "append", questions: await copyFrom(id) });
              } catch (e) {
                setError(e instanceof Error ? e.message : String(e));
              }
            }}
            t={t}
          />
        ) : null}
      </TabsContent>

      <TabsContent value="translations" className="mt-4">
        <TranslationsPanel
          form={form}
          withTexts={withTexts}
          dispatch={dispatch}
          onRetranslate={retranslate}
          busy={saving}
          t={t}
        />
      </TabsContent>
    </Tabs>
  );

  const preview = toPreviewQuestions(form.questions);

  return (
    <div>
      <div className="grid gap-6 md:grid-cols-5">
        {/* Live preview */}
        <section aria-label={t("forms.previewLabel")} className="md:col-span-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="eyebrow text-muted-foreground">{t("forms.previewLabel")}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTryIt((v) => !v);
                setSelected(null);
              }}
              aria-pressed={tryIt}
            >
              {tryIt ? <Pencil /> : <Eye />}
              {tryIt ? t("forms.backToEditing") : t("forms.tryIt")}
            </Button>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            {withTexts && form.intro ? (
              <p className="mb-4 text-sm text-muted-foreground">{form.intro}</p>
            ) : null}

            {tryIt ? (
              <TryItPreview questions={preview} />
            ) : form.questions.length === 0 ? (
              <EmptyForm onAdd={(type) => add(type, 0)} t={t} />
            ) : (
              <ol className="space-y-1">
                {form.questions.map((q, i) => (
                  <li key={q.uid}>
                    <QuestionCard
                      question={q}
                      index={i}
                      total={form.questions.length}
                      selected={q.uid === selected}
                      sourceLabel={
                        q.condition_uid
                          ? (form.questions.find((s) => s.uid === q.condition_uid)?.label ?? "")
                          : null
                      }
                      preview={{ ...preview[i]!, conditionQuestionId: null }}
                      onSelect={() => select(q.uid)}
                      onPatch={(patch) => dispatch({ type: "patch", uid: q.uid, patch })}
                      onMove={(to) => dispatch({ type: "move", uid: q.uid, to })}
                      onDropFrom={(from) => {
                        const dragged = form.questions[from];
                        if (dragged) dispatch({ type: "move", uid: dragged.uid, to: i });
                      }}
                      t={t}
                    />
                    <AddBetween onAdd={(type) => add(type, i + 1)} t={t} />
                  </li>
                ))}
              </ol>
            )}

            {withTexts && form.thankYou ? (
              <p className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">
                {form.thankYou}
              </p>
            ) : null}
          </div>
        </section>

        {/* Side panel: a bottom sheet on phones while a question is selected. */}
        {isMobile ? (
          <>
            <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
              <SheetContent side="bottom" className="max-h-screen overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>{t("forms.panelLabel")}</SheetTitle>
                </SheetHeader>
                <div className="mt-4">{selected !== null ? inspector : null}</div>
              </SheetContent>
            </Sheet>
            {selected === null ? (
              <div className="rounded-2xl border border-border bg-card p-4">{inspector}</div>
            ) : null}
          </>
        ) : (
          <aside
            aria-label={t("forms.panelLabel")}
            className="rounded-2xl border border-border bg-card p-4 md:sticky md:top-6 md:col-span-2 md:self-start"
          >
            {inspector}
          </aside>
        )}
      </div>

      {/* Save bar */}
      <div className="sticky bottom-0 z-20 mt-6 border-t border-border bg-card px-4 py-3 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0" role="status" aria-live="polite">
            <p className="text-sm font-semibold">
              {saving
                ? t("events.forms.translatingAndSaving")
                : dirty
                  ? t("events.editor.unsaved")
                  : t("events.editor.saved")}
            </p>
            {error ? (
              <p className="text-xs text-destructive">{error}</p>
            ) : dirty && issues.length > 0 ? (
              <p className="text-xs text-destructive">{issues.map((k) => t(k)).join(" ")}</p>
            ) : message ? (
              <p className="text-xs text-muted-foreground">{message}</p>
            ) : (
              <p className="text-xs text-muted-foreground">{t("forms.saveHint")}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {dirty ? (
              <Button
                variant="outline"
                size="pill"
                disabled={saving}
                onClick={() => {
                  dispatch({ type: "replace", form: savedForm });
                  setSelected(null);
                  setError(null);
                }}
              >
                {t("events.editor.discard")}
              </Button>
            ) : null}
            <Button
              size="pill"
              onClick={() => void save()}
              disabled={saving || !dirty || issues.length > 0}
            >
              {saving ? t("events.forms.saving") : t("events.forms.save")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function SwitchRow({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <Label htmlFor={id}>{label}</Label>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function TypePicker({
  onPick,
  t,
  children,
}: {
  onPick: (type: QuestionType) => void;
  t: (k: string) => string;
  children: React.ReactNode;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {QUESTION_TYPES.map((type) => (
          <DropdownMenuItem key={type} onSelect={() => onPick(type)}>
            {t(`events.forms.type.${type}`)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AddBetween({ onAdd, t }: { onAdd: (type: QuestionType) => void; t: (k: string) => string }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="h-px flex-1 bg-border" aria-hidden />
      <TypePicker onPick={onAdd} t={t}>
        <Button variant="ghost" size="sm" aria-label={t("events.forms.addQuestion")}>
          <Plus />
          {t("forms.add")}
        </Button>
      </TypePicker>
      <span className="h-px flex-1 bg-border" aria-hidden />
    </div>
  );
}

function EmptyForm({ onAdd, t }: { onAdd: (type: QuestionType) => void; t: (k: string) => string }) {
  return (
    <div className="py-8 text-center">
      <p className="text-sm text-muted-foreground">{t("forms.emptyForm")}</p>
      <div className="mt-4 flex justify-center">
        <TypePicker onPick={onAdd} t={t}>
          <Button size="pill">
            <Plus />
            {t("forms.addFirst")}
          </Button>
        </TypePicker>
      </div>
    </div>
  );
}

function TryItPreview({ questions }: { questions: ReturnType<typeof toPreviewQuestions> }) {
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  return (
    <div className="space-y-4">
      <FormQuestionFields
        questions={questions}
        answers={answers}
        onChange={(key, value) => setAnswers((prev) => ({ ...prev, [key]: value }))}
        idPrefix="try"
        inputClass={fieldClass}
      />
    </div>
  );
}

function QuestionCard({
  question,
  index,
  total,
  selected,
  sourceLabel,
  preview,
  onSelect,
  onPatch,
  onMove,
  onDropFrom,
  t,
}: {
  question: BuilderQuestion;
  index: number;
  total: number;
  selected: boolean;
  sourceLabel: string | null;
  preview: ReturnType<typeof toPreviewQuestions>[number];
  onSelect: () => void;
  onPatch: (patch: Partial<BuilderQuestion>) => void;
  onMove: (to: number) => void;
  onDropFrom: (from: number) => void;
  t: (k: string) => string;
}) {
  const [dragOver, setDragOver] = React.useState(false);
  const typeLabel = t(`events.forms.type.${question.qtype}`);

  return (
    <div
      className={
        "group rounded-xl border p-3 transition " +
        (selected
          ? "border-primary bg-background"
          : dragOver
            ? "border-primary"
            : "border-transparent hover:border-border")
      }
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const from = Number(e.dataTransfer.getData("text/plain"));
        // The dragged question lands where this one sits.
        if (!Number.isNaN(from) && from !== index) onDropFrom(from);
      }}
    >
      <div className="flex items-start gap-2">
        <span
          draggable
          onDragStart={(e) => e.dataTransfer.setData("text/plain", String(index))}
          className="mt-1 cursor-grab text-muted-foreground"
          aria-hidden
        >
          <GripVertical className="size-4" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground">{index + 1}</span>
            <Badge variant="secondary">{typeLabel}</Badge>
            {question.is_required ? <Badge variant="outline">{t("events.forms.required")}</Badge> : null}
            {sourceLabel !== null ? (
              <span className="text-xs text-muted-foreground">
                {t("forms.shownIf")} {sourceLabel || `#`} = {question.condition_value || "…"}
              </span>
            ) : null}
          </div>

          {selected ? (
            <InlineEditor question={question} onPatch={onPatch} t={t} />
          ) : (
            <button
              type="button"
              onClick={onSelect}
              className="block w-full rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`${t("forms.editQuestion")} ${index + 1}: ${question.label || typeLabel}`}
            >
              {question.label.trim() === "" ? (
                <span className="text-sm italic text-muted-foreground">{t("forms.untitled")}</span>
              ) : (
                <span className="pointer-events-none block space-y-1" inert>
                  <FormQuestionFields
                    questions={[preview]}
                    answers={{}}
                    onChange={() => undefined}
                    idPrefix={`pv-${question.uid}`}
                    inputClass={fieldClass}
                    disabled
                  />
                </span>
              )}
            </button>
          )}
        </div>

        <div className="flex flex-col gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={index === 0}
            onClick={() => onMove(index - 1)}
            aria-label={`${t("forms.moveUp")} ${index + 1}`}
          >
            <ArrowUp />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={index === total - 1}
            onClick={() => onMove(index + 1)}
            aria-label={`${t("forms.moveDown")} ${index + 1}`}
          >
            <ArrowDown />
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Wording, help and answer options, edited where the attendee reads them. */
function InlineEditor({
  question,
  onPatch,
  t,
}: {
  question: BuilderQuestion;
  onPatch: (patch: Partial<BuilderQuestion>) => void;
  t: (k: string) => string;
}) {
  const id = `ie-${question.uid}`;
  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor={`${id}-label`} className="sr-only">
          {t("events.forms.questionLabel")}
        </Label>
        <Input
          id={`${id}-label`}
          autoFocus
          placeholder={t("forms.labelPlaceholder")}
          value={question.label}
          onChange={(e) => onPatch({ label: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor={`${id}-help`} className="sr-only">
          {t("events.forms.help")}
        </Label>
        <Input
          id={`${id}-help`}
          placeholder={t("forms.helpPlaceholder")}
          value={question.help_text}
          onChange={(e) => onPatch({ help_text: e.target.value })}
        />
      </div>
      {usesOptions(question) ? (
        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold">{t("events.forms.options")}</legend>
          {question.options.map((option, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                aria-label={`${t("forms.option")} ${i + 1}`}
                value={option}
                onChange={(e) =>
                  onPatch({
                    options: question.options.map((o, j) => (j === i ? e.target.value : o)),
                  })
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onPatch({ options: [...question.options, ""] });
                  }
                }}
              />
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`${t("forms.removeOption")} ${i + 1}`}
                onClick={() => onPatch({ options: question.options.filter((_, j) => j !== i) })}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPatch({ options: [...question.options, ""] })}
          >
            <Plus />
            {t("forms.addOption")}
          </Button>
        </fieldset>
      ) : null}
    </div>
  );
}

function QuestionInspector({
  question,
  earlier,
  onPatch,
  onRemove,
  t,
}: {
  question: BuilderQuestion;
  earlier: BuilderQuestion[];
  onPatch: (patch: Partial<BuilderQuestion>) => void;
  onRemove: () => void;
  t: (k: string) => string;
}) {
  const sources = earlier.filter(canBeConditionSource);
  const source = earlier.find((q) => q.uid === question.condition_uid);
  const values = source
    ? conditionValuesFor({
        id: source.uid,
        key: source.question_key,
        type: source.qtype,
        label: source.label,
        help: null,
        options: source.options.filter((o) => o.trim()),
        optionLabels: source.options,
        ratingMax: source.rating_max,
        scaleLow: null,
        scaleHigh: null,
        required: source.is_required,
        conditionQuestionId: null,
        conditionValue: null,
      })
    : [];
  const NONE = "__none__";

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="qi-type">{t("events.forms.questionType")}</Label>
        <Select
          value={question.qtype}
          onValueChange={(v) => {
            const qtype = v as QuestionType;
            onPatch({
              qtype,
              ...(usesOptions({ qtype }) && question.options.length === 0
                ? { options: ["", ""] }
                : {}),
            });
          }}
        >
          <SelectTrigger id="qi-type" className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {QUESTION_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {t(`events.forms.type.${type}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {question.qtype !== "heading" ? (
        <SwitchRow
          id="qi-required"
          label={t("events.forms.required")}
          checked={question.is_required}
          onChange={(v) => onPatch({ is_required: v })}
        />
      ) : null}

      {question.qtype === "rating" ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="qi-max">{t("events.forms.ratingMax")}</Label>
            <Input
              id="qi-max"
              className="mt-1"
              type="number"
              min={2}
              max={10}
              value={question.rating_max}
              onChange={(e) => onPatch({ rating_max: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label htmlFor="qi-low">{t("events.forms.scaleLow")}</Label>
            <Input
              id="qi-low"
              className="mt-1"
              value={question.scale_low_label}
              onChange={(e) => onPatch({ scale_low_label: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="qi-high">{t("events.forms.scaleHigh")}</Label>
            <Input
              id="qi-high"
              className="mt-1"
              value={question.scale_high_label}
              onChange={(e) => onPatch({ scale_high_label: e.target.value })}
            />
          </div>
        </div>
      ) : null}

      {question.qtype !== "heading" ? (
        <fieldset>
          <legend className="text-sm font-medium">{t("forms.rule.title")}</legend>
          {sources.length === 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">{t("forms.rule.none")}</p>
          ) : (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span>{t("forms.rule.showIf")}</span>
              <Select
                value={question.condition_uid ?? NONE}
                onValueChange={(v) =>
                  onPatch({ condition_uid: v === NONE ? null : v, condition_value: "" })
                }
              >
                <SelectTrigger aria-label={t("events.forms.conditionOn")} className="w-auto">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>{t("events.forms.conditionNone")}</SelectItem>
                  {sources.map((s) => (
                    <SelectItem key={s.uid} value={s.uid}>
                      {s.label || t("forms.untitled")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {source ? (
                <>
                  <span>{t("forms.rule.is")}</span>
                  <Select
                    value={question.condition_value || undefined}
                    onValueChange={(v) => onPatch({ condition_value: v })}
                  >
                    <SelectTrigger aria-label={t("events.forms.conditionValue")} className="w-auto">
                      <SelectValue placeholder={t("forms.rule.pick")} />
                    </SelectTrigger>
                    <SelectContent>
                      {values.map((v) => (
                        <SelectItem key={v} value={v}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              ) : null}
            </div>
          )}
        </fieldset>
      ) : null}

      <div className="border-t border-border pt-4">
        <Button variant="outline" size="sm" onClick={onRemove}>
          <Trash2 />
          {t("events.forms.removeQuestion")}
        </Button>
      </div>
    </div>
  );
}

function CopyQuestions({
  sources,
  onPick,
  t,
}: {
  sources: () => Promise<CopySource[]>;
  onPick: (id: string) => Promise<void>;
  t: (k: string) => string;
}) {
  const [list, setList] = React.useState<CopySource[] | null>(null);
  return (
    <div className="border-t border-border pt-4">
      <Label>{t("events.forms.copyFrom")}</Label>
      <Select
        value=""
        onOpenChange={(open) => {
          if (open && list === null) void sources().then(setList).catch(() => setList([]));
        }}
        onValueChange={(v) => void onPick(v)}
      >
        <SelectTrigger className="mt-1">
          <SelectValue placeholder={t("forms.copyPlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          {(list ?? []).map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.label}
            </SelectItem>
          ))}
          {list !== null && list.length === 0 ? (
            <p className="px-2 py-1 text-xs text-muted-foreground">{t("forms.copyEmpty")}</p>
          ) : null}
        </SelectContent>
      </Select>
    </div>
  );
}

function TranslationsPanel({
  form,
  withTexts,
  dispatch,
  onRetranslate,
  busy,
  t,
}: {
  form: BuilderForm;
  withTexts: boolean;
  dispatch: React.Dispatch<Parameters<typeof builderReducer>[1]>;
  onRetranslate: () => Promise<void>;
  busy: boolean;
  t: (k: string) => string;
}) {
  const missing = (q: BuilderQuestion, l: TranslatedLocale) => q.label.trim() !== "" && !q[`label_${l}`];
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">{t("events.forms.translationHint")}</p>
      <Button variant="outline" size="sm" disabled={busy} onClick={() => void onRetranslate()}>
        {t("forms.translations.retranslate")}
      </Button>
      <Accordion type="multiple">
        {withTexts ? (
          <AccordionItem value="texts">
            <AccordionTrigger>{t("forms.translations.texts")}</AccordionTrigger>
            <AccordionContent className="space-y-3">
              {TRANSLATED_LOCALES.map((l) => (
                <div key={l} className="space-y-2">
                  <p className="eyebrow text-muted-foreground">{l.toUpperCase()}</p>
                  <Textarea
                    aria-label={`${t("events.forms.intro")} ${l.toUpperCase()}`}
                    rows={2}
                    value={form.introTrans[l]}
                    onChange={(e) =>
                      dispatch({
                        type: "setForm",
                        patch: { introTrans: { ...form.introTrans, [l]: e.target.value } },
                      })
                    }
                  />
                  <Textarea
                    aria-label={`${t("events.forms.thankYou")} ${l.toUpperCase()}`}
                    rows={2}
                    value={form.thankYouTrans[l]}
                    onChange={(e) =>
                      dispatch({
                        type: "setForm",
                        patch: { thankYouTrans: { ...form.thankYouTrans, [l]: e.target.value } },
                      })
                    }
                  />
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>
        ) : null}
        {form.questions.map((q, i) => (
          <AccordionItem key={q.uid} value={q.uid}>
            <AccordionTrigger>
              <span className="flex items-center gap-2 text-left">
                {i + 1}. {q.label || t("forms.untitled")}
                {TRANSLATED_LOCALES.some((l) => missing(q, l)) ? (
                  <Badge variant="outline">{t("forms.translations.missing")}</Badge>
                ) : null}
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              {TRANSLATED_LOCALES.map((l) => (
                <div key={l} className="space-y-2">
                  <p className="eyebrow text-muted-foreground">{l.toUpperCase()}</p>
                  <Input
                    aria-label={`${t("events.forms.questionLabel")} ${l.toUpperCase()}`}
                    value={q[`label_${l}`]}
                    onChange={(e) =>
                      dispatch({ type: "patch", uid: q.uid, patch: { [`label_${l}`]: e.target.value } })
                    }
                  />
                  {q.help_text ? (
                    <Input
                      aria-label={`${t("events.forms.help")} ${l.toUpperCase()}`}
                      value={q[`help_text_${l}`]}
                      onChange={(e) =>
                        dispatch({
                          type: "patch",
                          uid: q.uid,
                          patch: { [`help_text_${l}`]: e.target.value },
                        })
                      }
                    />
                  ) : null}
                  {usesOptions(q) ? (
                    <Textarea
                      aria-label={`${t("events.forms.options")} ${l.toUpperCase()}`}
                      rows={3}
                      value={q[`options_${l}`].join("\n")}
                      onChange={(e) =>
                        dispatch({
                          type: "patch",
                          uid: q.uid,
                          patch: { [`options_${l}`]: e.target.value.split("\n") },
                        })
                      }
                    />
                  ) : null}
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
