/**
 * Shared inline styles for the three contact-conversation emails, so the
 * verification mail, the visitor's copy and the office notification look like
 * one family. Values mirror the brand palette (Deep Blue, Bone, Yellow).
 */
export const main = { backgroundColor: "#ffffff", fontFamily: "Helvetica, Arial, sans-serif" };

export const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  maxWidth: "560px",
  borderRadius: "16px",
  overflow: "hidden" as const,
  border: "1px solid #e6ddcd",
};

export const banner = { backgroundColor: "#212251", padding: "20px 32px" };

export const bannerText = {
  color: "#efcb30",
  fontSize: "12px",
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  margin: 0,
};

export const content = { padding: "28px 32px 32px" };

export const headingStyle = {
  fontSize: "20px",
  color: "#212251",
  lineHeight: "1.3",
  margin: "0 0 16px",
};

export const paragraph = {
  fontSize: "14px",
  color: "#212251",
  lineHeight: "1.6",
  margin: "0 0 16px",
};

export const row = { fontSize: "14px", color: "#212251", lineHeight: "1.6", margin: "0 0 8px" };

export const quote = {
  backgroundColor: "#f8f0e4",
  borderRadius: "12px",
  padding: "16px 20px",
  margin: "0 0 16px",
};

export const quoteText = {
  fontSize: "14px",
  color: "#212251",
  lineHeight: "1.7",
  margin: 0,
  whiteSpace: "pre-wrap" as const,
};

export const button = {
  backgroundColor: "#2b379b",
  borderRadius: "999px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "14px",
  fontWeight: 700,
  padding: "12px 24px",
  textDecoration: "none",
};

export const link = { color: "#2b379b", textDecoration: "underline", wordBreak: "break-all" as const };

export const muted = { fontSize: "13px", color: "#5b5f7a", lineHeight: "1.5", margin: "16px 0 0" };
