/**
 * Coaching ROI model — pure calculation engine for the ROI Simulator page.
 * Ported 1:1 from the "Guided ledger" design prototype so the arithmetic the
 * visitor sees in each ledger line matches what is computed here.
 * Exports: PROGRAMMES, PRESETS, CURRENCIES, DEFAULT_INPUTS, computeRoi, convertCurrency.
 */

export type ProgrammeKey = "exec" | "team" | "manager" | "culture";
export type PresetKey = "conservative" | "median" | "ambitious";
export type CurrencyKey = "CHF" | "EUR" | "USD";
export type DriverKey =
  | "retention"
  | "productivity"
  | "engagement"
  | "absence"
  | "derail"
  | "ramp"
  | "recruiting";

export const PROGRAMMES: Record<
  ProgrammeKey,
  {
    reach: number;
    cost: number;
    radius: number;
    spill: number;
    leaderShare: number;
    seniority: number;
    months: number;
  }
> = {
  exec: { reach: 0.02, cost: 9000, radius: 12, spill: 0.45, leaderShare: 1, seniority: 2.4, months: 6 },
  team: { reach: 0.12, cost: 2800, radius: 1.4, spill: 0.6, leaderShare: 0.15, seniority: 1.3, months: 8 },
  manager: { reach: 0.15, cost: 3200, radius: 6, spill: 0.35, leaderShare: 1, seniority: 1.5, months: 9 },
  culture: { reach: 0.35, cost: 1400, radius: 2.4, spill: 0.5, leaderShare: 0.3, seniority: 1.4, months: 18 },
};

export const PRESETS: Record<PresetKey, { k: number; overlap: number }> = {
  conservative: { k: 0.6, overlap: 25 },
  median: { k: 1, overlap: 15 },
  ambitious: { k: 1.6, overlap: 10 },
};

export const CURRENCIES: Record<CurrencyKey, { sym: string; rate: number; loc: string }> = {
  CHF: { sym: "CHF ", rate: 1, loc: "de-CH" },
  EUR: { sym: "€", rate: 0.95, loc: "de-DE" },
  USD: { sym: "$", rate: 1.1, loc: "en-US" },
};

export interface RoiInputs {
  employees: number;
  programme: ProgrammeKey;
  preset: PresetKey;
  turnover: number;
  costPer: number;
  engagement: number;
  absence: number;
  replacePct: number;
  salary: number;
  duration: number;
  overlap: number;
  internalTime: boolean;
}

export const DEFAULT_INPUTS: RoiInputs = {
  employees: 1200,
  programme: "culture",
  preset: "median",
  turnover: 11,
  costPer: 1400,
  engagement: 58,
  absence: 6.5,
  replacePct: 95,
  salary: 130000,
  duration: 18,
  overlap: 15,
  internalTime: true,
};

/** Months simulated for the payback curve. */
export const HORIZON_MONTHS = 36;

export interface RoiDriver {
  key: DriverKey;
  value: number;
  /** Raw numbers the UI interpolates into the localised formula line. */
  parts: Record<string, number>;
}

export interface RoiResult {
  participants: number;
  influenced: number;
  indirect: number;
  eff: number;
  leaders: number;
  leaderSalary: number;
  drivers: RoiDriver[];
  gross: number;
  benefit: number;
  programmeCost: number;
  cost: number;
  roi: number;
  payback: number | null;
  /** Cumulative net position at the end of each month, HORIZON_MONTHS long. */
  paybackCurve: number[];
}

