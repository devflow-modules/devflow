import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const origins = JSON.parse(readFileSync(resolve(root, "extension-origins.json"), "utf8"));
const target = process.env.APPLYFLOW_EXTENSION_TARGET === "production" ? "production" : "local";
const applyflowOrigins = target === "production" ? origins.productionOrigins : origins.localOrigins;
const hostPermissions = [
  ...applyflowOrigins.map((origin) => `${origin}/*`),
  "https://www.linkedin.com/*",
  "https://api.openai.com/*",
];

const contentScriptMatches =
  target === "production"
    ? ["https://www.linkedin.com/*"]
    : [
        "https://www.linkedin.com/*",
        ...applyflowOrigins.map((origin) => `${origin}/extension-fixture*`),
      ];

const manifest = {
  manifest_version: 3,
  name: "ApplyFlow",
  version: "0.2.0",
  description: "Copiloto assistido para LinkedIn Easy Apply (DevFlow Labs). Não envia candidaturas automaticamente.",
  key: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqfkOvqR9+3GCs6XHjpkoVy9WZ5WmdGWCc/zu/5k2y2lU0yvVR+1kEaxuGQeXOd1cm8rrz17PYb+VmtvDV+Ct0xuHqaiU5H/SDcLI9GyV28Spk9LXNaCsFJTxDv4e3N3F0etRe0QE+i28eC3hYAZJ7sR7EIH7bd4mraUvBGezKnu9U/UWSJo/9nrcOtGPAU4gDsZ3JHKi4+otBZq6kt1uFYcfoujNMQdu4VvitBadALZZlFKulaTUtXgOnfrAkWFvunn2s7nthsvzVKFPd+uKOpSfT0sW+vwAJhPHZE7URcl0U6yx59wiZdx5a7g2gmFxanD8YE0AH9frAk0DqHChgQIDAQAB",
  permissions: ["storage"],
  host_permissions: hostPermissions,
  externally_connectable: {
    matches: applyflowOrigins.map((origin) => `${origin}/*`),
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
console.log(JSON.stringify({ target, extensionId: origins.extensionId, origins: applyflowOrigins }));
