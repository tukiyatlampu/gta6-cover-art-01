// The cover renderer: draws the whole cover — panels, grade, lettering,
// grain and vignette — onto any canvas at any size. Pure canvas 2D, no
// network, no external assets beyond the vendored fonts and sample photos.

import { layoutPanels } from './layouts.js';
import { gradeOf } from './grades.js';
import { clampCrop } from './state.js';

let fontsReady = false;

/** Loads the vendored display + script fonts (once) so canvas can use them. */
export async function ensureFonts() {
  if (fontsReady) return;
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('40px Pacifico'),
      document.fonts.ready,
    ]);
  } catch {
    // If a font fails, the canvas falls back to sans-serif; the cover still draws.
  }
  fontsReady = true;
}

// ---------------------------------------------------------------- grain

let grainCanvas = null;

/** Deterministic film grain (mulberry32, fixed seed) tiled over the cover. */
function grainTile() {
  if (grainCanvas) return grainCanvas;
  const size = 160;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  let seed = 0x9e3779b9;
  const rand = () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rand() * 255);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  grainCanvas = c;
  return c;
}

// ---------------------------------------------------------------- photos

/** Draws `img` cover-fit into rect `r`, with a zoom/pan crop. The pan is a
 * fraction of the photo's slack (-1..1), so the full slider range always
 * reaches the photo's edge and no empty space ever shows, at any
 * photo/panel aspect ratio. Positive pan moves the photo right/down,
 * revealing its top/left. */
function drawPhoto(ctx, img, r, crop) {
  const { zoom, x, y } = clampCrop(crop);
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const base = Math.max(r.w / iw, r.h / ih);
  const dw = iw * base * zoom;
  const dh = ih * base * zoom;
  const maxDx = Math.max(0, (dw - r.w) / 2);
  const maxDy = Math.max(0, (dh - r.h) / 2);
  const dx = r.x + (r.w - dw) / 2 + x * maxDx;
  const dy = r.y + (r.h - dh) / 2 + y * maxDy;
  ctx.drawImage(img, dx, dy, dw, dh);
}

/**
 * Pans a panel's photo by `dxPx`/`dyPx` canvas pixels (1:1 grab). Used by
 * drag-to-pan; the pan is stored as a fraction of the photo's slack.
 */
export function panByPixels(state, W, H, panelIndex, dxPx, dyPx) {
  const { panels } = layoutPanels(state.layout, W, H);
  const p = panels[panelIndex];
  if (!p) return;
  const r = { x: p.x * W, y: p.y * H, w: p.w * W, h: p.h * H };
  const photo = state.photos[state.panelPhoto[panelIndex] ?? -1];
  if (!photo?.img) return;
  const crop = state.panelCrop[panelIndex];
  const iw = photo.img.naturalWidth;
  const ih = photo.img.naturalHeight;
  const base = Math.max(r.w / iw, r.h / ih);
  const dw = iw * base * crop.zoom;
  const dh = ih * base * crop.zoom;
  const maxDx = Math.max(0, (dw - r.w) / 2);
  const maxDy = Math.max(0, (dh - r.h) / 2);
  state.panelCrop[panelIndex] = clampCrop({
    ...crop,
    x: maxDx > 0 ? crop.x + dxPx / maxDx : crop.x,
    y: maxDy > 0 ? crop.y + dyPx / maxDy : crop.y,
  });
}

