// Wires the editor: photo tray, layout/grade pickers, lettering inputs,
// per-panel crop sliders, preview clicks, and PNG export at the three sizes.
// A `?shot=` query instead sets up a fixed scene for a screenshot (./shots.js).

import { defaultState, LAYOUTS, GRADES, TITLE_STYLES, SAMPLES, SIZES, clampCrop } from './state.js';
import { renderCover, renderToCanvas, ensureFonts, panelAt, panByPixels } from './render.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const state = defaultState();

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`cannot load ${url}`));
    img.src = url;
  });
}

function redraw() {
  renderCover(canvas, state);
  syncPanelControls();
}

function say(msg) {
  status.textContent = msg;
}

// ---------------------------------------------------------------- history

// Undo/redo over discrete edits (layout, grade, photos, lettering, crops).
// Slider drags record one step when released, not every tick.
const undoStack = [];
const redoStack = [];
const SNAP_KEYS = ['layout', 'grade', 'size', 'caption', 'subtitle', 'tagline', 'titleStyle', 'panelPhoto', 'panelCrop', 'selectedPanel'];

function snapshot() {
  const s = {};
  for (const k of SNAP_KEYS) s[k] = JSON.parse(JSON.stringify(state[k]));
  return JSON.stringify(s);
}

function pushHistory() {
  undoStack.push(snapshot());
  if (undoStack.length > 50) undoStack.shift();
  redoStack.length = 0;
  updateUndoButtons();
}

function applySnapshot(json) {
  const d = JSON.parse(json);
  for (const k of SNAP_KEYS) state[k] = d[k];
  document.getElementById('caption').value = state.caption;
  document.getElementById('subtitle').value = state.subtitle;
  document.getElementById('tagline').value = state.tagline;
  buildTray();
  buildLayoutPicker();
  buildGradePicker();
  buildTitleStylePicker();
  sizePreview();
  updateUndoButtons();
}

function updateUndoButtons() {
  document.getElementById('undo').disabled = undoStack.length === 0;
  document.getElementById('redo').disabled = redoStack.length === 0;
}

function doUndo() {
  if (undoStack.length === 0) return;
  redoStack.push(snapshot());
  applySnapshot(undoStack.pop());
}

function doRedo() {
  if (redoStack.length === 0) return;
  undoStack.push(snapshot());
  applySnapshot(redoStack.pop());
}

document.getElementById('undo').addEventListener('click', doUndo);
document.getElementById('redo').addEventListener('click', doRedo);
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
    if (document.activeElement?.tagName !== 'INPUT') { e.preventDefault(); doUndo(); }
  } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
    if (document.activeElement?.tagName !== 'INPUT') { e.preventDefault(); doRedo(); }
  }
});

// ---------------------------------------------------------------- photos

async function addPhoto(name, src) {
  const img = await loadImage(src);
  state.photos.push({ name, src, img });
  return state.photos.length - 1;
}

function buildTray() {
  const tray = document.getElementById('tray');
  tray.replaceChildren();
  state.photos.forEach((photo, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-checked', String(state.selectedPhoto === i));
    b.title = photo.name;
    const img = document.createElement('img');
    img.src = photo.src;
    img.alt = photo.name;
    const label = document.createElement('span');
    label.className = 'slot-name';
    label.textContent = photo.name;
    b.append(img, label);
    b.addEventListener('click', () => {
      pushHistory();
      state.selectedPhoto = i;
      state.panelPhoto[state.selectedPanel] = i;
      buildTray();
      redraw();
    });
    tray.appendChild(b);
  });
  document.getElementById('tray-status').textContent =
    `${state.photos.length} photo${state.photos.length === 1 ? '' : 's'} in the tray — click one to put it in the selected panel.`;
}

document.getElementById('upload').addEventListener('change', async (e) => {
  const files = [...(e.target.files ?? [])];
  let added = false;
  for (const file of files) {
    if (state.photos.length >= 8) break;
    const url = URL.createObjectURL(file);
    const name = file.name.replace(/\.[^.]+$/, '').slice(0, 18) || 'Upload';
    try {
      const idx = await addPhoto(name, url);
      state.selectedPhoto = idx;
      state.panelPhoto[state.selectedPanel] = idx;
      added = true;
    } catch {
      say(`Could not read ${file.name}.`);
    }
  }
  if (added) pushHistory();
  e.target.value = '';
  buildTray();
  redraw();
});

