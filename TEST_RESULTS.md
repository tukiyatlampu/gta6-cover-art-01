# TEST_RESULTS.md — Sunset Sleeve (round 3 rebuild)

Run 2026-11-19 ~17:03 WIB (judge session R3: re-verified after fixes),
Node v24.22.1, headless Chromium 157.0.8103.81
(`/opt/meta-chromium/chrome`). All checks pass.

## 1. Syntax — app JavaScript

`node --check` on every file under `app/src/` (`grades.js`, `layouts.js`,
`main.js`, `render.js`, `shots.js`, `state.js`): all pass, no output, exit 0.

`main.ts` / `serve.ts` are TypeScript (Node 22+ type stripping): no separate
`--check` — both execute cleanly under `node` (see §3 and §2).

## 2. Serve smoke — `serve.ts` on port 8132

14/14 assets HTTP 200, 0 failures: `/`, `/style.css`, `/src/main.js`,
`/src/state.js`, `/src/layouts.js`, `/src/grades.js`, `/src/render.js`,
`/src/shots.js`, `/samples/pier.jpg`, `/samples/boulevard.jpg`,
`/fonts/Anton-Regular.ttf`, `/fonts/Pacifico-Regular.ttf`, `/fonts/OFL.txt`,
`/index.html`.

App loads offline: screenshots were taken over `file://` with zero network
requests (this Chromium build blocks `http://127.0.0.1` navigation with
`ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS`, so the CDP driver loads the
same static app via `file://` + `--allow-file-access-from-files`). No
external URL is referenced anywhere in `app/` (only a `startsWith("http")`
string check in `shots.js`); fonts are local (Anton + Pacifico, SIL OFL).

## 3. Screenshots — CDP driver (Node stdlib, own script in /tmp)

Chromium launched with `--hatch-webgl-allowed-domains-file` +
`--hatch-webgl-allowed-domains-sha256=8097045f…` (policy file sha256). Each
scene: navigate, wait for `document.fonts.ready` + render (`document.title`
becomes `shot:<scene>`), capture JPEG quality 82 (step-down only if a shot
exceeds 256 KiB — none did). All four verified visually: cover art, bold
gradient lettering, script subtitle, photo loaded in editor.

| file | scene | dimensions | bytes | sha256 (first 12) |
| --- | --- | --- | --- | --- |
| `1-cover.jpg` | cover, pier/boulevard/pier, "Neon Shores", strip-3, sunset | 1080×1080 | 182701 | `a4cd4f8e543d` |
| `2-editor.jpg` | editor, boulevard/pier/boulevard/pier, "Boulevard Queen" | 1280×1280 | 185249 | `7a45c4f85b51` |
| `3-cover.jpg` | cover, boulevard/pier/boulevard/pier, "Boulevard Queen", grid-4, neon | 1080×1080 | 213907 | `a77bec5f044d` |
| `4-cover.jpg` | cover, pier/boulevard/pier, "Neon Shores", strip-3, sunset, portrait | 1024×1280 | 170709 | `6b7439aa7a82` |

Gate: each ≤ 256 KiB (262144 bytes), long side ≤ 1280, short side ≥ 480 —
all pass. 4-cover is the round-1 gate fix: same scene as 1-cover at
1024×1280 (long side 1280, not 1350).

## 4. Dossier — `MAKEFUN_OUTPUT_DIR=out node main.ts`

Exit 0. Output:

```text
wrote .../out/dossier.json (1038158 bytes)
handed in app/ + screenshots/ to .../out
```

| check | value | cap | result |
| --- | --- | --- | --- |
| `dossier.json` | 1038158 bytes | 1572864 | pass |
| dossier text | 32365 bytes | 163840 | pass |
| dossier images | 4 | 4 screenshots | pass |
| `app/` entries | 17 | 993 | pass |
| `app/` total | 654990 bytes | 48 MiB | pass |
| `app/index.html` | 3028 bytes | 1 MiB | pass |
| longest `app/` path | 30 bytes | 1000 | pass |

## 5. Determinism

Grain is seeded (mulberry32, fixed seed) — re-shooting `1-cover.jpg`
produces a byte-identical file: sha256 `a4cd4f8e543d…` on both runs.

## 7. Wide export — 1920×1080 lettering check (test shot, /tmp only)

The third export size was render-tested at 1920×1080 (`?size=wide`,
grid-4, neon): title, script subtitle and tagline all fit with no
overlap. This caught a real bug — W-scaled type overflowed the H-based
title zone, so the subtitle and tagline collided at the bottom edge —
fixed in `render.js` (type sizes now scale with the shorter side, title
capped so the whole stack clears the canvas bottom). All four package
screenshots re-shot after the fix are byte-identical to before it
(same sha256), proving zero regression in square/portrait.

## 6. Fixes made in the judge session (all under the recording)

In `app/src/shots.js`: shot params now sync the editor text inputs (before,
the editor shot showed the default title in the input while the canvas
showed the shot caption), `?size=` selects the export size so the portrait
shot renders full-bleed instead of letterboxed, and new `?photos=a,b,c`
sets one photo per panel (before, `?photo=` forced the same photo into
every panel, so every cover shot repeated one face 3–4×).

