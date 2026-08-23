/**
 * Lazy-loaded SVG brush-stroke library for decorative site elements.
 * Exports: Mark, MARK_NAMES, MarkName. Consumed by various section and landing page components.
 */
import { useEffect, useState } from "react";

/*
 * Official ICF brush-stroke library (30 marks, supplied by ICF HQ).
 *
 * Each file is hand-traced artwork with thousands of path points, so a single
 * mark is 120-500 KB of raw SVG. Inlining all of them eagerly would add
 * megabytes to the main bundle, so the glob below is intentionally *lazy*:
 * Vite emits one chunk per mark and we fetch it only when that mark is first
 * rendered. Marks are purely decorative (aria-hidden), so the one-frame gap
 * before a chunk resolves has no accessibility or layout cost.
 */
const sources = import.meta.glob<string>("./../assets/marks/*.svg", {
  query: "?raw",
  import: "default",
});

const FILES = {
  arrow1: "Arrow01",
  arrow2: "Arrow02",
  arrow3: "Arrow03",
  asterisk1: "Asterisk01",
  asterisk2: "Asterisk02",
  asterisk3: "Asterisk03",
  asterisk4: "Asterisk04",
  circular1: "CircularMark01",
  circular2: "CircularMark02",
  circular3: "CircularMark03",
  line1: "Line01",
  line2: "Line02",
  line3: "Line03",
  line4: "Line04",
  /** `star` is the legacy alias for Star01, kept so existing call sites work. */
  star: "Star01",
  star1: "Star01",
  star2: "Star02",
  star3: "Star03",
  highlight1: "TextHighlighMark01",
  highlight2: "TextHighlighMark02",
  highlight3: "TextHighlighMark03",
  stroke1: "ThinnerStrokeMark01",
  stroke2: "ThinnerStrokeMark02",
  stroke3: "ThinnerStrokeMark03",
  stroke4: "ThinnerStrokeMark04",
  other1: "Other01",
  other2: "Other02",
  other3: "Other03",
  other4: "Other04",
  other5: "Other05",
  other6: "Other06",
} as const;

export type MarkName = keyof typeof FILES;

const MARK_NAMES = Object.keys(FILES) as MarkName[];

// Strip the inlined <style> fill so we can recolor via currentColor.
const normalize = (svg: string) =>
  svg
    .replace(/<\?xml[^?]*\?>/, "")
    .replace(/<style>[\s\S]*?<\/style>/g, "")
    .replace(/<defs>[\s\S]*?<\/defs>/g, "")
    .replace(/class="cls-1"/g, 'fill="currentColor"')
    .replace(/<svg /, '<svg width="100%" height="100%" preserveAspectRatio="xMidYMid meet" ');

const cache = new Map<MarkName, string>();

function load(name: MarkName): Promise<string> | string | undefined {
  const cached = cache.get(name);
  if (cached) return cached;
  const loader = Object.entries(sources).find(([path]) =>
    path.endsWith(`/${FILES[name]}.svg`),
  )?.[1];
  if (!loader) return undefined;
  return loader().then((raw) => {
    const svg = normalize(raw);
    cache.set(name, svg);
    return svg;
  });
}

/**
 * Awaitable access to one mark's normalised SVG source, for callers that
 * rasterise marks onto a canvas instead of rendering them into the DOM.
 */
export async function loadMarkSvg(name: MarkName): Promise<string | undefined> {
  return load(name);
}

export function Mark({
  name,
  className,
  style,
}: {
  name: MarkName;
  className?: string;
  /** Inline geometry/colour, used by the LinkedIn card's placed marks. */
  style?: React.CSSProperties;
}) {
  const [svg, setSvg] = useState<string | undefined>(() => cache.get(name));

  useEffect(() => {
    let active = true;
    const result = load(name);
    if (typeof result === "string") {
      setSvg(result);
    } else {
      setSvg(undefined);
      void result?.then((loaded) => {
        if (active) setSvg(loaded);
      });
    }
    return () => {
      active = false;
    };
  }, [name]);

  return (
    <span
      aria-hidden
      style={style}
      className={"inline-flex items-center justify-center " + (className ?? "")}
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    />
  );
}