// ---------------------------------------------------------------- pickers

function buildPicker(el, items, current, onPick, swatchOf) {
  el.replaceChildren();
  for (const item of items) {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(current === item.id));
    if (swatchOf) {
      const s = document.createElement('span');
      s.className = 'swatch';
      s.style.background = swatchOf(item);
      b.append(s);
    }
    b.append(document.createTextNode(item.label));
    b.addEventListener('click', () => {
      onPick(item.id);
      buildPicker(el, items, item.id, onPick, swatchOf);
      redraw();
    });
    el.appendChild(b);
  }
}

function buildLayoutPicker() {
  buildPicker(document.getElementById('layouts'), LAYOUTS, state.layout, (id) => {
    pushHistory();
    state.layout = id;
    state.selectedPanel = 0;
    sizePreview();
  });
}

function buildGradePicker() {
  buildPicker(document.getElementById('grades'), GRADES, state.grade, (id) => {
    pushHistory();
    state.grade = id;
  }, (g) => g.swatch);
}

function buildTitleStylePicker() {
  buildPicker(document.getElementById('title-styles'), TITLE_STYLES, state.titleStyle, (id) => {
    pushHistory();
    state.titleStyle = id;
  });
}

function buildPanelPicker() {
  const count = LAYOUTS.find((l) => l.id === state.layout).panels;
  const items = Array.from({ length: count }, (_, i) => ({ id: String(i), label: `Panel ${i + 1}` }));
  buildPicker(document.getElementById('panels'), items, String(state.selectedPanel), (id) => {
    state.selectedPanel = Number(id);
  });
  document.getElementById('panel-scope').textContent = `Panel ${state.selectedPanel + 1}`;
}

// ---------------------------------------------------------------- panel crop

function syncPanelControls() {
  const count = LAYOUTS.find((l) => l.id === state.layout).panels;
  if (state.selectedPanel >= count) state.selectedPanel = 0;
  const crop = clampCrop(state.panelCrop[state.selectedPanel]);
  state.panelCrop[state.selectedPanel] = crop;
  const zoom = document.getElementById('zoom');
  const panx = document.getElementById('panx');
  const pany = document.getElementById('pany');
  zoom.value = String(crop.zoom);
  panx.value = String(crop.x);
  pany.value = String(crop.y);
  document.getElementById('zoom-val').textContent = `${crop.zoom.toFixed(2)}×`;
  document.getElementById('panx-val').textContent = crop.x.toFixed(2);
  document.getElementById('pany-val').textContent = crop.y.toFixed(2);
}

function bindCrop(id, key) {
  const el = document.getElementById(id);
  el.addEventListener('input', (e) => {
    const crop = { ...state.panelCrop[state.selectedPanel], [key]: Number(e.target.value) };
    state.panelCrop[state.selectedPanel] = clampCrop(crop);
    redraw();
  });
  el.addEventListener('change', pushHistory);
}
bindCrop('zoom', 'zoom');
bindCrop('panx', 'x');
bindCrop('pany', 'y');

document.getElementById('reset-crop').addEventListener('click', () => {
  pushHistory();
  state.panelCrop[state.selectedPanel] = { zoom: 1.15, x: 0, y: 0 };
  redraw();
  say(`Crop reset for panel ${state.selectedPanel + 1}.`);
});

