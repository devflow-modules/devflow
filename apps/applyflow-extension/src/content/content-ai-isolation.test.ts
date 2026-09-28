/**
 * Architectural guard: content-script entry must not import private key readers
 * or the OpenAI client (AF-AI-001).
 *
 * Static source scan — does not prove bundle tree-shaking alone, but fails CI
 * when content paths reintroduce privileged imports.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "..");

function readSrc(rel: string): string {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("AF-AI-001 content-script import graph", () => {
  it("inject-applyflow-panel uses public settings + GENERATE_AI client only", () => {
    const src = readSrc("content/inject-applyflow-panel.ts");
    expect(src).toMatch(/requestPublicSettings|applyflow-storage-public/);
    expect(src).toMatch(/requestGenerateAi/);
    expect(src).not.toMatch(/getApplyFlowPrivateSettings/);
    expect(src).not.toMatch(/from \"\.\.\/storage\/applyflow-storage\.js\"/);
    expect(src).not.toMatch(/generate-ai-text/);
    expect(src).not.toMatch(/openai-client/);
    expect(src).not.toMatch(/STORAGE_AI_CREDENTIAL_KEY/);
    expect(src).not.toMatch(/APPLYFLOW_AI_CREDENTIAL/);
    expect(src).not.toMatch(/\.apiKey/);
  });

  it("content index does not pull openai-client or private settings", () => {
    const src = readSrc("content/index.ts");
    expect(src).not.toMatch(/openai-client/);
    expect(src).not.toMatch(/getApplyFlowPrivateSettings/);
    expect(src).not.toMatch(/generate-ai-text/);
    expect(src).not.toMatch(/APPLYFLOW_AI_CREDENTIAL/);
  });

  it("public settings module never references the credential storage key", () => {
    const src = readSrc("storage/applyflow-storage-public.ts");
    expect(src).not.toMatch(/STORAGE_AI_CREDENTIAL_KEY/);
    expect(src).not.toMatch(/APPLYFLOW_AI_CREDENTIAL/);
    expect(src).toMatch(/STORAGE_SETTINGS_KEY/);
  });
});