/** A placeholder for an empty panel: gradient + label, never a blank hole. */
function drawEmptyPanel(ctx, r, grade, label) {
  const g = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
  g.addColorStop(0, '#3a1550');
  g.addColorStop(1, '#1c0b2e');
  ctx.fillStyle = g;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.fillStyle = 'rgba(246,239,255,0.75)';
  ctx.font = `600 ${Math.max(14, r.w * 0.04)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2);
  ctx.textBaseline = 'alphabetic';
}

/** Applies a grade's tint overlays over rect `r`. */
function applyOverlays(ctx, grade, r) {
  for (const ov of grade.overlays) {
    const grad = ov.type === 'linear'
      ? ctx.createLinearGradient(r.x + ov.from[0] * r.w, r.y + ov.from[1] * r.h, r.x + ov.to[0] * r.w, r.y + ov.to[1] * r.h)
      : ctx.createRadialGradient(r.x + r.w / 2, r.y + r.h / 2, 0, r.x + r.w / 2, r.y + r.h / 2, Math.max(r.w, r.h) / 2);
    for (const [stop, color] of ov.stops) grad.addColorStop(stop, color);
    ctx.save();
    ctx.globalCompositeOperation = ov.blend;
    ctx.fillStyle = grad;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.restore();
  }
}

// ---------------------------------------------------------------- lettering

/** Splits a title into at most two lines that fit `maxWidth` at `maxSize`. */
function layoutTitle(ctx, title, maxSize, maxWidth) {
  let size = maxSize;
  ctx.font = `400 ${size}px Anton, sans-serif`;
  if (ctx.measureText(title).width <= maxWidth) return { lines: [title], size };
  while (size > maxSize * 0.55 && ctx.measureText(title).width > maxWidth) {
    size -= 2;
    ctx.font = `400 ${size}px Anton, sans-serif`;
  }
  if (ctx.measureText(title).width <= maxWidth) return { lines: [title], size };
  const words = title.split(' ');
  if (words.length < 2) return { lines: [title], size };
  let best = 1;
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const diff = Math.abs(words.slice(0, i).join(' ').length - words.slice(i).join(' ').length);
    if (diff < bestDiff) { bestDiff = diff; best = i; }
  }
  const lines = [words.slice(0, best).join(' '), words.slice(best).join(' ')];
  size = maxSize;
  ctx.font = `400 ${size}px Anton, sans-serif`;
  while (size > maxSize * 0.45 && Math.max(...lines.map((l) => ctx.measureText(l).width)) > maxWidth) {
    size -= 2;
    ctx.font = `400 ${size}px Anton, sans-serif`;
  }
  return { lines, size };
}

/** The title fill stops for a title style: the grade's gradient, white or gold. */
function titleStops(style, grade) {
  if (style === 'white') return ['#ffffff', '#f2f2f2'];
  if (style === 'gold') return ['#fff6c9', '#ffd76a', '#ff9d2e', '#ff7a3d'];
  return grade.title;
}

/** Fits one line of text into `maxWidth` by shrinking the font size. */
function fitFont(ctx, family, weight, size, maxWidth, text) {
  let s = size;
  ctx.font = `${weight} ${s}px ${family}`;
  while (s > 12 && ctx.measureText(text).width > maxWidth) {
    s -= 2;
    ctx.font = `${weight} ${s}px ${family}`;
  }
  return s;
}

/** Draws the caption, script subtitle and tagline inside `zone`. */
function drawLettering(ctx, state, grade, zone, W, H) {
  const zx = zone.x * W;
  const zy = zone.y * H;
  const zw = zone.w * W;
  const zh = zone.h * H;

  // Scrim so the words read over any photo.
  const scrim = ctx.createLinearGradient(0, zy - zh * 0.35, 0, zy + zh);
  scrim.addColorStop(0, 'rgba(0,0,0,0)');
  scrim.addColorStop(1, grade.scrim);
  ctx.fillStyle = scrim;
  ctx.fillRect(0, zy - zh * 0.35, W, zh * 1.35);

  ctx.textAlign = zone.align === 'left' ? 'left' : 'center';
  const tx = zone.align === 'left' ? zx : zx + zw / 2;

  // Tagline: small letterspaced caps at the very top, like a masthead.
  const tag = (state.tagline || '').trim().toUpperCase();
  if (tag) {
    const tagSize = Math.max(13, H * 0.016);
    const topScrim = ctx.createLinearGradient(0, 0, 0, H * 0.09);
    topScrim.addColorStop(0, 'rgba(0,0,0,0.45)');
    topScrim.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = topScrim;
    ctx.fillRect(0, 0, W, H * 0.09);
    ctx.font = `700 ${tagSize}px system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(246,239,255,0.92)';
    ctx.textAlign = 'center';
    ctx.fillText(tag.split('').join('  '), W / 2, H * 0.045);
    ctx.textAlign = zone.align === 'left' ? 'left' : 'center';
  }

  // Title: Anton, gradient fill, dark outline, soft drop shadow. Long
  // captions wrap to two lines instead of shrinking to unreadable sizes.
  // The title block's last baseline sits in the upper half of the zone so
  // the script subtitle has room below it without touching the edge.
  const title = (state.caption || '').trim().toUpperCase();
  const sub = (state.subtitle || '').trim();
  const subSize = Math.max(12, H * 0.052);
  const laid = title ? layoutTitle(ctx, title, H * 0.115, zw) : null;
  const titleY = zy + zh * (sub ? (laid && laid.lines.length > 1 ? 0.55 : 0.48) : 0.58);
  if (laid) {
    const { lines, size } = laid;
    const stops = titleStops(state.titleStyle, grade);
    ctx.strokeStyle = grade.titleStroke;
    ctx.lineWidth = Math.max(2, size * 0.045);
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = size * 0.18;
    ctx.shadowOffsetY = size * 0.04;
    lines.forEach((line, li) => {
      const baseline = titleY - (lines.length - 1 - li) * size * 0.95;
      const grad = ctx.createLinearGradient(0, baseline - size, 0, baseline + size * 0.15);
      stops.forEach((c, i) => grad.addColorStop(i / (stops.length - 1), c));
      ctx.fillStyle = grad;
      ctx.strokeText(line, tx, baseline);
      ctx.fillText(line, tx, baseline);
    });
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  // Script subtitle: Pacifico in the grade's neon colour, glowing.
  if (sub) {
    const size = fitFont(ctx, 'Pacifico, cursive', '400', subSize, zw * 0.9, sub);
    const subY = titleY + size * 1.2;
    ctx.fillStyle = grade.script;
    ctx.shadowColor = grade.glow;
    ctx.shadowBlur = size * 0.55;
    ctx.fillText(sub, tx, subY);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }
  ctx.textAlign = 'left';
}

// ---------------------------------------------------------------- the cover

