#!/usr/bin/env node
/**
 * Lightweight secret scan for committed files.
 *
 * Fails when a value that looks like a *real* secret appears to be committed. It deliberately
 * avoids false positives on `.env.example` files and on obvious placeholders (replace_me,
 * <...>, your_, example, changeme, dummy, xxxx, etc.).
 *
 * Usage: node scripts/ci/check-secret-scan.mjs
 */
import { execSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";

const PLACEHOLDER_PATTERN =
  /^(?:$|replace_me|changeme|change_me|your[_-]?|example|dummy|placeholder|mock|test|sample|xxx+|<.*>|\.\.\.|sk-xxx+|sk-\.\.\.)/i;

const SKIP_FILE_PATTERN =
  /(\.env\.example$|^|\/)?(pnpm-lock\.yaml|package-lock\.json|yarn\.lock)$|\.(png|jpg|jpeg|gif|webp|ico|pdf|woff2?|ttf|eot|mp4|zip|gz)$/i;

const SKIP_PATH_SUBSTRINGS = [
  "node_modules/",
  "/dist/",
  "scripts/ci/check-secret-scan.mjs",
];

const CHECKS = [
  {
    name: "openai_live_key",
    regex: /\bsk-[A-Za-z0-9]{20,}\b/g,
    valueIndex: 0,
    strongPrefix: true,
  },
  {
    name: "assigned_secret",
    // Value must stay on the same line (only horizontal whitespace after the separator).
    regex:
      /\b(OPENAI_API_KEY|NANGO_SECRET_KEY|LIBRECHAT_API_KEY|OPENCLAW_API_KEY)[ \t]*[=:][ \t]*["']?([^\s"'#]+)/g,
    valueIndex: 2,
  },
  {
    name: "bearer_token",
    regex: /\bBearer[ \t]+([A-Za-z0-9._\-/+=]{16,})/g,
    valueIndex: 1,
  },
  {
    name: "oauth_token",
    regex: /\b(access_token|refresh_token)["']?[ \t]*[=:][ \t]*["']([A-Za-z0-9._\-/+=]{16,})["']/g,
    valueIndex: 2,
  },
];

function isPlaceholder(value) {
  if (!value) return true;
  const trimmed = value.trim().replace(/^["']|["']$/g, "");
  if (trimmed.length === 0) return true;
  if (PLACEHOLDER_PATTERN.test(trimmed)) return true;
  // Bare env-var references like ${OPENAI_API_KEY} are not real values.
  if (/^\$\{?[A-Z_]+\}?$/.test(trimmed)) return true;
  return false;
}

/**
 * Distinguishes a real-looking secret value from a code reference or env-var name.
 * Skips: placeholders, `process.env.*`, `${...}`, dotted references, pure identifiers
 * (camelCase / UPPER_SNAKE env names with no digits). Flags only values that mix letters and
 * digits with length >= 16 (typical of API keys/tokens). The strong `sk-` prefix bypasses this.
 */
function looksLikeRealSecret(rawValue, strongPrefix) {
  const value = String(rawValue ?? "")
    .trim()
    .replace(/^["']|["']$/g, "");
  if (isPlaceholder(value)) return false;
  if (strongPrefix) return true;
  if (value.includes("process.env") || value.includes(".env") || value.includes("${")) {
    return false;
  }
  if (value.includes("}") || value.includes("(") || value.includes(")")) return false;
  if (value.includes(".")) return false; // dotted code reference
  if (/^[A-Z][A-Z0-9_]*$/.test(value)) return false; // ENV_VAR_NAME reference
  if (/^[A-Za-z_$][A-Za-z_$]*$/.test(value)) return false; // identifier without digits
  const hasLetter = /[A-Za-z]/.test(value);
  const hasDigit = /[0-9]/.test(value);
  return value.length >= 16 && hasLetter && hasDigit;
}

function listTrackedFiles() {
  const out = execSync("git ls-files", { encoding: "utf8" });
  return out.split("\n").map((line) => line.trim()).filter(Boolean);
}

function shouldSkip(file) {
  if (SKIP_FILE_PATTERN.test(file)) return true;
  if (file.endsWith(".env.example")) return true;
  return SKIP_PATH_SUBSTRINGS.some((sub) => file.includes(sub));
}

const findings = [];

for (const file of listTrackedFiles()) {
  if (shouldSkip(file)) continue;
  let size = 0;
  try {
    size = statSync(file).size;
  } catch {
    continue;
  }
  if (size > 2_000_000) continue;

  let content = "";
  try {
    content = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  if (content.includes("\u0000")) continue; // binary

  for (const check of CHECKS) {
    check.regex.lastIndex = 0;
    let match;
    while ((match = check.regex.exec(content)) !== null) {
      const value = match[check.valueIndex] ?? match[0];
      if (!looksLikeRealSecret(value, check.strongPrefix === true)) continue;
      const upto = content.slice(0, match.index);
      const line = upto.split("\n").length;
      findings.push({ file, line, check: check.name });
    }
  }
}

if (findings.length > 0) {
  console.error("Secret scan FAILED — possible real secrets committed:");
  for (const finding of findings) {
    console.error(`  - ${finding.file}:${finding.line} [${finding.check}]`);
  }
  console.error("\nUse placeholders and .env.example. Never commit real secrets.");
  process.exit(1);
}

console.log("Secret scan OK — no real secrets detected in tracked files.");
