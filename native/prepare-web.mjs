#!/usr/bin/env node
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "dist-native");

execSync("npx vite build --config vite.native.config.ts", {
  cwd: root,
  stdio: "inherit",
});

const nested = join(outDir, "native/index.html");
const flat = join(outDir, "index.html");
if (existsSync(nested) && !existsSync(flat)) {
  writeFileSync(flat, readFileSync(nested, "utf8"));
}
if (existsSync(nested)) rmSync(join(outDir, "native"), { recursive: true, force: true });

if (!existsSync(flat)) {
  console.error("Native build did not emit dist-native/index.html");
  process.exit(1);
}

let html = readFileSync(flat, "utf8");
html = html.replace(/\.\.\/(?:\.\.\/)*assets\//g, "./assets/");
html = html.replace(/(['"])\/assets\//g, "$1./assets/");
if (!html.includes('id="root"')) {
  console.error("Native index.html is missing #root");
  process.exit(1);
}
if (html.includes("../assets/")) {
  console.error("Native index.html still points outside dist-native");
  process.exit(1);
}
writeFileSync(flat, html);

writeFileSync(join(outDir, ".rite-native"), "ok\n");
mkdirSync(outDir, { recursive: true });
console.log("Native web shell ready at dist-native/index.html");
