// main.js — wires the editor UI to state + render.
// Every control updates state, saves it, and re-renders the preview.
import { defaultState, loadState, saveState, EXPORT_SIZES, SAMPLES } from "./state.js";
import { LAYOUTS, getLayout, layoutPanelCount } from "./layouts.js";
import { GRADES, getGrade } from "./grades.js";
import { renderCover, exportPNG, loadImage } from "./render.js";
import { applyShotParams } from "./shots.js";

const $ = (id) => document.getElementById(id);
const state = loadState();
const preview = $("preview");
let renderToken = 0;

function sizeFor(id) {
  return EXPORT_SIZES.find((s) => s.id === id) || EXPORT_SIZES[0];
}

async function render() {
  const token = ++renderToken;
  await renderCover(preview, state, sizeFor(state.exportSize));
  if (token !== renderToken) return; // a newer render superseded this one
  $("sizeLabel").textContent =
    `${sizeFor(state.exportSize).w} × ${sizeFor(state.exportSize).h}`;
}

function refreshPanelControls() {
  const layout = getLayout(state.layout);
  const n = layoutPanelCount(layout);
  const wrap = $("panelList");
  wrap.innerHTML = "";
  for (let i = 0; i < n; i++) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "panel-chip" + (state.selectedPanel === i ? " active" : "");
    b.textContent = "Panel " + (i + 1);
    b.addEventListener("click", () => {
      state.selectedPanel = i;
      syncPanelInputs();
      refreshPanelControls();
    });
    wrap.appendChild(b);
  }
  const note = $("panelNote");
  if (note) note.textContent = `${n} panel${n > 1 ? "s" : ""} in this layout.`;
  syncPanelInputs();
}

function syncPanelInputs() {
  const slot = state.panels[state.selectedPanel] || state.panels[0];
  $("zoom").value = slot.zoom;
  $("panX").value = slot.dx;
  $("panY").value = slot.dy;
  $("zoomVal").textContent = Number(slot.zoom).toFixed(2) + "×";
  $("panXVal").textContent = Math.round(slot.dx * 100) + "%";
  $("panYVal").textContent = Math.round(slot.dy * 100) + "%";
}

function bindPanelInput(id, key) {
  $(id).addEventListener("input", (e) => {
    const slot = state.panels[state.selectedPanel];
    slot[key] = parseFloat(e.target.value);
    saveState(state);
    syncPanelInputs();
    render();
  });
}

function buildPickers() {
  const lw = $("layoutList");
  for (const l of LAYOUTS) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "pick" + (state.layout === l.id ? " active" : "");
    b.innerHTML = `<strong>${l.name}</strong><span>${l.blurb}</span>`;
    b.addEventListener("click", () => {
      state.layout = l.id;
      if (state.selectedPanel >= layoutPanelCount(l)) state.selectedPanel = 0;
      saveState(state);
      buildPickers();
      refreshPanelControls();
      render();
    });
    lw.appendChild(b);
  }
  const gw = $("gradeList");
  for (const g of GRADES) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "pick grade" + (state.grade === g.id ? " active" : "");
    b.innerHTML =
      `<span class="swatch" style="background:linear-gradient(135deg,${g.titleFrom},${g.titleTo})"></span>` +
      `<strong>${g.name}</strong><span>${g.blurb}</span>`;
    b.addEventListener("click", () => {
      state.grade = g.id;
      saveState(state);
      buildPickers();
      render();
    });
    gw.appendChild(b);
  }
  const sw = $("sizeList");
  for (const s of EXPORT_SIZES) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "pick" + (state.exportSize === s.id ? " active" : "");
    b.innerHTML = `<strong>${s.label}</strong><span>Export PNG</span>`;
    b.addEventListener("click", () => {
      state.exportSize = s.id;
      saveState(state);
      buildPickers();
      render();
    });
    sw.appendChild(b);
  }
}

function bindText(id, key) {
  $(id).value = state[key];
  $(id).addEventListener("input", (e) => {
    state[key] = e.target.value;
    saveState(state);
    render();
  });
}

function bindFileInputs() {
  $("upload").addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    state.panels[state.selectedPanel].photo = url;
    saveState(state);
    render();
    e.target.value = "";
  });
  $("samplePier").addEventListener("click", () => {
    state.panels[state.selectedPanel].photo = SAMPLES.pier;
    saveState(state);
    render();
  });
  $("sampleBoulevard").addEventListener("click", () => {
    state.panels[state.selectedPanel].photo = SAMPLES.boulevard;
    saveState(state);
    render();
  });
}

async function exportCurrent() {
  const btn = $("exportBtn");
  btn.disabled = true;
  btn.textContent = "Exporting…";
  try {
    const off = document.createElement("canvas");
    await renderCover(off, state, sizeFor(state.exportSize));
    const blob = await exportPNG(off);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sunset-sleeve-${state.exportSize}-${sizeFor(state.exportSize).w}x${sizeFor(state.exportSize).h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    $("status").textContent =
      `Exported ${a.download} — PNG ready, photo never left this machine.`;
  } finally {
    btn.disabled = false;
    btn.textContent = "Export PNG";
  }
}

async function init() {
  bindText("title", "title");
  bindText("subtitle", "subtitle");
  bindText("tagline", "tagline");
  buildPickers();
  refreshPanelControls();
  bindPanelInput("zoom", "zoom");
  bindPanelInput("panX", "dx");
  bindPanelInput("panY", "dy");
  bindFileInputs();
  $("exportBtn").addEventListener("click", exportCurrent);
  $("resetBtn").addEventListener("click", () => {
    const fresh = defaultState();
    Object.assign(state, fresh);
    saveState(state);
    location.reload();
  });
  $("grain").value = state.grain;
  $("vignette").value = state.vignette;
  $("grain").addEventListener("input", (e) => {
    state.grain = parseFloat(e.target.value);
    saveState(state);
    render();
  });
  $("vignette").addEventListener("input", (e) => {
    state.vignette = parseFloat(e.target.value);
    saveState(state);
    render();
  });
  // Preload sample photos so first paint is instant.
  loadImage(SAMPLES.pier).catch(() => {});
  loadImage(SAMPLES.boulevard).catch(() => {});
  await applyShotParams(state, render);
  await render();
  $("status").textContent = "Ready — pick a layout, a grade, export a PNG.";
}

init().catch((err) => {
  const s = $("status");
  if (s) s.textContent = "Something failed to load: " + err.message;
});
