import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const script = resolve(root, "scripts/write-extension-manifest.mjs");
const manifestPath = resolve(root, "public/manifest.json");

const run = spawnSync(process.execPath, [script], { cwd: root, encoding: "utf8" });
assert.equal(run.status, 0, run.stderr || run.stdout);

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const matches = manifest.externally_connectable?.matches || [];
assert.ok(matches.includes("https://devflow-applyflow.vercel.app/*"));
assert.ok(matches.includes("http://127.0.0.1:3010/*"));
assert.ok(matches.includes("http://localhost:3010/*"));
assert.equal(matches.some((m) => m.includes("*.vercel.app")), false);
assert.equal(matches.includes("<all_urls>"), false);
assert.ok((manifest.host_permissions || []).includes("https://devflow-applyflow.vercel.app/*"));
assert.equal(manifest.version, "0.2.1");

console.log(
  JSON.stringify({
    ok: true,
    version: manifest.version,
    externally_connectable: matches,
  }),
);
