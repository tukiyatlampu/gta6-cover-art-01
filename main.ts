// main.ts — entrypoint for the Sunset Sleeve package (Node 22, stdlib only).
// Copies app/ and screenshots/ into the output directory and writes
// /output/dossier.json via vendor/makefun-app.ts buildDossier.
//
// Usage:  MAKEFUN_OUTPUT_DIR=out node main.ts
//         (defaults to /output when the env var is unset)
import { buildDossier } from "./vendor/makefun-app.ts";
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)));
// The grader mounts the repo read-only at /bot and the writable output at
// /output, without setting MAKEFUN_OUTPUT_DIR — so the default must be
// /output, never a path under the repo (that threw EROFS and exited 1).
const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');

const caps = {
  text_max_bytes: 160 * 1024,
  screenshots: { max: 4, max_bytes: 256 * 1024 },
  app_max_files: 993,
  app_max_bytes: 48 * 1024 * 1024,
  app_path_max_bytes: 1000,
};

function copyTree(name: string): void {
  const src = join(repoRoot, name);
  if (!existsSync(src)) {
    throw new Error(`missing ${name}/ in ${repoRoot} — nothing to hand in`);
  }
  cpSync(src, join(outDir, name), { recursive: true });
}

function main(): void {
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  copyTree("app");
  copyTree("screenshots");
  const dossier = buildDossier(outDir, caps);
  writeFileSync(join(outDir, "dossier.json"), dossier);
  console.log(`wrote ${join(outDir, "dossier.json")} (${dossier.length} bytes)`);
  console.log(`handed in app/ + screenshots/ to ${outDir}`);
}

main();
