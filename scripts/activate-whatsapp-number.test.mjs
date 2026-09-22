import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const scriptPath = join(dirname(fileURLToPath(import.meta.url)), "activate-whatsapp-number.sh");
const source = readFileSync(scriptPath, "utf8");

test("activation script does not default PIN_2FA to 123456", () => {
  assert.doesNotMatch(source, /PIN_2FA=\$\{PIN_2FA:-123456\}/);
  assert.match(source, /PIN_2FA="\$\{PIN_2FA:-\}"/);
  assert.match(source, /defina PIN_2FA/);
  assert.match(source, /PIN_2FA deve ter exactamente 6 dígitos/);
});
