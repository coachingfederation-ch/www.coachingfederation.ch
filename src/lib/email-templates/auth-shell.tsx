/**
 * Shared ICF-branded shell for the six Supabase auth emails.
 *
 * The auth emails are scaffolded per action type but must look like the rest
 * of the chapter's mail (member claim invitation, event confirmations), so the
 * banner, typography, button and footer live here once instead of being
 * copy-pasted into each template.
 *
 * Exports: AuthEmailShell, AuthButton, AuthLocale, normalizeAuthLocale,
 * authStyles. Used by the auth templates in this directory.
 */
import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import logoNegativeAsset from "@/assets/icf-horizontal-negative.png.asset.json";
import logoWhiteAsset from "@/assets/icf-horizontal-white.png.asset.json";
import { SITE_URL } from "@/i18n/config";

/** The four chapter languages every auth email is written in. */
export const AUTH_LOCALES = ["en", "de", "fr", "it"] as const;
export type AuthLocale = (typeof AUTH_LOCALES)[number];

export function normalizeAuthLocale(value: string | null | undefined): AuthLocale {
  const candidate = (value ?? "").slice(0, 2).toLowerCase();
  return (AUTH_LOCALES as readonly string[]).includes(candidate) ? (candidate as AuthLocale) : "en";
}

function assetUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL.replace(/\/$/, "")}${path}`;
}

export function AuthEmailShell({
  locale = "en",
  preview,
  tag,
  heading,
  children,
}: {
  locale?: AuthLocale;
  preview: string;
  tag: string;
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <Html lang={locale} dir="ltr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={banner}>
            <div style={bannerInner}>
              <Img
                src={assetUrl(logoNegativeAsset.url)}
                alt="The Switzerland Chapter of ICF"
                width={210}
                height={79}
                style={logoStyle}
              />
              <span style={bannerTag}>{tag}</span>
            </div>
          </Section>

          <Section style={content}>
            <Heading style={headingStyle}>{heading}</Heading>
            <div style={{ marginBottom: "24px" }}>
              <BrushUnderline />
            </div>
            {children}
          </Section>

          <Section style={footer}>
            <Img
              src={assetUrl(logoWhiteAsset.url)}
              alt="The Switzerland Chapter of ICF"
              width={150}
              height={56}
              style={footerLogoStyle}
            />
            <Text style={footerText}>
              © {new Date().getFullYear()} The Switzerland Chapter of ICF
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

/** Primary call to action, styled once so every auth email matches. */
export function AuthButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Section style={{ margin: "32px 0" }}>
      <Button style={button} href={href}>
        {children}
      </Button>
    </Section>
  );
}

/** Link shown for clients that strip buttons. */
export function AuthFallbackLink({ label, href }: { label: string; href: string }) {
  return (
    <>
      <Text style={muted}>{label}</Text>
      <Text style={urlText}>
        <Link href={href} style={{ color: "#2B379B" }}>
          {href}
        </Link>
      </Text>
    </>
  );
}

const BrushUnderline = () => (
  <svg
    width="100%"
    height="12"
    viewBox="0 0 400 12"
    preserveAspectRatio="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: "block" }}
  >
    <path d="M0,8 Q100,2 200,8 T400,6 L400,12 L0,12 Z" fill="#5778FA" fillOpacity="0.35" />
  </svg>
);

const main = {
  backgroundColor: "#F8F0E4",
  fontFamily: "Helvetica, Arial, sans-serif",
  margin: 0,
  padding: "24px 0",
};

const container = {
  backgroundColor: "#F8F0E4",
  maxWidth: "600px",
  borderRadius: "4px",
  overflow: "hidden",
};

const banner = {
  backgroundColor: "#212251",
  padding: "24px 32px",
  borderBottom: "4px solid #5778FA",
};

const bannerInner = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const logoStyle = {
  display: "block",
  outline: "none",
  border: "none",
  textDecoration: "none",
};

const bannerTag = {
  color: "#5778FA",
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
};

const content = { padding: "40px 32px" };

const headingStyle = {
  fontSize: "28px",
  color: "#212251",
  lineHeight: "1.2",
  margin: "0 0 8px",
  fontWeight: 700,
};

const button = {
  backgroundColor: "#5778FA",
  color: "#ffffff",
  borderRadius: "4px",
  padding: "16px 32px",
  fontSize: "16px",
  fontWeight: 700,
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
};

const lede = {
  fontSize: "16px",
  color: "#212251",
  lineHeight: "1.6",
  margin: "0 0 24px",
};

const muted = {
  fontSize: "13px",
  color: "#5b5f78",
  lineHeight: "1.6",
  margin: "0 0 8px",
};

const urlText = {
  fontSize: "13px",
  margin: "0 0 8px",
  wordBreak: "break-all" as const,
};

const hr = { borderColor: "#e6e3dc", margin: "28px 0 16px" };

const closing = {
  fontSize: "14px",
  color: "#212251",
  lineHeight: "1.6",
  margin: "0 0 12px",
};

const code = {
  fontSize: "30px",
  letterSpacing: "0.2em",
  fontWeight: 700,
  color: "#212251",
  margin: "0 0 24px",
};

/* Deep Blue closing band — mirrors the site footer. */
const footer = {
  backgroundColor: "#212251",
  padding: "24px 32px",
  textAlign: "center" as const,
};

const footerLogoStyle = {
  display: "block",
  margin: "0 auto 12px",
  outline: "none",
  border: "none",
  textDecoration: "none",
};

const footerText = {
  color: "#F8F0E4",
  fontSize: "12px",
  lineHeight: "1.6",
  margin: 0,
};

export const authStyles = { lede, muted, urlText, hr, closing, code };
export { Hr as AuthHr, Text as AuthText };
