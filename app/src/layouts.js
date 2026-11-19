// Panel geometry: where each layout puts its panels on a cover of W × H.
// Coordinates are fractions of the cover, so one layout works at every export
// size. A panel may carry a rotation (tilted snapshots) and a white frame.

const GAP = 0.012; // gap between panels, as a fraction of the cover's width

function rect(x, y, w, h, extra = {}) {
  return { x, y, w, h, rot: 0, frame: false, ...extra };
}

/**
 * Panels for `layout` on a W × H cover. Returns { panels, captionZone }
 * where captionZone is the fractional rect the lettering sits in ('bottom'
 * band or 'below' for the tilted layout, where the caption lives under the
 * photos on the backdrop).
 */
export function layoutPanels(layout, W, H) {
  const portrait = H > W * 1.1;
  const wide = W > H * 1.1;
  switch (layout) {
    case 'hero-three': {
      // Big hero on the left, three stacked panels on the right.
      const heroW = wide ? 0.6 : 0.62;
      const sideW = 1 - heroW - GAP;
      const third = (1 - GAP * 2) / 3;
      return {
        panels: [
          rect(0, 0, heroW, 1),
          rect(heroW + GAP, 0, sideW, third),
          rect(heroW + GAP, third + GAP, sideW, third),
          rect(heroW + GAP, (third + GAP) * 2, sideW, third),
        ],
        captionZone: { x: 0.04, y: 0.78, w: 0.92, h: 0.2, align: 'left' },
      };
    }
    case 'grid-four': {
      const half = (1 - GAP) / 2;
      return {
        panels: [
          rect(0, 0, half, half),
          rect(half + GAP, 0, half, half),
          rect(0, half + GAP, half, half),
          rect(half + GAP, half + GAP, half, half),
        ],
        captionZone: { x: 0.04, y: 0.8, w: 0.92, h: 0.18, align: 'center' },
      };
    }
    case 'full-bleed':
      return {
        panels: [rect(0, 0, 1, 1)],
        captionZone: { x: 0.05, y: 0.76, w: 0.9, h: 0.22, align: 'center' },
      };
    case 'tilted': {
      // Three overlapping polaroids on a backdrop; caption below the photos.
      const pw = portrait ? 0.72 : 0.44;
      const ph = portrait ? 0.34 : 0.56;
      return {
        panels: [
          rect(0.05, 0.06, pw, ph, { rot: -0.1, frame: true }),
          rect(1 - pw - 0.05, 0.1, pw, ph, { rot: 0.08, frame: true }),
          rect(0.5 - pw / 2, portrait ? 0.42 : 0.34, pw, ph, { rot: -0.02, frame: true }),
        ],
        captionZone: { x: 0.05, y: portrait ? 0.8 : 0.82, w: 0.9, h: 0.16, align: 'center' },
        backdrop: true,
      };
    }
    case 'strip': {
      // Three horizontal bands — a film strip, made for portrait exports.
      // Wide bands crop faces at the centre, so each panel defaults to
      // showing the top of its photo (see renderCover's focus handling).
      const top = 0.44;
      const mid = 0.32;
      const bot = 1 - top - mid - GAP * 2;
      return {
        panels: [
          rect(0, 0, 1, top, { focus: 'top' }),
          rect(0, top + GAP, 1, mid, { focus: 'top' }),
          rect(0, top + mid + GAP * 2, 1, bot, { focus: 'top' }),
        ],
        captionZone: { x: 0.05, y: 0.3, w: 0.9, h: 0.18, align: 'left' },
      };
    }
    case 'duo-split': {
      // Two panels split on a diagonal; the second is clipped to a triangle.
      return {
        panels: [
          rect(0, 0, 1, 1, { clip: 'left' }),
          rect(0, 0, 1, 1, { clip: 'right' }),
        ],
        captionZone: { x: 0.05, y: 0.78, w: 0.9, h: 0.2, align: 'center' },
      };
    }
    default:
      return layoutPanels('hero-three', W, H);
  }
}
