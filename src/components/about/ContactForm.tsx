"use client";

import * as React from "react";
import { Button, Input, Label, Textarea } from "@/design-system/icf-welcome-design-system-a835df";
import { useI18n } from "@/i18n";

const OFFICE_EMAIL = "office@coachingfederation.ch";

export function ContactForm() {
  const { t } = useI18n();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [message, setMessage] = React.useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Contact from ${name || "ICF Website"}`);
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
    window.location.href = `mailto:${OFFICE_EMAIL}?subject=${subject}&body=${body}`;
  };

  return (
    <section id="contact" className="bg-card py-24" aria-label={t("about.contact.eyebrow")}>
      <div className="mx-auto max-w-7xl px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">{t("about.contact.eyebrow")}</p>
          <h2 className="mt-3 display-lg">{t("about.contact.title")}</h2>
          <p className="mt-4 text-muted-foreground">{t("about.contact.lede")}</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mx-auto mt-12 max-w-xl rounded-2xl border border-border/70 bg-card p-8 shadow-sm"
        >
          <div className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="contact-name">{t("about.contact.nameLabel")}</Label>
              <Input
                id="contact-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("about.contact.namePlaceholder")}
                required
                autoComplete="name"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="contact-email">{t("about.contact.emailLabel")}</Label>
              <Input
                id="contact-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("about.contact.emailPlaceholder")}
                required
                autoComplete="email"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="contact-message">{t("about.contact.messageLabel")}</Label>
              <Textarea
                id="contact-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("about.contact.messagePlaceholder")}
                required
                rows={5}
              />
            </div>

            <Button type="submit" size="pill" className="w-full">
              {t("about.contact.send")}
            </Button>

          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            {t("about.contact.privacy")}{" "}
            <a
              href="/privacy"
              target="_top"
              className="underline underline-offset-2 hover:text-primary"
            >
              {t("common.footer.privacy")}
            </a>
            .
          </p>
        </form>
      </div>
    </section>
  );
}
