/**
 * Renders the questions of an event form.
 *
 * One component for all three surfaces — the public registration panel, the
 * follow-up page and the organizer's preview — so a question can never look
 * or behave differently depending on where it is shown. Conditions are
 * evaluated here and re-checked server-side before anything is stored.
 */
import {
  MULTI_SEPARATOR,
  isQuestionVisible,
  type PublicFormQuestion,
} from "@/lib/event-forms";

export function FormQuestionFields({
  questions,
  answers,
  onChange,
  idPrefix = "q",
  inputClass,
  disabled = false,
}: {
  questions: PublicFormQuestion[];
  answers: Record<string, string>;
  onChange: (key: string, value: string) => void;
  idPrefix?: string;
  inputClass: string;
  disabled?: boolean;
}) {
  const byId = new Map(questions.map((q) => [q.id, q]));

  return (
    <>
      {questions.map((question) => {
        if (!isQuestionVisible(question, answers, byId)) return null;
        const id = `${idPrefix}-${question.id}`;
        const value = answers[question.key] ?? "";
        const update = (next: string) => onChange(question.key, next);

        if (question.type === "heading") {
          return (
            <div key={question.id} className="pt-2">
              <p className="text-sm font-semibold">{question.label}</p>
              {question.help ? (
                <p className="mt-1 text-xs text-muted-foreground">{question.help}</p>
              ) : null}
            </div>
          );
        }

        if (question.type === "yes_no") {
          return (
            <div key={question.id}>
              <label className="flex items-start gap-2 text-xs font-semibold">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  disabled={disabled}
                  required={question.required}
                  checked={value === "true"}
                  onChange={(e) => update(e.target.checked ? "true" : "false")}
                />
                <span>{question.label}</span>
              </label>
              {question.help ? (
                <p className="mt-1 text-xs text-muted-foreground">{question.help}</p>
              ) : null}
            </div>
          );
        }

        return (
          <div key={question.id}>
            <label className="block text-xs font-semibold" htmlFor={id}>
              {question.label}
              {question.required ? " *" : ""}
            </label>
            {question.help ? (
              <p className="mb-1 mt-0.5 text-xs text-muted-foreground">{question.help}</p>
            ) : null}

            {question.type === "single_choice" ? (
              <select
                id={id}
                disabled={disabled}
                required={question.required}
                value={value}
                onChange={(e) => update(e.target.value)}
                className={inputClass}
              >
                <option value="" />
                {question.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : question.type === "multi_choice" ? (
              <div className="mt-1 space-y-1">
                {question.options.map((option) => {
                  const picked = value ? value.split(MULTI_SEPARATOR) : [];
                  const checked = picked.includes(option);
                  return (
                    <label key={option} className="flex items-start gap-2 text-xs">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        disabled={disabled}
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...picked, option]
                            : picked.filter((v) => v !== option);
                          update(
                            question.options
                              .filter((o) => next.includes(o))
                              .join(MULTI_SEPARATOR),
                          );
                        }}
                      />
                      <span>{option}</span>
                    </label>
                  );
                })}
              </div>
            ) : question.type === "rating" ? (
              <div className="mt-1">
                <div className="flex flex-wrap gap-1">
                  {Array.from({ length: question.ratingMax }, (_, i) => String(i + 1)).map(
                    (score) => (
                      <button
                        key={score}
                        type="button"
                        disabled={disabled}
                        onClick={() => update(value === score ? "" : score)}
                        aria-pressed={value === score}
                        className={`min-h-11 min-w-11 rounded-full border px-3 text-sm font-semibold ${
                          value === score
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border hover:bg-secondary"
                        }`}
                      >
                        {score}
                      </button>
                    ),
                  )}
                </div>
                {question.scaleLow || question.scaleHigh ? (
                  <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                    <span>{question.scaleLow}</span>
                    <span>{question.scaleHigh}</span>
                  </div>
                ) : null}
              </div>
            ) : question.type === "long_text" ? (
              <textarea
                id={id}
                rows={3}
                disabled={disabled}
                required={question.required}
                value={value}
                onChange={(e) => update(e.target.value)}
                className={inputClass}
              />
            ) : (
              <input
                id={id}
                disabled={disabled}
                required={question.required}
                value={value}
                onChange={(e) => update(e.target.value)}
                className={inputClass}
              />
            )}
          </div>
        );
      })}
    </>
  );
}