/**
 * Renders the whole cover onto `canvas` (its own width/height) from `state`.
 * `state.photos` holds loaded images; a panel with no photo gets a placeholder.
 */
export function renderCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const grade = gradeOf(state.grade);
  const { panels, captionZone, backdrop } = layoutPanels(state.layout, W, H);

  // Backdrop: deep violet with a sunset wash; visible between panels.
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#1c0b2e');
  bg.addColorStop(0.55, '#2a1038');
  bg.addColorStop(1, '#12081d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  if (backdrop) {
    const wash = ctx.createRadialGradient(W * 0.5, H * 0.28, 0, W * 0.5, H * 0.28, W * 0.75);
    wash.addColorStop(0, 'rgba(255,122,61,0.5)');
    wash.addColorStop(0.5, 'rgba(255,46,136,0.28)');
    wash.addColorStop(1, 'rgba(255,46,136,0)');
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, W, H);
  }

  ctx.save();
  ctx.filter = 'none';
  panels.forEach((p, i) => {
    const r = { x: p.x * W, y: p.y * H, w: p.w * W, h: p.h * H };
    const photoIdx = state.panelPhoto[i] ?? -1;
    const photo = photoIdx >= 0 ? state.photos[photoIdx] : null;
    let crop = state.panelCrop[i] ?? { zoom: 1.15, x: 0, y: 0 };
    // A panel with a focus hint and an untouched crop shows the top of its
    // photo (faces) instead of the centre crop, which would decapitate it.
    if (p.focus === 'top' && crop.zoom === 1.15 && crop.x === 0 && crop.y === 0) {
      crop = { ...crop, y: 1 };
    }

    ctx.save();
    if (p.rot) {
      ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
      ctx.rotate(p.rot);
      ctx.translate(-(r.x + r.w / 2), -(r.y + r.h / 2));
    }
    if (p.clip === 'left' || p.clip === 'right') {
      ctx.beginPath();
      if (p.clip === 'left') {
        ctx.moveTo(0, 0);
        ctx.lineTo(W, 0);
        ctx.lineTo(0, H);
      } else {
        ctx.moveTo(W, 0);
        ctx.lineTo(W, H);
        ctx.lineTo(0, H);
      }
      ctx.closePath();
      ctx.clip();
    } else {
      ctx.beginPath();
      ctx.rect(r.x, r.y, r.w, r.h);
      ctx.clip();
    }

    if (p.frame) {
      // Polaroid frame: white border around the photo, wider at the foot.
      const fw = Math.max(6, W * 0.012);
      ctx.fillStyle = '#f8f3ea';
      ctx.fillRect(r.x - fw, r.y - fw, r.w + fw * 2, r.h + fw * 2.2);
      ctx.fillStyle = '#111';
      ctx.fillRect(r.x, r.y, r.w, r.h);
    }

    if (photo && photo.img) {
      ctx.filter = grade.filter;
      drawPhoto(ctx, photo.img, r, crop);
      ctx.filter = 'none';
      applyOverlays(ctx, grade, r);
    } else {
      drawEmptyPanel(ctx, r, grade, `Panel ${i + 1}`);
    }
    ctx.restore();

    if (p.clip) {
      // The diagonal divider between the two split panels.
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = Math.max(3, W * 0.004);
      ctx.beginPath();
      ctx.moveTo(W, 0);
      ctx.lineTo(0, H);
      ctx.stroke();
      ctx.restore();
    }
  });
  ctx.restore();

  // Selection outline around the selected panel (editor only; skipped for
  // the diagonal split, whose panels share the whole canvas).
  if (state.showSelection && state.selectedPanel >= 0) {
    const p = panels[state.selectedPanel];
    if (p && !p.clip) {
      const r = { x: p.x * W, y: p.y * H, w: p.w * W, h: p.h * H };
      ctx.save();
      ctx.strokeStyle = '#22e6ff';
      ctx.lineWidth = Math.max(3, W * 0.004);
      ctx.setLineDash([Math.max(10, W * 0.014), Math.max(8, W * 0.01)]);
      ctx.strokeRect(r.x + 3, r.y + 3, r.w - 6, r.h - 6);
      ctx.restore();
    }
  }

  drawLettering(ctx, state, grade, captionZone, W, H);

  // Grain, then vignette, over everything.
  const tile = grainTile();
  const pattern = ctx.createPattern(tile, 'repeat');
  ctx.save();
  ctx.globalAlpha = grade.grain;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, `rgba(0,0,0,${grade.vignette})`);
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
}

/** Renders `state` to a fresh offscreen canvas at `size` ({w, h}).
 * Exports never carry the editor's selection outline. */
export function renderToCanvas(state, size) {
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  renderCover(canvas, { ...state, showSelection: false });
  return canvas;
}

/** Which panel (if any) contains point (px, py) on a W × H cover. */
export function panelAt(state, W, H, px, py) {
  const { panels } = layoutPanels(state.layout, W, H);
  for (let i = panels.length - 1; i >= 0; i--) {
    const p = panels[i];
    const r = { x: p.x * W, y: p.y * H, w: p.w * W, h: p.h * H };
    if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return i;
  }
  return -1;
}
