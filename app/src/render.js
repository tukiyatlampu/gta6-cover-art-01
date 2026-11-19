// render.js — draws the cover onto a <canvas> at any export size.
// Pure canvas 2D, no libraries. Photos are drawn cover-fit per panel
// (zoom + dx/dy = crop/position), then grade, grain, vignette, type.
import { getLayout } from "./layouts.js";
import { getGrade } from "./grades.js";

const imageCache = new Map();

export function loadImage(src) {
  if (imageCache.has(src)) return imageCache.get(src);
  const p = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Cannot load " + src));
    img.src = src;
  });
  imageCache.set(src, p);
  return p;
}

// Draw one image cover-fitting rect (x,y,w,h) with zoom and offsets.
// dx/dy are fractions of the rect (-0.5..0.5); zoom >= 1 crops tighter.
function drawCover(ctx, img, x, y, w, h, zoom, dx, dy) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const scale = Math.max(w / iw, h / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  const ox = x + (w - dw) / 2 + dx * w;
  const oy = y + (h - dh) / 2 + dy * h;
  ctx.drawImage(img, ox, oy, dw, dh);
}

// Grain: one shared noise tile, generated once, tiled at low alpha.
// Seeded PRNG (mulberry32, fixed seed) so every render grains identically.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let grainTile = null;
function getGrainTile() {
  if (grainTile) return grainTile;
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const g = c.getContext("2d");
  const data = g.createImageData(128, 128);
  const rand = mulberry32(20261119);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = Math.floor(rand() * 255);
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  g.putImageData(data, 0, 0);
  grainTile = c;
  return c;
}

function fitFont(ctx, text, maxWidth, startPx, family, weight) {
  let px = startPx;
  ctx.font = `${weight} ${px}px ${family}`;
  while (px > 12 && ctx.measureText(text).width > maxWidth) {
    px -= 2;
    ctx.font = `${weight} ${px}px ${family}`;
  }
  return px;
}

