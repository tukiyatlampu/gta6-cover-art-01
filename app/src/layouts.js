// layouts.js — six cover layouts.
// Panels are fractions of the canvas (x, y, w, h in 0..1) plus an
// optional rotation in degrees. The title band sits at the bottom
// unless a layout overrides titleZone.
export const LAYOUTS = [
  {
    id: "hero-three",
    name: "Hero + Three",
    blurb: "Big hero photo, three strips below.",
    titleZone: { x: 0.04, y: 0.66, w: 0.92, h: 0.3 },
    panels: [
      { x: 0, y: 0, w: 1, h: 0.62, rot: 0 },
      { x: 0, y: 0.62, w: 0.34, h: 0.38, rot: 0 },
      { x: 0.34, y: 0.62, w: 0.33, h: 0.38, rot: 0 },
      { x: 0.67, y: 0.62, w: 0.33, h: 0.38, rot: 0 },
    ],
  },
  {
    id: "grid-4",
    name: "Four-Panel Grid",
    blurb: "Classic comic grid, equal quarters.",
    titleZone: { x: 0.04, y: 0.72, w: 0.92, h: 0.24 },
    panels: [
      { x: 0, y: 0, w: 0.5, h: 0.5, rot: 0 },
      { x: 0.5, y: 0, w: 0.5, h: 0.5, rot: 0 },
      { x: 0, y: 0.5, w: 0.5, h: 0.5, rot: 0 },
      { x: 0.5, y: 0.5, w: 0.5, h: 0.5, rot: 0 },
    ],
  },
  {
    id: "full-bleed",
    name: "Full Bleed",
    blurb: "One photo, edge to edge, type on top.",
    titleZone: { x: 0.05, y: 0.68, w: 0.9, h: 0.28 },
    panels: [{ x: 0, y: 0, w: 1, h: 1, rot: 0 }],
  },
  {
    id: "tilted",
    name: "Tilted Snapshots",
    blurb: "Polaroid-style tilted frames.",
    titleZone: { x: 0.04, y: 0.7, w: 0.92, h: 0.26 },
    panels: [
      { x: 0.03, y: 0.04, w: 0.58, h: 0.6, rot: -4 },
      { x: 0.48, y: 0.1, w: 0.48, h: 0.55, rot: 5 },
      { x: 0.08, y: 0.52, w: 0.4, h: 0.4, rot: 3 },
      { x: 0.52, y: 0.55, w: 0.42, h: 0.38, rot: -3 },
    ],
  },
  {
    id: "strip-3",
    name: "Vertical Triptych",
    blurb: "Three tall strips, film-reel feel.",
    titleZone: { x: 0.04, y: 0.74, w: 0.92, h: 0.22 },
    panels: [
      { x: 0, y: 0, w: 0.34, h: 1, rot: 0 },
      { x: 0.34, y: 0, w: 0.33, h: 1, rot: 0 },
      { x: 0.67, y: 0, w: 0.33, h: 1, rot: 0 },
    ],
  },
  {
    id: "duo-diagonal",
    name: "Duo Diagonal",
    blurb: "Two photos split on a diagonal.",
    titleZone: { x: 0.04, y: 0.7, w: 0.92, h: 0.26 },
    panels: [
      { x: 0, y: 0, w: 1, h: 0.58, rot: 0, poly: [[0, 0], [1, 0], [1, 0.5], [0, 0.58]] },
      { x: 0, y: 0.5, w: 1, h: 0.5, rot: 0, poly: [[0, 0.58], [1, 0.5], [1, 1], [0, 1]] },
    ],
  },
];

export function getLayout(id) {
  return LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];
}

// Panel count a layout actually uses (some layouts use fewer slots).
export function layoutPanelCount(layout) {
  return layout.panels.length;
}
