/**
 * Question screens for the guided ROI Simulator: one question per screen,
 * grouped into the four named steps of the step guide.
 */
import { Building2, Compass, Gauge, LineChart, type LucideIcon } from "lucide-react";
import type { RoiInputs } from "@/lib/roi-model";

export type ScreenId =
  | "employees"
  | "salary"
  | "turnover"
  | "programme"
  | "investment"
  | "engagement"
  | "absence"
  | "replacePct";

export const GROUPS: { key: "organisation" | "programme" | "baseline" | "results"; icon: LucideIcon }[] = [
  { key: "organisation", icon: Building2 },
  { key: "programme", icon: Compass },
  { key: "baseline", icon: Gauge },
  { key: "results", icon: LineChart },
];

export const SCREENS: { id: ScreenId; group: number }[] = [
  { id: "employees", group: 0 },
  { id: "salary", group: 0 },
  { id: "turnover", group: 0 },
  { id: "programme", group: 1 },
  { id: "investment", group: 1 },
  { id: "engagement", group: 2 },
  { id: "absence", group: 2 },
  { id: "replacePct", group: 2 },
];

/** Index of the results screen (after every question). */
export const RESULTS_INDEX = SCREENS.length;

export function groupOf(index: number): number {
  return index >= RESULTS_INDEX ? 3 : SCREENS[index].group;
}

export function firstScreenOfGroup(group: number): number {
  return group === 3 ? RESULTS_INDEX : SCREENS.findIndex((s) => s.group === group);
}

/** Slider range per numeric field; money ranges are scaled by currency rate. */
export const RANGES: Partial<
  Record<keyof RoiInputs, { min: number; max: number; step: number; money?: boolean }>
> = {
  employees: { min: 50, max: 20000, step: 50 },
  salary: { min: 40000, max: 300000, step: 1000, money: true },
  turnover: { min: 2, max: 35, step: 0.5 },
  costPer: { min: 300, max: 25000, step: 50, money: true },
  duration: { min: 3, max: 24, step: 1 },
  engagement: { min: 20, max: 85, step: 1 },
  absence: { min: 1, max: 20, step: 0.5 },
  replacePct: { min: 30, max: 200, step: 5 },
};
