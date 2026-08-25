/**
 * ICF Global Chapter SOAP API client.
 *
 * Server-only. Credentials come from secrets and are selected by the current
 * integration mode, so a single runtime can point at TEST or LIVE without a
 * code change.
 *
 * Optional `ICF_RELAY_AUTH` is the HS256 signing key for a fixed-egress relay:
 * each request carries a freshly signed, short-lived JWT in `X-Relay-Auth`. It
 * is never logged and should only be set in production/deployed environments.
 * When empty or unset, no relay header is sent, so local/dev runs keep working.
 */
import { XMLParser } from "fast-xml-parser";
import { relayAuthHeaders } from "./relay-auth.server";
import type { IntegrationMode } from "./integration";

export type NormalizedMember = {
  cst_recno: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  organisation: string | null;
  credential_slug: string | null;
  member_type: string | null;
  membership_join_date: string | null;
  membership_expiration_date: string | null;
  /**
   * Flagship credential validity. Promoted out of `diagnostics` to real
   * columns because directory eligibility depends on them.
   */
  credential_awarded_on: string | null;
  credential_expires_on: string | null;
  /**
   * Feed values the members table has no dedicated column for (postcode, state,
   * ACTC, chapter start, auto-renewal). Kept verbatim so a later column can be
   * backfilled without re-querying ICF.
   */
  diagnostics: Record<string, string>;
};

/**
 * Every optional imported field defaults to null. The feed is the authoritative
 * full snapshot per run: an omitted tag means "no value", never "keep the old
 * value". History stays recoverable through member_import_snapshots.
 */
const EMPTY: Omit<NormalizedMember, "cst_recno"> = {
  first_name: null,
  last_name: null,
  full_name: null,
  email: null,
  phone: null,
  city: null,
  country: null,
  organisation: null,
  credential_slug: null,
  member_type: null,
  membership_join_date: null,
  membership_expiration_date: null,
  credential_awarded_on: null,
  credential_expires_on: null,
  diagnostics: {},
};

/**
 * ICF runs a netFORUM xWeb service: `Signon.asmx` issues a token, then
 * `netFORUMXML.asmx` executes a named web method with that token in a SOAP
 * header. Every value below is a server-only secret and is never logged.
 */
export function soapCredentials(mode: IntegrationMode) {
  const prefix = mode === "live" ? "ICF_SOAP_LIVE" : "ICF_SOAP_TEST";
  const configured = process.env[`${prefix}_BASE_URL`] ?? "";
  const username = process.env[`${prefix}_USERNAME`];
  const password = process.env[`${prefix}_PASSWORD`];
  const cstKey = process.env[`${prefix}_CST_KEY`];
  if (!configured || !username || !password || !cstKey) {
    throw new Error(
      `Missing ICF API credentials for ${mode} mode (${prefix}_BASE_URL / _USERNAME / _PASSWORD / _CST_KEY).`,
    );
  }
  // The stored value may be any form of the xWeb address people copy out of the
  // ICF docs: with or without a trailing .asmx, with or without /secure, with a
  // ?op= query. Reduce all of them to the xweb directory and derive both
  // endpoints from it, so a differently-shaped LIVE URL still works.
  const parsed = new URL(configured);
  const dir =
    parsed.origin +
    parsed.pathname
      .replace(/\/[^/]*\.asmx$/i, "")
      .replace(/\/secure$/i, "")
      .replace(/\/+$/, "");
  return {
    // Authenticate is served by the open endpoint; every authorised call must
    // go to the /secure variant or xWeb rejects the token as "Locked".
    signonUrl: `${dir}/netFORUMXML.asmx`,
    executeUrl: `${dir}/secure/netFORUMXML.asmx`,
    username,
    password,
    cstKey,
  };
}

function text(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "object") return null;
  const s = String(value).trim();
  return s.length ? s : null;
}

