/**
 * Builds the downloadable pitch deck (.pptx) from the simulator's current
 * inputs and result, plus the evidence slides from organisations.json.
 * Runs entirely in the browser: figures never leave the visitor's session.
 * pptxgenjs is imported lazily so it only loads when someone downloads.
 *
 * Colours are literal hex here on purpose: pptx files cannot read CSS tokens,
 * so these mirror the official ICF palette (see mem://design/icf-palette).
 */
import { makeT } from "@/i18n";
import type { Locale } from "@/i18n/config";
import type PptxGenJSType from "pptxgenjs";
type Slide = ReturnType<PptxGenJSType["addSlide"]>;
import {
  formatMoney,
  formatNumber,
  type CurrencyKey,
  type RoiInputs,
  type RoiResult,
} from "@/lib/roi-model";
import logoWhite from "@/design-system/icf-welcome-design-system-a835df/assets/logos/ICF_SwitzerlandCharterChapter_Horizontal_RGB_White.png.asset.json";
import { DRIVER_GROUPS } from "./driver-groups";
import { fill } from "./format";

const C = {
  deep: "212251",
  blue: "2B379B",
  light: "5778FA",
  yellow: "EFCB30",
  bone: "F8F0E4",
  white: "FFFFFF",
  muted: "5B5C7A",
};
const HEAD = "Quicksand";
const BODY = "Plus Jakarta Sans";
const W = 10;
const H = 5.625;

type EvidenceSlide = {
  kicker?: string;
  title?: string;
  body?: string;
  stat?: string;
  statLabel?: string;
  bullets?: string[];
  quote?: string;
  source?: string;
};

/** Re-encodes the (webp-served) logo as PNG, the format pptx can embed. */
async function logoPng(): Promise<string | null> {
  try {
    const img = new Image();
    img.src = logoWhite.url;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    c.getContext("2d")!.drawImage(img, 0, 0);
    return c.toDataURL("image/png");
  } catch {
    return null;
  }
}

