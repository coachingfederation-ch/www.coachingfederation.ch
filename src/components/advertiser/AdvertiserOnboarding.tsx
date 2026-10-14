/**
 * First-time profile step for external advertisers. Saving it grants the
 * `advertiser` role server-side (see advertisers.functions.ts).
 */
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
} from "@/design-system/icf-welcome-design-system-a835df";
import { useCms } from "@/i18n/cms";
import { completeAdvertiserOnboarding } from "@/lib/advertisers.functions";

const FIELDS = [
  { key: "organisation", required: true, autoComplete: "organization" },
  { key: "contactName", required: true, autoComplete: "name" },
  { key: "phone", required: false, autoComplete: "tel" },
  { key: "billingStreet", required: true, autoComplete: "street-address" },
  { key: "billingPostcode", required: true, autoComplete: "postal-code" },
  { key: "billingCity", required: true, autoComplete: "address-level2" },
  { key: "billingCountry", required: true, autoComplete: "country-name" },
  { key: "vatNumber", required: false, autoComplete: "off" },
] as const;

type Key = (typeof FIELDS)[number]["key"];

export function AdvertiserOnboarding() {
  const { t } = useCms();
  const queryClient = useQueryClient();
  const save = useServerFn(completeAdvertiserOnboarding);
  const [values, setValues] = useState<Record<Key, string>>({
    organisation: "",
    contactName: "",
    phone: "",
    billingStreet: "",
    billingPostcode: "",
    billingCity: "",
    billingCountry: "Switzerland",
    vatNumber: "",
  });

  const mutation = useMutation({
    mutationFn: () => save({ data: values }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["my-roles"] });
    },
  });

  return (
    <Card className="mx-auto max-w-xl">
      <CardContent className="py-8">
        <h1 className="font-heading text-3xl text-foreground">{t("advertiser.onboarding.title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("advertiser.onboarding.intro")}</p>
        <form
          className="mt-6 grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          {FIELDS.map((f) => (
            <div key={f.key} className="grid gap-1.5">
              <Label htmlFor={`adv-${f.key}`}>
                {t(`advertiser.profile.${f.key}`)}
                {f.required ? "" : ` (${t("advertiser.onboarding.optional")})`}
              </Label>
              <Input
                id={`adv-${f.key}`}
                required={f.required}
                autoComplete={f.autoComplete}
                value={values[f.key]}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              />
            </div>
          ))}
          {mutation.error ? (
            <p role="alert" className="text-sm text-destructive">
              {mutation.error instanceof Error ? mutation.error.message : t("auth.genericError")}
            </p>
          ) : null}
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? t("auth.wait") : t("advertiser.onboarding.submit")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