function date(value: unknown): string | null {
  const s = text(value);
  if (!s) return null;
  // xWeb emits US MM/DD/YYYY. Parse it explicitly rather than trusting Date's
  // locale-dependent handling of slash-separated dates.
  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (us) {
    const [, m, d, y] = us;
    const month = Number(m);
    const day = Number(d);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function pick(row: Record<string, unknown>, ...keys: string[]): unknown {
  const lower = new Map(Object.keys(row).map((k) => [k.toLowerCase(), k]));
  for (const key of keys) {
    const actual = lower.get(key.toLowerCase());
    if (actual !== undefined) return row[actual];
  }
  return undefined;
}

/** Extra feed tags carried into `members.diagnostics`. */
const DIAGNOSTIC_TAGS = [
  "Zip",
  "State",
  "Chapter_Start_Date",
  "Credential_Award_Date",
  "Credential_Expire_Date",
  "ACTC_Credential",
  "ACTC_Credential_Award_Date",
  "ACTC_Credential_Expire_Date",
  "Auto_Renewal",
  "Member_Status",
];

/**
 * Verified against the TEST feed on 2026-07-27. Each `<Individual>` carries:
 * cst_recno, Member_Status, Member_Type, First_Name, Last_Name, Email, Phone,
 * City, Zip, State, Country, Chapter_Start_Date, Membership_Join_Date,
 * Membership_Expiration_Date, Flagship_Credential (+ award/expiry dates),
 * optional ACTC_Credential (+ dates), Reinstate/Rejoin and Auto_Renewal.
 *
 * The feed does NOT carry an organisation, a composed full name, or any
 * mentor/supervisor accreditation — those stay local, per the roadmap.
 */
export function normalizeMemberRow(row: Record<string, unknown>): NormalizedMember | null {
  const recno = text(pick(row, "cst_recno", "cstRecno", "RecordNumber"));
  if (!recno) return null;
  const first = text(pick(row, "First_Name", "cst_first_name", "FirstName"));
  const last = text(pick(row, "Last_Name", "cst_last_name", "LastName"));
  const full = text(pick(row, "Full_Name", "cst_full_name", "FullName"));

  const diagnostics: Record<string, string> = {};
  for (const tag of DIAGNOSTIC_TAGS) {
    const value = text(pick(row, tag));
    if (value) diagnostics[tag.toLowerCase()] = value;
  }

  return {
    ...EMPTY,
    cst_recno: recno,
    first_name: first,
    last_name: last,
    full_name: full ?? ([first, last].filter(Boolean).join(" ") || null),
    email: text(pick(row, "Email", "cst_eml_address_dn", "email"))?.toLowerCase() ?? null,
    phone: text(pick(row, "Phone", "cst_phn_number_complete_dn")),
    city: text(pick(row, "City", "cst_adr_city")),
    country: text(pick(row, "Country", "cst_adr_country")),
    organisation: text(pick(row, "Organization", "cst_organization", "organisation")),
    // cf_credentials slugs are upper-case (ACC | PCC | MCC), so the feed value
    // is upper-cased rather than lower-cased to keep the join working.
    credential_slug:
      text(pick(row, "Flagship_Credential", "credential", "CredentialLevel"))?.toUpperCase() ??
      null,
    member_type: text(pick(row, "Member_Type", "cst_member_type", "MemberType")),
    membership_join_date: date(pick(row, "Membership_Join_Date", "JoinDate", "cst_join_date")),
    membership_expiration_date: date(
      pick(row, "Membership_Expiration_Date", "ExpirationDate", "cst_expiration_date"),
    ),
    credential_awarded_on: date(pick(row, "Credential_Award_Date", "CredentialAwardDate")),
    credential_expires_on: date(pick(row, "Credential_Expire_Date", "CredentialExpireDate")),
    diagnostics,
  };
}

/** Locate the repeated member elements inside an arbitrarily nested SOAP body. */
function collectMemberRows(node: unknown, out: Record<string, unknown>[]): void {
  if (Array.isArray(node)) {
    for (const item of node) collectMemberRows(item, out);
    return;
  }
  if (!node || typeof node !== "object") return;
  const record = node as Record<string, unknown>;
  const hasRecno = Object.keys(record).some((k) => k.toLowerCase().includes("recno"));
  if (hasRecno) {
    out.push(record);
    return;
  }
  for (const value of Object.values(record)) collectMemberRows(value, out);
}

export function parseMemberFeed(xml: string): NormalizedMember[] {
  const parser = new XMLParser({
    ignoreAttributes: true,
    parseTagValue: false,
    trimValues: true,
    removeNSPrefix: true,
    processEntities: false,
  });
  const doc = parser.parse(xml);
  const rows: Record<string, unknown>[] = [];
  collectMemberRows(doc, rows);
  const seen = new Set<string>();
  const members: NormalizedMember[] = [];
  for (const row of rows) {
    const normalized = normalizeMemberRow(row);
    if (!normalized || seen.has(normalized.cst_recno)) continue;
    seen.add(normalized.cst_recno);
    members.push(normalized);
  }
  return members;
}

function escapeXml(value: string): string {
  return value.replace(
    /[<>&'"]/g,
    (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c] as string,
  );
}

/** netFORUM xWeb namespace, shared by Signon.asmx and netFORUMXML.asmx. */
const XWEB_NS = "http://www.avectra.com/2005/";

export const WEB_SERVICE_NAME = "ICF_Chapter_API";
export const WEB_METHOD = "GetIndividualInfoHavingChapterRelationship";

/**
 * Credentials never leave this module: they are read from server-only env vars
 * inside the request and are never logged. Fault bodies are not echoed back to
 * callers, because a fault can quote the request envelope (and its token).
 */
async function callSoap(
  url: string,
  operation: string,
  bodyXml: string,
  headerXml = "",
): Promise<string> {
  const envelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <soap:Header>${headerXml}</soap:Header>
  <soap:Body>${bodyXml}</soap:Body>
</soap:Envelope>`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: `${XWEB_NS}${operation}`,
      ...(process.env["ICF_RELAY_AUTH"] ? { "X-Relay-Auth": process.env["ICF_RELAY_AUTH"] } : {}),
    },
    body: envelope,
  });

  const text = await response.text();
  // A SOAP fault arrives as HTTP 500, so read faultstring before the status
  // check. Only the short fault string is surfaced: the full body can quote the
  // request envelope, including the session token.
  const fault = text.match(/<faultstring>([^<]{0,200})<\/faultstring>/i)?.[1];
  if (fault) {
    throw new Error(`ICF ${operation} returned a Fault: ${fault}`);
  }
  if (!response.ok) {
    throw new Error(`ICF ${operation} failed with status ${response.status}`);
  }
  return text;
}

function xmlParser(): XMLParser {
  return new XMLParser({
    ignoreAttributes: true,
    parseTagValue: false,
    trimValues: true,
    removeNSPrefix: true,
    processEntities: false,
  });
}

/**
 * The session token is the `<Token>` inside the response's `AuthorizationToken`
 * SOAP header, NOT `AuthenticateResult` in the body. Passing the body value to
 * a secure call fails with an InvalidTokenException reading "Locked".
 */
function findToken(node: unknown): string | null {
  if (!node || typeof node !== "object") return null;
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (key.toLowerCase() === "token" && value && typeof value !== "object") {
      const s = String(value).trim();
      if (s && s.toLowerCase() !== "null") return s;
    }
    const nested = findToken(value);
    if (nested) return nested;
  }
  return null;
}

/**
 * Step 1 — Authenticate against the open xWeb endpoint and return the session
 * token that every subsequent secure call must carry.
 */
export async function authenticate(mode: IntegrationMode): Promise<string> {
  const { signonUrl, username, password } = soapCredentials(mode);
  const body = await callSoap(
    signonUrl,
    "Authenticate",
    `<Authenticate xmlns="${XWEB_NS}"><userName>${escapeXml(username)}</userName><password>${escapeXml(password)}</password></Authenticate>`,
  );
  const token = findToken(xmlParser().parse(body));
  if (!token) throw new Error("ICF Authenticate returned no token.");
  return token;
}

/**
 * Step 2 — Execute `ICF_Chapter_API.GetIndividualInfoHavingChapterRelationship`
 * on the secure endpoint with the chapter's cst_key. The response is treated as
 * the authoritative full active-member snapshot for the run.
 *
 * ExecuteMethod's WSDL signature is (serviceName, methodName, parameters) where
 * parameters is an ArrayOfParameter of Name/Value pairs — not a string array.
 */
export async function fetchActiveMemberFeed(mode: IntegrationMode): Promise<NormalizedMember[]> {
  const { executeUrl, cstKey } = soapCredentials(mode);
  const token = await authenticate(mode);

  const body = await callSoap(
    executeUrl,
    "ExecuteMethod",
    `<ExecuteMethod xmlns="${XWEB_NS}">
      <serviceName>${WEB_SERVICE_NAME}</serviceName>
      <methodName>${WEB_METHOD}</methodName>
      <parameters>
        <Parameter>
          <Name>cst_key</Name>
          <Value>${escapeXml(cstKey)}</Value>
        </Parameter>
      </parameters>
    </ExecuteMethod>`,
    `<AuthorizationToken xmlns="${XWEB_NS}"><Token>${escapeXml(token)}</Token></AuthorizationToken>`,
  );
  return parseMemberFeed(body);
}
