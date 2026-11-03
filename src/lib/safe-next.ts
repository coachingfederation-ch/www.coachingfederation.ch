/**
 * A post-sign-in return target carried through the auth flow (used by the
 * OAuth consent screen so an MCP client authorization survives login).
 *
 * Only same-origin relative paths are ever honoured — anything else is an
 * open-redirect and is dropped. Browsers treat "\" like "/", so "/\evil.com"
 * would be protocol-relative; backslashes and control characters are rejected.
 */
export function safeNext(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.startsWith("/")) return undefined;
  // eslint-disable-next-line no-control-regex
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return undefined;
  if (value.startsWith("//")) return undefined;
  try {
    const base = "https://same-origin.invalid";
    if (new URL(value, base).origin !== base) return undefined;
  } catch {
    return undefined;
  }
  return value;
}
