import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const origins = JSON.parse(readFileSync(resolve(root, "extension-origins.json"), "utf8"));

/**
 * Manifest must allow the web app to call chrome.runtime.sendMessage.
 * Service worker already unions local + production allowlists; the generated
 * externally_connectable list must match that (localhost for fixtures/dev,
 * canonical Production origin only — no *.vercel.app wildcards).
 */
const localOrigins = Array.isArray(origins.localOrigins) ? origins.localOrigins : [];
const productionOrigins = Array.isArray(origins.productionOrigins) ? origins.productionOrigins : [];
const connectableOrigins = [...new Set([...localOrigins, ...productionOrigins])];

const forbiddenPattern = (value) =>
  value.includes("*") || value === "<all_urls>" || value.startsWith("https://*.") || value === "https://*/*";

for (const origin of connectableOrigins) {
  if (typeof origin !== "string" || !origin || forbiddenPattern(origin)) {
    throw new Error(`Refusing unsafe ApplyFlow origin for extension manifest: ${String(origin)}`);
  }
  if (origin.startsWith("https://") && !productionOrigins.includes(origin)) {
    throw new Error(`Unexpected https origin outside productionOrigins: ${origin}`);
  }
}

const hostPermissions = [
  ...connectableOrigins.map((origin) => `${origin}/*`),
  "https://www.linkedin.com/*",
  "https://api.openai.com/*",
];

const contentScriptMatches = [
  "https://www.linkedin.com/*",
  ...localOrigins.map((origin) => `${origin}/extension-fixture*`),
];

const manifest = {
  manifest_version: 3,
  name: "ApplyFlow",
  version: "0.2.1",
  description: "Copiloto assistido para LinkedIn Easy Apply (DevFlow Labs). Não envia candidaturas automaticamente.",
  key: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqfkOvqR9+3GCs6XHjpkoVy9WZ5WmdGWCc/zu/5k2y2lU0yvVR+1kEaxuGQeXOd1cm8rrz17PYb+VmtvDV+Ct0xuHqaiU5H/SDcLI9GyV28Spk9LXNaCsFJTxDv4e3N3F0etRe0QE+i28eC3hYAZJ7sR7EIH7bd4mraUvBGezKnu9U/UWSJo/9nrcOtGPAU4gDsZ3JHKi4+otBZq6kt1uFYcfoujNMQdu4VvitBadALZZlFKulaTUtXgOnfrAkWFvunn2s7nthsvzVKFPd+uKOpSfT0sW+vwAJhPHZE7URcl0U6yx59wiZdx5a7g2gmFxanD8YE0AH9frAk0DqHChgQIDAQAB",
  permissions: ["storage"],
  host_permissions: hostPermissions,
  externally_connectable: {
    matches: connectableOrigins.map((origin) => `${origin}/*`),
  },
  options_ui: {
    page: "options.html",
    open_in_tab: true,
  },
  background: {
    service_worker: "background.js",
    type: "module",
  },
  content_scripts: [
    {
      matches: contentScriptMatches,
      js: ["content.js"],
      run_at: "document_idle",
    },
  ],
};

writeFileSync(resolve(root, "public/manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(
  JSON.stringify({
    extensionId: origins.extensionId,
    version: manifest.version,
    externally_connectable: manifest.externally_connectable.matches,
    host_permissions: manifest.host_permissions,
  }),
);