export async function renderCover(canvas, state, size) {
  const W = size.w;
  const H = size.h;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  const layout = getLayout(state.layout);
  const grade = getGrade(state.grade);
  const gap = Math.max(4, Math.round(W * 0.008));

  // Backdrop: deep dusk gradient so gaps read as design, not holes.
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#1b1035");
  bg.addColorStop(0.55, "#3d1155");
  bg.addColorStop(1, "#12081f");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Panels.
  for (let i = 0; i < layout.panels.length; i++) {
    const p = layout.panels[i];
    const slot = state.panels[i] || state.panels[0];
    const px = p.x * W;
    const py = p.y * H;
    const pw = p.w * W;
    const ph = p.h * H;
    // Panel outline in canvas pixels: a rect, or the layout's polygon
    // (fractions of the canvas) for diagonal splits.
    const outline = p.poly
      ? p.poly.map(([fx, fy]) => [fx * W, fy * H])
      : [[px, py], [px + pw, py], [px + pw, py + ph], [px, py + ph]];
    const trace = () => {
      ctx.beginPath();
      ctx.moveTo(outline[0][0], outline[0][1]);
      for (let k = 1; k < outline.length; k++) ctx.lineTo(outline[k][0], outline[k][1]);
      ctx.closePath();
    };
    ctx.save();
    if (p.rot) {
      ctx.translate(px + pw / 2, py + ph / 2);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.translate(-(px + pw / 2), -(py + ph / 2));
    }
    // White polaroid frame for tilted layout, thin dark seam otherwise.
    if (layout.id === "tilted") {
      ctx.fillStyle = "#fdf8ef";
      ctx.fillRect(px - gap, py - gap, pw + gap * 2, ph + gap * 2);
    }
    trace();
    ctx.clip();
    let img = null;
    try {
      img = await loadImage(slot.photo);
    } catch {
      img = null;
    }
    if (img) {
      ctx.filter = grade.filter;
      drawCover(ctx, img, px, py, pw, ph, slot.zoom || 1, slot.dx || 0, slot.dy || 0);
      ctx.filter = "none";
    } else {
      ctx.fillStyle = "#2a1745";
      ctx.fillRect(px, py, pw, ph);
    }
    // Per-panel sunset wash.
    const wash = ctx.createLinearGradient(0, py, 0, py + ph);
    wash.addColorStop(0, "rgba(255,120,40,0.05)");
    wash.addColorStop(1, "rgba(120,20,90,0.18)");
    ctx.fillStyle = wash;
    ctx.fillRect(px, py, pw, ph);
    ctx.restore();
    // Seam between panels, following the panel outline.
    ctx.strokeStyle = "rgba(10,5,20,0.55)";
    ctx.lineWidth = Math.max(2, gap / 2);
    trace();
    ctx.stroke();
  }

  // Grade overlay over the whole cover.
  const over = ctx.createLinearGradient(0, 0, 0, H);
  over.addColorStop(0, grade.top);
  over.addColorStop(1, grade.bottom);
  ctx.fillStyle = over;
  ctx.fillRect(0, 0, W, H);

  // Vignette.
  const vg = ctx.createRadialGradient(
    W / 2, H / 2, Math.min(W, H) * 0.35,
    W / 2, H / 2, Math.max(W, H) * 0.75
  );
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, `rgba(0,0,0,${0.25 + state.vignette * 0.45})`);
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  // Grain.
  if (state.grain > 0) {
    const tile = getGrainTile();
    const pat = ctx.createPattern(tile, "repeat");
    ctx.save();
    ctx.globalAlpha = state.grain * 0.16;
    ctx.globalCompositeOperation = "overlay";
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // ---- Lettering ----
  const tz = layout.titleZone;
  const zx = tz.x * W;
  const zy = tz.y * H;
  const zw = tz.w * W;
  const zh = tz.h * H;

  // Soft dark band behind type so it reads on any photo.
  const band = ctx.createLinearGradient(0, zy - zh * 0.15, 0, zy + zh);
  band.addColorStop(0, "rgba(8,4,18,0)");
  band.addColorStop(0.35, "rgba(8,4,18,0.55)");
  band.addColorStop(1, "rgba(8,4,18,0.72)");
  ctx.fillStyle = band;
  ctx.fillRect(0, zy - zh * 0.15, W, zh * 1.15);

  const title = (state.title || "SUNSET").toUpperCase();
  // Type sizes scale with the SHORTER side: in wide exports (1920x1080)
  // W-based type overflowed the H-based title zone, so the subtitle and
  // tagline collided at the bottom edge. Cap the title so the whole
  // title + subtitle + tagline stack clears the canvas bottom.
  const S = Math.min(W, H);
  const subPx0 = Math.round(S * 0.042);
  const tagPx = Math.max(12, Math.round(S * 0.016));
  const bottomLimit = H - tagPx * 1.2;
  const titleCap = Math.max(
    24,
    Math.floor(bottomLimit - zy - subPx0 * 1.45 - tagPx * 2.1),
  );
  const titlePx = Math.min(
    fitFont(ctx, title, zw, Math.round(W * 0.115), "Anton, sans-serif", 400),
    titleCap,
  );
  const grad = ctx.createLinearGradient(zx, zy, zx + zw, zy + titlePx);
  grad.addColorStop(0, grade.titleFrom);
  grad.addColorStop(1, grade.titleTo);
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.font = `${titlePx}px Anton, sans-serif`;
  ctx.lineWidth = Math.max(3, titlePx * 0.07);
  ctx.strokeStyle = "rgba(10,4,20,0.9)";
  ctx.strokeText(title, zx, zy + titlePx * 0.95);
  ctx.fillStyle = grad;
  ctx.fillText(title, zx, zy + titlePx * 0.95);

  // Neon script subtitle.
  const sub = state.subtitle || "";
  if (sub) {
    const subPx = fitFont(ctx, sub, zw, subPx0, "Pacifico, cursive", 400);
    const sy = zy + titlePx + subPx * 1.15;
    ctx.font = `${subPx}px Pacifico, cursive`;
    ctx.shadowColor = grade.glow;
    ctx.shadowBlur = subPx * 0.55;
    ctx.fillStyle = grade.neon;
    ctx.fillText(sub, zx + W * 0.004, sy);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.9;
    ctx.fillText(sub, zx + W * 0.004, sy);
    ctx.globalAlpha = 1;
  }

  // Tagline.
  const tag = state.tagline || "";
  if (tag) {
    ctx.font = `700 ${tagPx}px Arial, sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    const ty = zy + titlePx + subPx0 * 1.15 + tagPx * 2.1;
    ctx.fillText(tag.toUpperCase(), zx, Math.min(ty, H - tagPx * 1.2));
    // Small rule line under the tagline.
    ctx.fillStyle = grade.titleTo;
    ctx.fillRect(zx, Math.min(ty, H - tagPx * 1.2) + tagPx * 0.7, W * 0.12, Math.max(2, W * 0.003));
  }
}

export function exportPNG(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}