export function computeRoi(s: RoiInputs): RoiResult {
  const P = PROGRAMMES[s.programme];
  const k = PRESETS[s.preset].k;
  const emp = s.employees;
  const sal = s.salary;
  const participants = Math.max(1, Math.round(emp * P.reach));
  const influenced = Math.min(emp, Math.round(participants * P.radius));
  const indirect = Math.max(0, influenced - participants);
  // Indirect reach counts at a fraction of a direct participant.
  const eff = participants + indirect * P.spill;
  const leaders = Math.max(1, Math.round(participants * P.leaderShare));
  const leaderSal = sal * P.seniority;

  const leavers = eff * (s.turnover / 100);
  const savedLeavers = leavers * 0.15 * k;
  const headroom = Math.max(0.35, Math.min(1.45, (86 - s.engagement) / 32));

  const drivers: RoiDriver[] = [
    {
      key: "retention",
      value: savedLeavers * (s.replacePct / 100) * sal,
      parts: { eff, turnover: s.turnover, fewer: 15 * k, replacePct: s.replacePct, salary: sal },
    },
    {
      key: "productivity",
      value: eff * sal * 0.018 * k,
      parts: { eff, salary: sal, gain: 1.8 * k },
    },
    {
      key: "engagement",
      value: eff * sal * 0.0012 * 8 * k * headroom,
      parts: { pp: 8 * k * headroom, from: s.engagement, eff },
    },
    {
      key: "absence",
      value: eff * s.absence * 0.1 * k * (sal / 220),
      parts: { days: s.absence, eff, fewer: 10 * k, dayRate: sal / 220 },
    },
    {
      key: "derail",
      value: leaders * 0.06 * 0.25 * k * leaderSal * 1.5,
      parts: { leaders, avoided: 25 * k, cost: leaderSal * 1.5 },
    },
    {
      key: "ramp",
      value: leaders * 0.18 * (4 * k) * (leaderSal / 47) * 0.5,
      parts: { newLeaders: leaders * 0.18, weeks: 4 * k },
    },
    {
      key: "recruiting",
      value: savedLeavers * 0.1 * sal,
      parts: { saved: savedLeavers },
    },
  ];

  const gross = drivers.reduce((t, d) => t + d.value, 0);
  const benefit = gross * (1 - s.overlap / 100);
  const programmeCost = participants * s.costPer;
  const cost = programmeCost + (s.internalTime ? programmeCost * 0.15 : 0);
  const roi = cost > 0 ? benefit / cost : 0;

  // Benefits ramp in after month two; cost is spread over the programme length.
  const D = Math.max(1, s.duration);
  const rampFull = Math.max(3, Math.round(D * 0.6));
  const mb = benefit / 12;
  let cum = 0;
  let payback: number | null = null;
  const paybackCurve: number[] = [];
  for (let m = 1; m <= HORIZON_MONTHS; m++) {
    cum += mb * Math.min(1, Math.max(0, (m - 2) / rampFull)) - (m <= D ? cost / D : 0);
    paybackCurve.push(cum);
    if (payback === null && cum >= 0) payback = m;
  }

  return {
    participants,
    influenced,
    indirect,
    eff,
    leaders,
    leaderSalary: leaderSal,
    drivers,
    gross,
    benefit,
    programmeCost,
    cost,
    roi,
    payback,
    paybackCurve,
  };
}

/** Converts money inputs when the visitor switches currency, rounded like the prototype. */
export function convertCurrency(s: RoiInputs, from: CurrencyKey, to: CurrencyKey): RoiInputs {
  if (from === to) return s;
  const f = CURRENCIES[to].rate / CURRENCIES[from].rate;
  return {
    ...s,
    salary: Math.round((s.salary * f) / 1000) * 1000,
    costPer: Math.round((s.costPer * f) / 50) * 50,
  };
}

export function formatMoney(v: number, cur: CurrencyKey): string {
  const c = CURRENCIES[cur];
  const n = Math.round(v);
  if (Math.abs(n) >= 1_000_000)
    return c.sym + (n / 1_000_000).toFixed(Math.abs(n) >= 10_000_000 ? 0 : 1) + "M";
  if (Math.abs(n) >= 10_000) return c.sym + (Math.round(n / 1000) * 1000).toLocaleString(c.loc);
  return c.sym + n.toLocaleString(c.loc);
}

export function formatNumber(v: number, cur: CurrencyKey): string {
  return Math.round(v).toLocaleString(CURRENCIES[cur].loc);
}
