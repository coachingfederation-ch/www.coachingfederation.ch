/** String helpers for the ROI Simulator's localised formula lines. */
import { formatMoney, formatNumber, type CurrencyKey, type RoiDriver } from "@/lib/roi-model";

export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k) => (k in values ? String(values[k]) : m));
}

const MONEY_PARTS = new Set(["salary", "dayRate", "cost"]);
const ONE_DECIMAL = new Set(["gain", "pp", "weeks"]);
const INTEGER_PERCENT = new Set(["fewer", "avoided"]);

/** Formats a driver's raw numbers the same way the prototype did, then fills the template. */
export function driverFormula(template: string, d: RoiDriver, cur: CurrencyKey): string {
  const values: Record<string, string> = {};
  for (const [k, v] of Object.entries(d.parts)) {
    if (MONEY_PARTS.has(k)) values[k] = formatMoney(v, cur);
    else if (ONE_DECIMAL.has(k)) values[k] = v.toFixed(1);
    else if (INTEGER_PERCENT.has(k)) values[k] = String(Math.round(v));
    else if (k === "turnover" || k === "replacePct" || k === "from" || k === "days") values[k] = String(v);
    else values[k] = formatNumber(v, cur);
  }
  return fill(template, values);
}
