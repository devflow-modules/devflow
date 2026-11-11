/**
 * Build a dist-only zip + sha256 for future CWS submission.
 * Does not publish. Refuses to include env/profile/dump artifacts.
 */
import { createHash } from "node:crypto";
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const outDir = join(root, ".distribution");
const version = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
const zipName = `applyflow-extension-${version}.zip`;
const zipPath = join(outDir, zipName);
const hashPath = join(outDir, `${zipName}.sha256`);
const inventoryPath = join(outDir, "MANIFEST_INVENTORY.json");

const FORBIDDEN_NAME =
  /(\.env|\.pem|\.dump|credentials|qa-chrome-profile|\.qa-pw|node_modules|\.map$)/i;

function listFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full));
    else out.push(full);
  }
  return out;
}

if (!existsSync(join(dist, "manifest.json"))) {
  console.error("dist/manifest.json missing — run pnpm --filter applyflow-extension build first");
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(join(dist, "manifest.json"), "utf8"));
if (manifest.version !== version) {
  console.error(`Version mismatch package=${version} manifest=${manifest.version}`);
  process.exit(1);
}

const files = listFiles(dist);
for (const file of files) {
  const rel = relative(dist, file).replace(/\\/g, "/");
  if (FORBIDDEN_NAME.test(rel)) {
    console.error(`Refusing forbidden dist artifact: ${rel}`);
    process.exit(1);
  }
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

// Prefer PowerShell Compress-Archive on Windows; zip CLI elsewhere.
const isWin = process.platform === "win32";
if (isWin) {
  const ps = spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      `Compress-Archive -Path (Join-Path '${dist.replace(/'/g, "''")}' '*') -DestinationPath '${zipPath.replace(/'/g, "''")}' -Force`,
    ],
    { encoding: "utf8" },
  );
  if (ps.status !== 0) {
    console.error(ps.stderr || ps.stdout || "Compress-Archive failed");
    process.exit(1);
  }
} else {
  const zip = spawnSync("zip", ["-r", zipPath, "."], { cwd: dist, encoding: "utf8" });
  if (zip.status !== 0) {
    console.error(zip.stderr || zip.stdout || "zip failed");
    process.exit(1);
  }
}

const zipBuf = readFileSync(zipPath);
const sha256 = createHash("sha256").update(zipBuf).digest("hex");
writeFileSync(hashPath, `${sha256}  ${zipName}\n`, "utf8");

const inventory = {
  version: manifest.version,
  name: manifest.name,
  manifest_version: manifest.manifest_version,
  permissions: manifest.permissions ?? [],
  host_permissions: manifest.host_permissions ?? [],
  externally_connectable: manifest.externally_connectable ?? null,
  fileCount: files.length,
  zipBytes: zipBuf.length,
  zipSha256: sha256,
  note: "Unpacked key-derived id differs from future CWS id. No secrets included.",
};
writeFileSync(inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`, "utf8");

console.log(JSON.stringify({ ok: true, zipPath, sha256, fileCount: files.length }, null, 2));
