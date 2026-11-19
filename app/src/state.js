// The cover's state: which photos sit in which panels, the layout, the grade,
// the lettering, and each panel's crop (zoom + pan). Everything the renderer
// needs, nothing it doesn't. Defaults mirror the first screenshot scene.

export const SIZES = {
  square: { w: 1080, h: 1080, label: '1080 × 1080' },
  portrait: { w: 1080, h: 1350, label: '1080 × 1350' },
  wide: { w: 1920, h: 1080, label: '1920 × 1080' },
};

export const LAYOUTS = [
  { id: 'hero-three', label: 'Hero + 3', panels: 4 },
  { id: 'grid-four', label: 'Grid 2×2', panels: 4 },
  { id: 'full-bleed', label: 'Full bleed', panels: 1 },
  { id: 'tilted', label: 'Tilted snaps', panels: 3 },
  { id: 'strip', label: 'Film strip', panels: 3 },
  { id: 'duo-split', label: 'Duo split', panels: 2 },
];

export const GRADES = [
  { id: 'sunset', label: 'Sunset', swatch: 'linear-gradient(135deg,#ffd76a,#ff5e62,#7b2ff7)' },
  { id: 'neon', label: 'Neon', swatch: 'linear-gradient(135deg,#22e6ff,#ff2e88,#7b2ff7)' },
  { id: 'vice', label: 'Vice', swatch: 'linear-gradient(135deg,#ff9de2,#ff2e88,#00e5c7)' },
  { id: 'noir', label: 'Noir', swatch: 'linear-gradient(135deg,#f5f5f5,#8a8a8a,#111)' },
  { id: 'palm', label: 'Palm', swatch: 'linear-gradient(135deg,#b8ff9e,#2ecc71,#0e7a5f)' },
];

export const TITLE_STYLES = [
  { id: 'gradient', label: 'Grade gradient' },
  { id: 'white', label: 'White' },
  { id: 'gold', label: 'Gold' },
];

export const SAMPLES = [
  { id: 'pier', name: 'Pier', src: 'samples/pier.jpg' },
  { id: 'boulevard', name: 'Boulevard', src: 'samples/boulevard.jpg' },
];

/** A fresh default state. Panel transforms are keyed by panel slot (0..5). */
export function defaultState() {
  return {
    layout: 'hero-three',
    grade: 'sunset',
    size: 'square',
    caption: 'Sunset Heist',
    subtitle: 'one last ride',
    tagline: 'NEON SHORES',
    // Title fill: 'gradient' (the grade's palette), 'white' or 'gold'.
    titleStyle: 'gradient',
    // Draw a selection outline around the selected panel (editor only).
    showSelection: true,
    // Photo tray slots: { name, src, img } — img is an HTMLImageElement once loaded.
    photos: [],
    // Which tray slot each panel shows (index into photos, -1 = empty).
    panelPhoto: [0, 1, 0, 1, 0, 1],
    // Per-panel crop: zoom >= 1, pan in fractions of the panel (-0.5..0.5).
    panelCrop: Array.from({ length: 6 }, () => ({ zoom: 1.15, x: 0, y: 0 })),
    selectedPanel: 0,
    selectedPhoto: 0,
  };
}

/** Clamp a crop to its legal range: zoom 1..3, pan -1..1 (a fraction of the
 * photo's slack — drawPhoto maps it to pixels, so no empty space shows). */
export function clampCrop(crop) {
  return {
    zoom: Math.min(3, Math.max(1, crop.zoom || 1)),
    x: Math.min(1, Math.max(-1, crop.x || 0)),
    y: Math.min(1, Math.max(-1, crop.y || 0)),
  };
}
