#!/usr/bin/env node
import { execFileSync, execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const apk = process.argv[2] || join(root, "dist-apk/Rite-debug.apk");
const store = join(root, "native/rite-debug.keystore");
const pinFile = join(root, "native/rite-debug.sha256");

function norm(hex) {
  return hex.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
}

function extractSha(text) {
  const match = text.match(/SHA-?256(?:\s+digest)?:\s*([0-9A-Fa-f:]+)/i);
  if (!match) throw new Error(`No SHA-256 in:\n${text.slice(0, 800)}`);
  return norm(match[1]);
}

function keystoreSha() {
  const out = execFileSync(
    "keytool",
    ["-list", "-v", "-keystore", store, "-storepass", "android", "-alias", "rite"],
    { encoding: "utf8" },
  );
  return extractSha(out);
}

function findApksigner() {
  const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || "";
  const tools = join(sdk, "build-tools");
  if (existsSync(tools)) {
    const versions = readdirSync(tools).sort().reverse();
    for (const version of versions) {
      const bin = join(tools, version, "apksigner");
      if (existsSync(bin)) return bin;
    }
  }
  try {
    execSync("command -v apksigner", { stdio: "ignore" });
    return "apksigner";
  } catch {
    return null;
  }
}

function apkSha() {
  const signer = findApksigner();
  if (signer) {
    const out = execFileSync(signer, ["verify", "--print-certs", apk], { encoding: "utf8" });
    return extractSha(out);
  }
  const out = execFileSync("keytool", ["-printcert", "-jarfile", apk], { encoding: "utf8" });
  return extractSha(out);
}

if (!existsSync(apk)) {
  console.error(`Missing APK: ${apk}`);
  process.exit(1);
}
if (!existsSync(store)) {
  console.error("Missing native/rite-debug.keystore");
  process.exit(1);
}

const fromStore = keystoreSha();
const fromApk = apkSha();
const pinned = existsSync(pinFile) ? norm(readFileSync(pinFile, "utf8")) : fromStore;

console.log(`keystore SHA-256: ${fromStore}`);
console.log(`apk       SHA-256: ${fromApk}`);
console.log(`pinned    SHA-256: ${pinned}`);

if (fromStore !== pinned) {
  console.error("Keystore does not match native/rite-debug.sha256");
  process.exit(1);
}
if (fromApk !== fromStore) {
  console.error("APK was not signed with native/rite-debug.keystore (Gradle still used the runner debug key).");
  process.exit(1);
}
console.log("Signing pin ok — future APKs with this fingerprint can Update in place.");