// Clicking the preview selects the panel under the cursor; dragging inside
// it pans the photo directly (sliders stay for precise adjustment).
let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const px = ((e.clientX - rect.left) / rect.width) * canvas.width;
  const py = ((e.clientY - rect.top) / rect.height) * canvas.height;
  const hit = panelAt(state, canvas.width, canvas.height, px, py);
  if (hit < 0) return;
  if (hit !== state.selectedPanel) {
    state.selectedPanel = hit;
    buildPanelPicker();
    redraw();
  }
  drag = { x: e.clientX, y: e.clientY, moved: false };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const rect = canvas.getBoundingClientRect();
  const scale = canvas.width / rect.width;
  const dx = (e.clientX - drag.x) * scale;
  const dy = (e.clientY - drag.y) * scale;
  if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 2) drag.moved = true;
  panByPixels(state, canvas.width, canvas.height, state.selectedPanel, dx, dy);
  drag.x = e.clientX;
  drag.y = e.clientY;
  redraw();
});
canvas.addEventListener('pointerup', () => {
  if (drag?.moved) pushHistory();
  drag = null;
});
canvas.addEventListener('pointercancel', () => { drag = null; });

// ---------------------------------------------------------------- lettering

for (const [id, key] of [['caption', 'caption'], ['subtitle', 'subtitle'], ['tagline', 'tagline']]) {
  const el = document.getElementById(id);
  el.addEventListener('input', (e) => {
    state[key] = e.target.value;
    redraw();
  });
  el.addEventListener('change', pushHistory);
}

// ---------------------------------------------------------------- export

function sizePreview() {
  const size = SIZES[state.size];
  canvas.width = size.w;
  canvas.height = size.h;
  canvas.style.aspectRatio = `${size.w} / ${size.h}`;
  buildPanelPicker();
  redraw();
}

function download(canvasEl, filename) {
  canvasEl.toBlob((blob) => {
    if (!blob) {
      say('Export failed — the browser could not make the PNG.');
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    say(`Saved ${filename}`);
  }, 'image/png');
}

function exportSize(key) {
  const size = SIZES[key];
  const out = renderToCanvas(state, size);
  const slug = (state.caption || 'cover').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cover';
  download(out, `${slug}-${size.w}x${size.h}.png`);
}

document.getElementById('exp-square').addEventListener('click', () => exportSize('square'));
document.getElementById('exp-portrait').addEventListener('click', () => exportSize('portrait'));
document.getElementById('exp-wide').addEventListener('click', () => exportSize('wide'));
document.getElementById('export-all').addEventListener('click', () => {
  for (const key of Object.keys(SIZES)) exportSize(key);
  say('Exported all three sizes.');
});

// ---------------------------------------------------------------- boot

async function boot() {
  for (const sample of SAMPLES) {
    try {
      await addPhoto(sample.name, sample.src);
    } catch {
      // A missing sample still leaves the editor usable with uploads.
    }
  }
  buildTray();
  buildLayoutPicker();
  buildGradePicker();
  buildTitleStylePicker();
  sizePreview();

  const params = new URLSearchParams(location.search);
  const shot = params.get('shot');
  if (shot) {
    // Cover shots are clean; the editor shot shows the selection outline
    // so the selected panel and its controls are visibly linked.
    state.showSelection = shot === 'editor';
    await runShot(shot, params, async ({ photo, caption, subtitle, layout, grade, size }) => {
      const sample = SAMPLES.find((s) => s.id === photo) ?? SAMPLES[0];
      const idx = state.photos.findIndex((p) => p.src === sample.src);
      if (idx >= 0) {
        state.panelPhoto = state.panelPhoto.map(() => idx);
        // Give the hero panel the other sample so the cover shows two photos.
        const other = state.photos.findIndex((p) => p.src !== sample.src);
        if (other >= 0) state.panelPhoto[1] = other;
      }
      state.caption = caption;
      state.subtitle = subtitle;
      state.layout = layout;
      state.grade = grade;
      state.size = size in SIZES ? size : 'square';
      document.getElementById('caption').value = caption;
      document.getElementById('subtitle').value = subtitle;
      sizePreview();
      buildLayoutPicker();
      buildGradePicker();
      buildTitleStylePicker();
      if (shot === 'editor') {
        // Scroll the controls so the Lettering group (with its "Whole
        // cover" badge) and the Selected panel group (with its "Panel N"
        // badge) are both visible next to the selection outline.
        const group = document.getElementById('title-styles').closest('.group');
        const controls = document.querySelector('.controls');
        controls.scrollTop = group.offsetTop - controls.offsetTop - 8;
      }
    }, () => redraw());
  } else {
    await ensureFonts();
    redraw();
  }
}

boot();
