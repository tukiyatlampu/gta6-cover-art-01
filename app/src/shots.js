// Fixed scenes for screenshots: ?shot=cover shows the cover alone, ?shot=editor
// shows the full editor with a sample photo loaded. Query params pick the
// sample photo, caption, layout, grade and export size. window.__shotReady is
// set once the scene has painted, so a headless screenshot can wait on it.

import { ensureFonts } from './render.js';

/**
 * Runs a shot scene. `query` is the page's URLSearchParams, `apply` sets the
 * state up (loads the sample photo, sets the caption/layout/grade) and
 * redraws, `done` repaints after fonts arrive.
 */
export async function runShot(shot, query, apply, done) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const photo = query.get('photo') ?? 'pier';
  const caption = query.get('caption') ?? 'Sunset Heist';
  const subtitle = query.get('subtitle') ?? 'one last ride';
  const layout = query.get('layout') ?? 'hero-three';
  const grade = query.get('grade') ?? 'sunset';
  const size = query.get('size') ?? 'square';
  await apply({ photo, caption, subtitle, layout, grade, size });
  await ensureFonts();
  done();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}