export async function buildPitchDeck(opts: {
  locale: Locale;
  inputs: RoiInputs;
  result: RoiResult;
  currency: CurrencyKey;
}): Promise<{ blob: Blob; filename: string }> {
  const { locale, inputs, result, currency } = opts;
  const { t, tList } = makeT(locale);
  const ev = tList<EvidenceSlide>("organisations.deck.slides");
  const money = (v: number) => formatMoney(v, currency);
  const { default: PptxGenJS } = await import("pptxgenjs");
  const logo = await logoPng();

  const pres = new PptxGenJS();
  pres.layout = "LAYOUT_16x9";
  pres.title = t("roi.deck.title");
  pres.company = "The Switzerland Chapter of ICF";

  const date = new Intl.DateTimeFormat(locale === "en" ? "en-US" : `${locale}-CH`, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
  const programme = t(`roi.programmes.${inputs.programme}.label`);
  const roi = result.roi.toFixed(1) + "×";
  const paybackText = result.payback
    ? fill(t("roi.ledger.monthShort"), { m: result.payback })
    : t("roi.ledger.none");
  const total = 12;

  const footer = (s: Slide, n: number, dark: boolean) => {
    s.addText(`The Switzerland Chapter of ICF  ·  ${n} / ${total}`, {
      x: 0.5, y: H - 0.42, w: W - 1, h: 0.3, margin: 0,
      fontFace: BODY, fontSize: 9, color: dark ? "C9CBE6" : C.muted,
    });
  };
  const kicker = (s: Slide, text: string, dark: boolean) => {
    s.addText(text.toUpperCase(), {
      x: 0.5, y: 0.45, w: 9, h: 0.3, margin: 0, charSpacing: 3,
      fontFace: BODY, fontSize: 11, bold: true, color: dark ? C.yellow : C.blue,
    });
  };
  const title = (s: Slide, text: string, dark: boolean, w = 9) => {
    s.addText(text, {
      x: 0.5, y: 0.8, w, h: 1.1, margin: 0, valign: "top",
      fontFace: HEAD, fontSize: 30, color: dark ? C.white : C.deep,
    });
  };
  const light = (n: number) => {
    const s = pres.addSlide();
    s.background = { color: C.bone };
    footer(s, n, false);
    return s;
  };
  const dark = (n: number) => {
    const s = pres.addSlide();
    s.background = { color: C.deep };
    footer(s, n, true);
    return s;
  };
  const card = (s: Slide, x: number, y: number, w: number, h: number, fillColor = C.white) =>
    s.addShape(pres.ShapeType.roundRect, {
      x, y, w, h, rectRadius: 0.15, fill: { color: fillColor }, line: { color: "E6DCCB", width: 0.75 },
    });
  const bulletList = (s: Slide, items: string[], x: number, y: number, w: number, h: number) =>
    s.addText(
      items.map((b, i) => ({
        text: b,
        options: { bullet: { indent: 18 }, breakLine: i < items.length - 1, paraSpaceAfter: 10 },
      })),
      { x, y, w, h, margin: 0, valign: "top", fontFace: BODY, fontSize: 17, color: C.deep },
    );

  // 1 — Title
  {
    const s = dark(1);
    if (logo) s.addImage({ data: logo, x: 0.5, y: 0.45, w: 2.6, h: 0.65, sizing: { type: "contain", w: 2.6, h: 0.65 } });
    s.addText(t("roi.deck.eyebrow").toUpperCase(), {
      x: 0.5, y: 1.75, w: 9, h: 0.3, margin: 0, charSpacing: 3,
      fontFace: BODY, fontSize: 12, bold: true, color: C.yellow,
    });
    s.addText(t("roi.deck.title"), {
      x: 0.5, y: 2.1, w: 8.5, h: 1.4, margin: 0, valign: "top",
      fontFace: HEAD, fontSize: 40, color: C.white,
    });
    s.addText(`${programme}  ·  ${date}`, {
      x: 0.5, y: 3.7, w: 9, h: 0.4, margin: 0, fontFace: BODY, fontSize: 16, color: "C9CBE6",
    });
  }

  // 2 — Context + 77%
  {
    const s = light(2);
    kicker(s, ev[0]?.kicker ?? "", false);
    title(s, ev[0]?.title ?? "", false, 5.4);
    s.addText(ev[0]?.body ?? "", {
      x: 0.5, y: 2.2, w: 5.2, h: 2.2, margin: 0, valign: "top", fontFace: BODY, fontSize: 16, color: C.deep,
    });
    s.addShape(pres.ShapeType.roundRect, { x: 6.2, y: 0.8, w: 3.3, h: 3.9, rectRadius: 0.2, fill: { color: C.blue } });
    s.addText(ev[1]?.stat ?? "", {
      x: 6.45, y: 1.1, w: 2.9, h: 1.3, margin: 0, fontFace: HEAD, fontSize: 72, color: C.yellow,
    });
    s.addText(ev[1]?.statLabel ?? "", {
      x: 6.45, y: 2.5, w: 2.85, h: 1.9, margin: 0, valign: "top", fontFace: BODY, fontSize: 15, color: C.white,
    });
  }

  // 3 — Cost of doing nothing
  {
    const s = light(3);
    kicker(s, ev[2]?.kicker ?? "", false);
    title(s, ev[2]?.title ?? "", false);
    bulletList(s, ev[2]?.bullets ?? [], 0.5, 2.1, 8.8, 2.8);
  }

  // 4 — Why coaching + 86%
  {
    const s = light(4);
    kicker(s, ev[3]?.kicker ?? "", false);
    title(s, ev[3]?.title ?? "", false, 5.4);
    s.addText(ev[3]?.body ?? "", {
      x: 0.5, y: 2.2, w: 5.2, h: 2.4, margin: 0, valign: "top", fontFace: BODY, fontSize: 16, color: C.deep,
    });
    card(s, 6.2, 0.8, 3.3, 3.9);
    s.addText(ev[4]?.stat ?? "", {
      x: 6.45, y: 1.1, w: 2.9, h: 1.3, margin: 0, fontFace: HEAD, fontSize: 72, color: C.blue,
    });
    s.addText(ev[4]?.statLabel ?? "", {
      x: 6.45, y: 2.5, w: 2.85, h: 1.5, margin: 0, valign: "top", fontFace: BODY, fontSize: 15, color: C.deep,
    });
    s.addText(ev[4]?.source ?? "", {
      x: 6.45, y: 4.05, w: 2.85, h: 0.5, margin: 0, valign: "top", fontFace: BODY, fontSize: 10, italic: true, color: C.muted,
    });
  }

  // 5 — Programme scope (simulator inputs)
  {
    const s = light(5);
    kicker(s, t("roi.deck.scopeKicker"), false);
    title(s, fill(t("roi.deck.scopeTitle"), { programme }), false);
    const items: [string, string][] = [
      [t("roi.fields.employees.label"), formatNumber(inputs.employees, currency)],
      [t("roi.deck.participants"), formatNumber(result.participants, currency)],
      [t("roi.fields.costPer.label"), money(inputs.costPer)],
      [t("roi.fields.duration.label"), fill(t("roi.deck.months"), { n: inputs.duration })],
      [t("roi.fields.salary.label"), money(inputs.salary)],
      [t("roi.controls.preset"), t(`roi.controls.presets.${inputs.preset}`)],
    ];
    items.forEach(([label, value], i) => {
      const x = 0.5 + (i % 3) * 3.05;
      const y = 2.0 + Math.floor(i / 3) * 1.45;
      card(s, x, y, 2.85, 1.25);
      s.addText(label, { x: x + 0.2, y: y + 0.15, w: 2.5, h: 0.35, margin: 0, fontFace: BODY, fontSize: 11, color: C.muted });
      s.addText(value, { x: x + 0.2, y: y + 0.5, w: 2.5, h: 0.55, margin: 0, fontFace: BODY, fontSize: 22, bold: true, color: C.deep });
    });
  }

  // 6 — Headline return
  {
    const s = dark(6);
    kicker(s, t("roi.results.eyebrow"), true);
    s.addText(roi, { x: 0.5, y: 0.85, w: 5, h: 1.7, margin: 0, fontFace: HEAD, fontSize: 110, color: C.white });
    s.addText(t("roi.results.multipleNote"), {
      x: 0.5, y: 2.6, w: 6.5, h: 0.7, margin: 0, valign: "top", fontFace: BODY, fontSize: 15, color: "C9CBE6",
    });
    const stats: [string, string][] = [
      [t("roi.ledger.net"), money(result.benefit - result.cost)],
      [t("roi.ledger.investment"), money(result.cost)],
      [t("roi.bar.payback"), paybackText],
    ];
    s.addShape(pres.ShapeType.line, { x: 0.5, y: 3.55, w: 9, h: 0, line: { color: "4A4B7A", width: 0.75 } });
    stats.forEach(([label, value], i) => {
      const x = 0.5 + i * 3;
      s.addText(label, { x, y: 3.75, w: 2.8, h: 0.3, margin: 0, fontFace: BODY, fontSize: 12, color: "C9CBE6" });
      s.addText(value, { x, y: 4.1, w: 2.8, h: 0.5, margin: 0, fontFace: BODY, fontSize: 22, bold: true, color: i === 2 ? C.yellow : C.white });
    });
  }

  // 7 — Payback curve
  {
    const s = light(7);
    kicker(s, t("roi.chart.title"), false);
    title(s, result.payback ? fill(t("roi.chart.caption"), { m: result.payback }) : t("roi.chart.captionNone"), false);
    const labels = result.paybackCurve.map((_, i) => fill(t("roi.chart.monthTick"), { m: i + 1 }));
    card(s, 0.5, 1.95, 9, 3.05);
    s.addChart(pres.ChartType.line, [{ name: t("roi.chart.series"), labels, values: result.paybackCurve.map(Math.round) }], {
      x: 0.65, y: 2.05, w: 8.7, h: 2.85,
      chartColors: [C.blue], lineSize: 3, lineDataSymbol: "none",
      catAxisLabelColor: C.muted, valAxisLabelColor: C.muted,
      catAxisLabelFontFace: BODY, valAxisLabelFontFace: BODY,
      catAxisLabelFontSize: 9, valAxisLabelFontSize: 9,
      catAxisLabelFrequency: "6",
      valGridLine: { color: "E6DCCB", size: 0.5 }, catGridLine: { style: "none" },
      valAxisLabelFormatCode: "#,##0", showLegend: false,
    });
  }

  // 8 — Value drivers
  {
    const s = light(8);
    kicker(s, t("roi.results.driversTitle"), false);
    title(s, fill(t("roi.deck.driversTitle"), { benefit: money(result.benefit) }), false);
    const byKey = new Map(result.drivers.map((d) => [d.key, d]));
    const discount = result.gross > 0 ? result.benefit / result.gross : 0;
    DRIVER_GROUPS.forEach((g, i) => {
      const x = 0.5 + i * 3.05;
      card(s, x, 1.95, 2.85, 3.05);
      const sum = g.drivers.reduce((a, k) => a + (byKey.get(k)?.value ?? 0), 0);
      s.addText(t(`roi.groups.${g.key}`), { x: x + 0.2, y: 2.1, w: 2.5, h: 0.35, margin: 0, fontFace: HEAD, fontSize: 18, color: C.deep });
      s.addText(money(sum * discount), { x: x + 0.2, y: 2.45, w: 2.5, h: 0.5, margin: 0, fontFace: BODY, fontSize: 20, bold: true, color: C.blue });
      s.addText(
        g.drivers.map((k, j) => ({
          text: `${t(`roi.drivers.${k}.label`)}: ${money((byKey.get(k)?.value ?? 0) * discount)}`,
          options: { breakLine: j < g.drivers.length - 1, paraSpaceAfter: 6 },
        })),
        { x: x + 0.2, y: 3.1, w: 2.5, h: 1.8, margin: 0, valign: "top", fontFace: BODY, fontSize: 10.5, color: C.deep },
      );
    });
    s.addText(fill(t("roi.deck.overlapNote"), { pct: inputs.overlap }), {
      x: 0.5, y: 5.02, w: 9, h: 0.2, margin: 0, fontFace: BODY, fontSize: 8, color: C.muted,
    });
  }

  // 9 — ICF standard
  {
    const s = dark(9);
    kicker(s, ev[7]?.kicker ?? "", true);
    s.addText(`“${ev[7]?.quote ?? ""}”`, {
      x: 0.5, y: 1.0, w: 8.6, h: 2.2, margin: 0, valign: "top", fontFace: HEAD, fontSize: 28, italic: true, color: C.white,
    });
    s.addText(ev[7]?.body ?? "", {
      x: 0.5, y: 3.4, w: 8, h: 0.9, margin: 0, valign: "top", fontFace: BODY, fontSize: 15, color: "C9CBE6",
    });
  }

  // 10 — Measurement
  {
    const s = light(10);
    kicker(s, ev[8]?.kicker ?? "", false);
    title(s, ev[8]?.title ?? "", false);
    (ev[8]?.bullets ?? []).forEach((b, i) => {
      const x = 0.5 + (i % 2) * 4.6;
      const y = 2.0 + Math.floor(i / 2) * 1.45;
      card(s, x, y, 4.4, 1.25);
      s.addShape(pres.ShapeType.ellipse, { x: x + 0.2, y: y + 0.35, w: 0.55, h: 0.55, fill: { color: C.blue } });
      s.addText(String(i + 1), { x: x + 0.2, y: y + 0.35, w: 0.55, h: 0.55, margin: 0, align: "center", valign: "middle", fontFace: BODY, fontSize: 16, bold: true, color: C.white });
      s.addText(b, { x: x + 0.95, y: y + 0.15, w: 3.3, h: 0.95, margin: 0, valign: "middle", fontFace: BODY, fontSize: 14, color: C.deep });
    });
  }

  // 11 — Pilot + disclaimer
  {
    const s = light(11);
    kicker(s, ev[9]?.kicker ?? "", false);
    title(s, ev[9]?.title ?? "", false);
    s.addText(ev[9]?.body ?? "", {
      x: 0.5, y: 2.0, w: 8.5, h: 1.3, margin: 0, valign: "top", fontFace: BODY, fontSize: 18, color: C.deep,
    });
    s.addShape(pres.ShapeType.rect, { x: 0.5, y: 3.55, w: 0.06, h: 1.2, fill: { color: C.yellow }, line: { color: C.yellow } });
    s.addText(t("roi.deck.disclaimer"), {
      x: 0.75, y: 3.55, w: 8.5, h: 1.2, margin: 0, valign: "middle", fontFace: BODY, fontSize: 11, color: C.muted,
    });
  }

  // 12 — Contact
  {
    const s = dark(12);
    if (logo) s.addImage({ data: logo, x: 0.5, y: 0.45, w: 2.6, h: 0.65, sizing: { type: "contain", w: 2.6, h: 0.65 } });
    s.addText(t("roi.deck.contactKicker").toUpperCase(), {
      x: 0.5, y: 1.55, w: 9, h: 0.3, margin: 0, charSpacing: 3, fontFace: BODY, fontSize: 12, bold: true, color: C.yellow,
    });
    s.addText(t("roi.deck.contactTitle"), {
      x: 0.5, y: 1.9, w: 8.5, h: 0.9, margin: 0, valign: "top", fontFace: HEAD, fontSize: 32, color: C.white,
    });
    const rows: [string, string, string][] = [
      [t("roi.deck.contactEmail"), "office@coachingfederation.ch", "mailto:office@coachingfederation.ch"],
      [t("roi.deck.contactWeb"), "coachingfederation.ch/for-organisations", "https://coachingfederation.ch/for-organisations"],
      [t("roi.deck.contactFind"), "coachingfederation.ch/find-a-coach", "https://coachingfederation.ch/find-a-coach"],
    ];
    rows.forEach(([label, value, href], i) => {
      const y = 3.0 + i * 0.6;
      s.addText(label, { x: 0.5, y, w: 2.6, h: 0.45, margin: 0, valign: "middle", fontFace: BODY, fontSize: 13, color: "C9CBE6" });
      s.addText(value, {
        x: 3.1, y, w: 6.4, h: 0.45, margin: 0, valign: "middle", fontFace: BODY, fontSize: 16, bold: true, color: C.white,
        hyperlink: { url: href },
      });
    });
  }

  const blob = (await pres.write({ outputType: "blob" })) as Blob;
  const slug = programme.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return { blob, filename: `coaching-business-case-${slug || "icf"}.pptx` };
}
