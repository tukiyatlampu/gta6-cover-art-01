// shots.js — ?shot=cover / ?shot=editor scenes for screenshots.
// Reads ?photo=, ?caption=, ?layout=, ?grade=, ?size= from the URL, loads the
// sample photo, renders once fonts are ready, and (cover mode) hides
// the editor chrome so the shot is just the cover.
import { loadImage } from "./render.js";
import { EXPORT_SIZES } from "./state.js";

function resolvePhoto(name) {
  return name.startsWith("samples/") || name.startsWith("http")
    ? name
    : "samples/" + name + ".jpg";
}

export async function applyShotParams(state, render) {
  const q = new URLSearchParams(location.search);
  const shot = q.get("shot");
  if (!shot) return null;
  if (q.get("caption")) state.title = q.get("caption");
  if (q.get("subtitle")) state.subtitle = q.get("subtitle");
  if (q.get("layout")) state.layout = q.get("layout");
  if (q.get("grade")) state.grade = q.get("grade");
  if (q.get("size") && EXPORT_SIZES.some((s) => s.id === q.get("size"))) {
    state.exportSize = q.get("size");
  }
  const photo = q.get("photo");
  const photos = q.get("photos");
  if (photos) {
    // Per-panel photos: ?photos=pier,boulevard,pier — one per panel slot,
    // missing slots keep the state's photo. Names resolve like ?photo=.
    const names = photos.split(",").map((s) => s.trim()).filter(Boolean);
    names.forEach((name, i) => {
      if (i < state.panels.length) state.panels[i].photo = resolvePhoto(name);
    });
    try {
      await loadImage(state.panels[0].photo);
    } catch {
      // Fall through: render shows the fallback panel colour.
    }
  } else if (photo) {
    const src = resolvePhoto(photo);
    for (const p of state.panels) p.photo = src;
    try {
      await loadImage(src);
    } catch {
      // Fall through: render shows the fallback panel colour.
    }
  }
  // Keep the editor inputs in sync: init() filled them from state before
  // the shot params landed, so a shot caption would otherwise disagree
  // with the canvas (e.g. editor shot showing the default title).
  for (const [id, key] of [["title", "title"], ["subtitle", "subtitle"], ["tagline", "tagline"]]) {
    const el = document.getElementById(id);
    if (el) el.value = state[key];
  }
  if (document.fonts && document.fonts.ready) {
    try {
      await Promise.race([
        document.fonts.ready,
        new Promise((r) => setTimeout(r, 1500)),
      ]);
    } catch { /* fonts are best-effort */ }
  }
  await render();
  document.body.classList.add("shot-" + shot);
  if (shot === "cover") {
    document.body.classList.add("shot-cover-mode");
  }
  document.title = "Sunset Sleeve — shot:" + shot;
  return shot;
}
