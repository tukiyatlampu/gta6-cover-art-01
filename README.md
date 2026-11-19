[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/tukiyatlampu/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard)
[![reward](https://make.fun/badge/gta6-cover-art-01/tukiyatlampu/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

# Sunset Sleeve — GTA-style cover maker

Turn any photo into Vice City cover art: pick a layout and a grade, edit the
caption, export a PNG. Fully offline — no network requests, photos never leave
the machine. 6 layouts, 5 grades, gradient display lettering (Anton) + neon
script subtitle (Pacifico), grain + vignette polish. Exports 1080×1080,
1080×1350, 1920×1080.

## Architecture

- `app/index.html` — editor shell: preview canvas + controls.
- `app/src/state.js` — state, defaults, sample photos, export sizes.
- `app/src/layouts.js` — 6 panel layouts (fractions of the canvas).
- `app/src/grades.js` — 5 grades: CSS filter + overlay colours + title gradient.
- `app/src/render.js` — pure canvas 2D: cover-fit panels, grade wash, grain,
  vignette, lettering; `exportPNG` for downloads.
- `app/src/shots.js` — `?shot=cover` / `?shot=editor` scenes for screenshots
  (`?photos=&photo=&caption=&layout=&grade=&size=`; `?photos=` takes a
  comma list, one photo per panel).
- `app/src/main.js` — wires controls to state + render.
- `app/fonts/` — Anton + Pacifico (SIL OFL, see `OFL.txt`).
- `app/samples/` — two built-in demo photos (free to use).
- `main.ts` — entrypoint: copies `app/` + `screenshots/` to the output dir
  and writes `dossier.json`.
- `serve.ts` — tiny static server for local testing (stdlib only).
- `shots.json` — the 4 screenshot scenes and their sizes.

## Quick test

```sh
node --check app/src/*.js
PORT=8130 node serve.ts   # then open http://127.0.0.1:8130/
MAKEFUN_OUTPUT_DIR=out node main.ts
```

Screenshots: `node ../work/shoot-cover-r3.mjs` (headless Chromium CDP driver;
see `TEST_RESULTS.md` for the exact numbers).

## Live demo

Static app — makefun.sh hosting publishes it from the first valid entry.
