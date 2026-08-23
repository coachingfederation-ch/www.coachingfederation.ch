/**
 * Browser-only flattening of a framed newsletter block image plus its brush
 * marks into a single picture.
 * Exports: loadSourceImage, coverScale, drawGeometry, renderBlockImage.
 *
 * Email clients cannot crop or overlay, so what the editor composes has to be
 * baked once into a real file. Geometry lives here so the live preview and the
 * exported bitmap are computed from the exact same numbers.
 */
import { loadMarkSvg } from "@/components/marks";
import type { PlacedMark } from "./mark-placement";
import { blockImagePlacement, type BlockImageCrop, type BlockImagePreset } from "./block-image";

export function loadSourceImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Supabase storage and images.unsplash.com both send CORS headers, so the
    // canvas stays untainted. A host that refuses simply fails to load here.
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("cors"));
    img.src = url;
  });
}

/** Smallest scale at which the source fully covers the frame. */
export function coverScale(iw: number, ih: number, fw: number, fh: number) {
  return Math.max(fw / iw, fh / ih);
}

/**
 * Where the source image sits inside the frame, in frame pixels. The crop
 * centre is clamped so the frame is never left partly empty.
 */
export function drawGeometry(
  iw: number,
  ih: number,
  frame: { width: number; height: number },
  crop: BlockImageCrop,
) {
  const scale = coverScale(iw, ih, frame.width, frame.height) * crop.zoom;
  const drawnW = iw * scale;
  const drawnH = ih * scale;
  const rawX = frame.width / 2 - (crop.xPct / 100) * drawnW;
  const rawY = frame.height / 2 - (crop.yPct / 100) * drawnH;
  return {
    scale,
    width: drawnW,
    height: drawnH,
    x: Math.min(0, Math.max(frame.width - drawnW, rawX)),
    y: Math.min(0, Math.max(frame.height - drawnH, rawY)),
  };
}

function markToImage(svg: string, color: string): Promise<HTMLImageElement> {
  const coloured = svg.replace(/currentColor/g, color);
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(coloured)}`;
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("mark"));
    img.src = url;
  });
}

/** Composite frame + marks and return a JPEG blob at the preset's size. */
export async function renderBlockImage(opts: {
  sourceUrl: string;
  preset: BlockImagePreset;
  crop: BlockImageCrop;
  marks: PlacedMark[];
}): Promise<Blob> {
  const { preset, crop, marks } = opts;
  const image = await loadSourceImage(opts.sourceUrl);
  const canvas = document.createElement("canvas");
  // Render at 2x so the picture stays crisp on high-density screens.
  const ratio = 2;
  canvas.width = preset.width * ratio;
  canvas.height = preset.height * ratio;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.scale(ratio, ratio);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, preset.width, preset.height);

  const geo = drawGeometry(image.naturalWidth, image.naturalHeight, preset, crop);
  ctx.drawImage(image, geo.x, geo.y, geo.width, geo.height);

  const placement = blockImagePlacement(preset.id);
  for (const mark of marks) {
    const svg = await loadMarkSvg(mark.name);
    if (!svg) continue;
    const markImage = await markToImage(svg, mark.color);
    ctx.drawImage(
      markImage,
      (mark.xPct / 100) * preset.width,
      (mark.yPct / 100) * preset.height,
      (mark.sizePct / 100) * preset.width,
      (placement.heightPct(mark.sizePct) / 100) * preset.height,
    );
  }

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.9),
  );
  if (!blob) throw new Error("export");
  return blob;
}
