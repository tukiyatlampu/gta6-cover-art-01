# Sunset Sleeve — GTA-style cover maker

**Architecture.** A zero-dependency offline web app (`app/`, plain HTML/CSS/ES modules, canvas 2D). `app/src/state.js` holds the cover state (photos, layout, grade, lettering, per-panel crop); `app/src/layouts.js` computes panel geometry per export size; `app/src/grades.js` defines the five colour grades (canvas filter + tint overlays + lettering palette); `app/src/render.js` draws the whole cover — panels, grade, gradient Anton title, glowing Pacifico subtitle, masthead tagline, film grain, vignette; `app/src/main.js` wires the editor UI, uploads and PNG export; `app/src/shots.js` provides the fixed `?shot=` scenes used for the screenshots. `main.ts` (Node 22, stdlib only) copies `app/` + `screenshots/` to the output dir and writes `dossier.json` with the vendored `vendor/makefun-app.ts`.

**What it does.** Drop in any photo (or use the two built-in samples) and get a multi-panel GTA-style cover: 6 layouts (Hero + 3, Grid 2×2, Full bleed, Tilted snaps, Film strip, Duo split), 5 grades (Sunset, Neon, Vice, Noir, Palm), bold gradient display lettering with a neon script subtitle, per-panel zoom/pan crop, and one-click PNG export at 1080×1080, 1080×1350 and 1920×1080. Everything runs in the browser; photos never leave the machine. Fonts (Anton + Pacifico, SIL OFL) are vendored under `app/fonts/` with their `OFL.txt` files. No Rockstar logo, artwork or fonts are used. Long captions wrap to two lines instead of shrinking away; drag the photo inside a panel to frame it (sliders stay for fine control, Reset crop restores it); Undo/Redo covers every edit; title fill can be the grade gradient, white or gold; wide film-strip panels default to showing the top of the photo so faces survive the crop.

**Live demo.** The app is static files; makefun.sh hosting publishes it from the first valid entry. Or serve locally: `node serve.ts` → http://localhost:8080.

**Quick test.**
```sh
node --check app/src/*.js
MAKEFUN_OUTPUT_DIR=out node main.ts   # writes out/dossier.json
```
See `TEST_RESULTS.md` for the last full run.

**Files.** `app/index.html`, `app/style.css`, `app/src/*.js`, `app/fonts/`, `app/samples/`, `screenshots/` (4 JPEGs: cover, editor, cover, cover), `main.ts`, `serve.ts`, `vendor/makefun-app.ts` (the scorer's library, byte-identical from the kit).