In `app/src/render.js`: removed the diagonal sun-streak overlay (it read
as a pale scratch/stripe across faces); grain tile now uses a seeded PRNG
so renders are deterministic; panel outlines now honour a layout's
`poly` polygon so diagonal splits clip and seam on the diagonal; and
the lettering stack now scales with the shorter canvas side with a
vertical cap, fixing a wide-export (1920×1080) collision where the
script subtitle and tagline overlapped at the bottom edge.

In `app/src/layouts.js`: "Duo Diagonal" now has a real diagonal split
(two polygons, seam sloping 0.50 → 0.58); before it was two stacked
rectangles despite the name.

In `app/src/state.js`: `loadState` replaces a persisted `blob:` photo URL
(dead after reload) with the default sample instead of showing a purple
empty panel.

In `app/style.css`: `body.shot-editor` lays the panel out in two columns
so the editor screenshot shows the whole editor — caption, all 6 layouts,
all 5 grades, per-panel photo, polish, all 3 export sizes — in one
1280×1280 frame at full text size. The real app is unchanged; the editor
shot is now 1280×1280 (was 1280×720, title clipped, lower sections cut).

## Round 4 fix — run_completes (2026-11-20 ~00:47 WIB)

Round 3 was rejected on one check only: `run_completes` — the dev grade run
exited 1. Every other check passed, including `transcripts_witnessed`.

Cause (proven from the harness source `grader/program.ts` + `images.ts`):
the grader runs `node /bot/main.ts` in a container where the repo is mounted
read-only at /bot and the writable output at /output, and it does NOT set
`MAKEFUN_OUTPUT_DIR`. The round-3 `main.ts` defaulted to
`join(repoRoot, "out")` (= /bot/out, read-only) when the variable was unset,
so `rmSync`/`mkdirSync` threw EROFS and the program exited 1. The kit
starter and the round-1 `main.ts` both default to `/output`.

Fix (one line in `main.ts`, plus a comment):
`const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');`

Verification:
- `MAKEFUN_OUTPUT_DIR=out node main.ts` → exit 0; dossier.json
  sha256 `bc5e41195499027ec3bb0c347c84a40f25837506092e14da418c6f1834373565`,
  byte-identical to the pre-fix dossier (main.ts is not part of the dossier).
- Grader simulation (read-only copy of the package, `MAKEFUN_OUTPUT_DIR`
  unset) → exit 0, `/output/dossier.json` written, same sha256.
  /output and the simulation copy were removed afterwards.

## Round 5 fix — run_completes, EBUSY on /output (2026-11-20 ~08:30 WIB)

Round 4 was rejected on one check only: `run_completes` — the dev grade run
exited 1, no breakdown. `transcripts_witnessed` passed.

Root cause (reproduced, not just inferred): the round-4 `main.ts` called
`rmSync(outDir, { recursive: true, force: true })` with the default
`outDir = /output`. The grader mounts /output as a writable mount point,
and `rmSync` on a mount point throws EBUSY ("Device or resource busy") —
uncaught → exit 1. Reproduced in this VM with `unshare -rm` + a bind
mount: `rmSync` on the bind-mounted dir threw
`Unknown error: Device or resource busy`, node exit 1. The round-4
"grader simulation" missed this because it used a plain read-only copy,
not a real mount point — `rmSync` on an ordinary directory succeeds, so
the local test passed falsely. The starter never deletes /output; it only
`mkdirSync`s and copies over it.

Fix (only `main.ts` changed, plus this file):
- Removed `rmSync(outDir, { recursive: true, force: true });` and the
  `rmSync` import; `main()` now only does `mkdirSync(outDir,
  { recursive: true })` then copies `app/` + `screenshots/` and writes
  `dossier.json`, exactly like the starter. Default `/output` unchanged;
  everything else byte-identical.

Verification (2026-11-20 ~08:30 WIB, Node v24.22.1):
- (a) True grader simulation — `unshare -rm`: package bind-mounted
  read-only at /bot (`/dev/mapper/rv … (ro,…)`), scratch dir bind-mounted
  at /output (real mount point, tmpfs), `MAKEFUN_OUTPUT_DIR` unset,
  `node /bot/main.ts` → **exit 0**, `wrote /output/dossier.json
  (1038158 bytes)`. Dossier sha256
  `bc5e41195499027ec3bb0c347c84a40f25837506092e14da418c6f1834373565`
  (identical to the round-3/round-4 dossier — main.ts is not part of it).
- (b) Local run — `MAKEFUN_OUTPUT_DIR=/tmp/r5-sim/out-local node
  main.ts` → **exit 0**; dossier sha256 identical to (a), `cmp` confirms
  byte-identical.
- (c) Caps, from the grader-sim output: 4 screenshots (182701 / 185249 /
  213907 / 170709 bytes, each ≤ 262144), `app/` 13 files + 4 dirs = 17
  entries (≤ 993), 654990 bytes (≤ 48 MiB), dossier 1038158 bytes,
  `dossier.images` = 4. `buildDossier` enforces the caps and exited 0.
- Sim outputs live only in /tmp/r5-sim (outside the package); no extra
  files were added to the package dir.
