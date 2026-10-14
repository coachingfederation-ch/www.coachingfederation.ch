/**
 * Shared inline styles for the advertising emails.
 *
 * Email clients need inline styles, so the palette lives here as literals —
 * the same ICF values the other transactional templates use — and every
 * advertising template imports them instead of copying the block.
 */
import { SITE_URL } from "@/i18n/config";

export function assetUrl(path: string, baseUrl?: string) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${(baseUrl || SITE_URL).replace(/\/$/, "")}${path}`;
}

export const main = {
  backgroundColor: "#F8F0E4",
  fontFamily: "Helvetica, Arial, sans-serif",
  margin: 0,
  padding: "24px 0",
};
export const container = {
  backgroundColor: "#F8F0E4",
  maxWidth: "600px",
  borderRadius: "4px",
  overflow: "hidden",
};
export const banner = {
  backgroundColor: "#212251",
  padding: "24px 32px",
  borderBottom: "4px solid #5778FA",
};
export const logoStyle = {
  display: "block",
  outline: "none",
  border: "none",
  textDecoration: "none",
};
export const content = { padding: "40px 32px" };
export const headingStyle = {
  fontSize: "26px",
  color: "#212251",
  lineHeight: "1.2",
  margin: "0 0 8px",
  fontWeight: 700,
};
export const lede = {
  fontSize: "16px",
  color: "#212251",
  lineHeight: "1.6",
  margin: "16px 0 24px",
};
export const row = { fontSize: "15px", color: "#212251", lineHeight: "1.6", margin: "0 0 6px" };
export const button = {
  backgroundColor: "#5778FA",
  color: "#ffffff",
  borderRadius: "4px",
  padding: "16px 32px",
  fontSize: "16px",
  fontWeight: 700,
  textDecoration: "none",
  display: "inline-block",
};
export const hr = { borderColor: "#e2dccf", margin: "32px 0" };
export const closing = {
  fontSize: "14px",
  color: "#212251",
  lineHeight: "1.6",
  margin: "0 0 12px",
};
export const signoff = {
  fontSize: "14px",
  color: "#212251",
  lineHeight: "1.6",
  whiteSpace: "pre-line" as const,
  margin: 0,
};
