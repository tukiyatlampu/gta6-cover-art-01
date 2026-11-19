// state.js — single source of truth for Sunset Sleeve.
// Plain object, no framework, no network. All photos stay in memory.
export const SAMPLES = {
  pier: "samples/pier.jpg",
  boulevard: "samples/boulevard.jpg",
};

export const EXPORT_SIZES = [
  { id: "square", label: "1080 × 1080 · Post", w: 1080, h: 1080 },
  { id: "portrait", label: "1080 × 1350 · Portrait", w: 1080, h: 1350 },
  { id: "wide", label: "1920 × 1080 · Wide", w: 1920, h: 1080 },
];

export function defaultPanel(photo) {
  return { photo, zoom: 1.0, dx: 0, dy: 0 };
}

export function defaultState() {
  return {
    title: "SUNSET HEIST",
    subtitle: "Vice City nights",
    tagline: "VICE CITY • EST. 2026",
    layout: "hero-three",
    grade: "sunset",
    exportSize: "square",
    selectedPanel: 0,
    // One photo slot per panel; panels beyond the layout's count are ignored.
    panels: [
      defaultPanel("pier"),
      defaultPanel("boulevard"),
      defaultPanel("pier"),
      defaultPanel("boulevard"),
    ],
    grain: 0.5,
    vignette: 0.55,
  };
}

// Deep-clone a state so undo/reset never mutates the original.
export function cloneState(s) {
  return JSON.parse(JSON.stringify(s));
}

export function loadState() {
  try {
    const raw = localStorage.getItem("sunset-sleeve-state");
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    const base = defaultState();
    const panels = (parsed.panels || base.panels).map((p, i) => {
      // A blob: URL from a past upload is dead after reload: fall back to
      // the default sample instead of a purple empty panel.
      const photo = typeof p.photo === "string" && p.photo.startsWith("blob:")
        ? base.panels[i % base.panels.length].photo
        : p.photo;
      return { ...p, photo };
    });
    return { ...base, ...parsed, panels };
  } catch {
    return defaultState();
  }
}

export function saveState(s) {
  try {
    localStorage.setItem("sunset-sleeve-state", JSON.stringify(s));
  } catch {
    // Private mode / quota: state simply stays in memory.
  }
}
