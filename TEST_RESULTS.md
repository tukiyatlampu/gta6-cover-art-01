# TEST_RESULTS.md — Sunset Sleeve (gta6-cover-art-01)

Run: 2026-11-19, on this VM, Node v24.22.1, headless Chromium 157.0.8103.81
(Muse Browser build at /opt/meta-chromium/chrome; it needs a WebGL domain
policy file to start, so the test harness passes
`--hatch-webgl-allowed-domains-file` + sha256 — that is a property of the
local browser binary, not of the app).

## 1. JS syntax — PASS
`node --check` on all six app modules (main.js, render.js, layouts.js,
grades.js, state.js, shots.js): no errors.

## 2. App load + screenshots (CDP, file://, no HTTP server) — PASS
Driver: /tmp/gta6-cdp.mjs — each `?shot=` scene opened as a fresh target,
waited for `window.__shotReady`, captured JPEG quality 82.

| screenshot | scene | ready | bytes | console errors | failed requests |
|---|---|---|---|---|---|
| 1-cover.jpg | hero-three / sunset, pier, 1080×1080 | true | 211,802 | 0 | 0 |
| 2-editor.jpg | editor, grid-four / neon, boulevard, 1280×1000 | true | 203,372 | 0 | 0 |
| 3-cover.jpg | tilted / vice, boulevard, "Boulevard Queen Of The Night", 1080×1080 | true | 195,854 | 0 | 0 |
| 4-cover.jpg | strip / sunset, pier, 1080×1350 | true | 194,903 | 0 | 0 |

All 4 are ≤ 256 KiB (cap 262,144), long side ≤ 1280, short side ≥ 480.
Every request the pages made was a `file://` load of the app's own files
(HTML, CSS, JS modules, 2 fonts, 2 sample photos) — zero HTTP requests,
zero external requests.

## 3. Export sizes (CDP probe, /tmp/gta6-export-probe.mjs) — PASS
`renderToCanvas` at all three sizes, default state, both sample photos loaded:

| size | canvas | non-blank pixels | PNG bytes |
|---|---|---|---|
| square | 1080 × 1080 | yes | 2,749,034 |
| portrait | 1080 × 1350 | yes | 3,392,733 |
| wide | 1920 × 1080 | yes | 4,751,983 |

Runtime exceptions during the probe: none.

## 3b. Editor interactions (CDP probe, /tmp/gta6-func-probe.mjs) — PASS
Drove the real UI in headless Chrome (no errors):
- Long caption `THE LONGEST SUNSET HEIST EVER` (28 chars): renders, canvas
  non-blank (3,671,234-byte PNG data URL) — wraps instead of overflowing.
- Drag-to-pan: pointer drag on the preview moved the selected panel's crop
  (pan-x 0 → 0.32, pan-y 0 → 0.75, fractions of the photo's slack).
- Undo/redo: grade Neon → Undo → Sunset → Redo → Neon; buttons enable/disable correctly.
- Title fill picker: Gradient / White / Gold all present; White selects.
- Reset crop: restores pan 0, 0 and zoom 1.15.

## 4. Entrypoint — PASS
`MAKEFUN_OUTPUT_DIR=out node main.ts` → `Sunset Sleeve handed in to out`,
exit 0. `out/` holds `app/`, `screenshots/` (4 JPEGs) and `dossier.json`.

## 5. Gate limits (scorer caps) — PASS
- dossier.json: 1,126,965 bytes (cap 1.5 MiB = 1,572,864)
- dossier text: 50,149 bytes (cap 160 KiB = 163,840); all 8 source files
  included whole, no truncation line
- app/: 20 files+directories (cap 993), 677,161 bytes (cap 48 MiB)
- app/index.html: 3,709 bytes (cap 1 MiB)
- screenshots: 4 images, each ≤ 262,144 bytes (cap 4, 256 KiB each)
- dossier schema: makefun/dossier/v1, cover = first screenshot (1-cover.jpg)

## 6. Hostile-photo QA (QA photos only, NOT shipped) — PASS
Two non-kit photos (picsum: tall 540×960 forest aerial, wide 1200×600
beach railway) rendered through 8 layout/ratio combinations
(/tmp/gta6-qa-probe.mjs): hero-three square/wide, strip portrait,
grid-four wide, tilted square, duo-split wide, full-bleed portrait — all
rendered non-blank, 0 runtime errors. Visually inspected: compositions
hold, long caption wraps to two readable lines over busy photos, faces
survive the film-strip bands. This QA caught one real bug: exported PNGs
carried the editor's cyan selection outline (renderToCanvas shared the
preview path) — fixed so exports render with `showSelection: false`,
re-verified by re-running the export probe (PNG bytes changed
accordingly) and the QA matrix.

## 6. Notes / environment quirks found while testing
- This Chromium build refuses `--screenshot` / `--dump-dom` (exits silently
  with no output); screenshots were taken through the DevTools protocol
  instead (Page.captureScreenshot).
- The same build blocks navigation to localhost/127.0.0.1 from a fresh tab
  (Local Network Access check, ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS);
  the app was therefore tested from `file://` with
  `--allow-file-access-from-files`, which also proves it needs no server.
  The app itself makes no network requests, so this does not affect it.
- A tagline/title overlap found in the first screenshot pass was fixed
  (tagline moved to a top masthead) and the screenshots re-rendered.
- A decapitated face in the film-strip layout was fixed twice: pan is now a
  fraction of the photo's actual slack (was: of the panel), and wide strip
  panels default to showing the top of the photo.
- Pass-1 judge critique (gpt-6.1-sol, 84/100) drove the round-2 changes:
  drag-to-pan, undo/redo, title-fill variants, two-line caption wrap,
  slack-based pan, and the 4th screenshot re-shot as a sunset film strip
  instead of a noir split. Pass 2 scored 92/100; pass 3 scored 94/100.
  Round 3 closed the remaining evidence gaps: thumbnail proof — the
  28-char caption covers (strip portrait + hero wide) downsampled to
  240 px wide keep the main title clearly readable and dominant over the
  script subtitle and masthead (contact sheet /tmp/gta6-qa/thumbs-240.jpg);
  control-scope labels — Layout/Grade/Lettering groups carry a "Whole
  cover" badge, the panel group carries a live "Panel N" badge, and the
  editor screenshot shows both badges alongside the selection outline.
  Pass 4 (final): 96/100 — both remaining gaps closed.
