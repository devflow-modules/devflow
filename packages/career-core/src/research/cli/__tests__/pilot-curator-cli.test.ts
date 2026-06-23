import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runClassifyCommand } from "../commands/classify.js";
import { runAssistCommand } from "../commands/assist.js";
import { runNotesCommand } from "../commands/notes.js";
import { runPrepareCommand } from "../commands/prepare.js";
import { runSynthesizeCommand } from "../commands/synthesize.js";
import { CLI_EXIT } from "../constants.js";
import { assertSafeOutputPath } from "../io/safe-path.js";
import { parseCliArgs } from "../parse-args.js";
import { PILOT_CONTENT_MAX_BYTES, sanitizePilotContent } from "../../privacy-sanitizer.js";
import { resetFindingCounterForTests } from "../../finding-classifier.js";

const REPO_ROOT = path.resolve(__dirname, "../../../../../../");
const tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pilot-curator-cli-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  resetFindingCounterForTests();
});

describe("Career Pilot Curator CLI", () => {
  describe("prepare", () => {
    it("returns protocol and requires human review", () => {
      const result = runPrepareCommand(
        parseCliArgs([
          "prepare",
          "--session",
          "P01",
          "--participant",
          "P01",
          "--product-version",
          "main@d3de0e7",
        ]),
      );

      expect(result.exitCode).toBe(CLI_EXIT.SUCCESS);
      expect(result.stdout).toContain("Preflight checklist");
      expect(result.stdout).toContain("REQUIRES HUMAN REVIEW");
      expect(result.stdout).not.toContain("openai");
    });
  });

  describe("assist", () => {
    it("returns neutral guidance for click questions", async () => {
      const result = await runAssistCommand(
        parseCliArgs([
          "assist",
          "--session",
          "P01",
          "--participant",
          "P01",
          "--question",
          "O participante perguntou onde clicar.",
        ]),
      );

      expect(result.exitCode).toBe(CLI_EXIT.SUCCESS);
      expect(result.stdout).toContain("Faça o que parecer mais natural");
      expect(result.stdout).not.toMatch(/clique no botão/i);
    });
  });

  describe("notes", () => {
    it("structures notes, sanitizes PII and writes outside repo", () => {
      const dir = makeTempDir();
      const inputPath = path.join(dir, "notes.txt");
      const outputPath = path.join(dir, "structured.json");

      fs.writeFileSync(
        inputPath,
        [
          "ficou 40 segundos procurando o botão",
          "perguntou se o currículo seria enviado",
          "contato joao@example.com",
          "telefone 11 98765-4321",
        ].join("\n"),
        "utf8",
      );

      const result = runNotesCommand(
        parseCliArgs([
          "notes",
          "--session",
          "P01",
          "--participant",
          "P01",
          "--input",
          inputPath,
          "--output",
          outputPath,
          "--yes",
        ]),
        { repoRoot: REPO_ROOT },
      );

      expect(result.exitCode).toBe(CLI_EXIT.SUCCESS);
      expect(result.stats?.observationCount).toBeGreaterThan(0);
      expect(fs.existsSync(outputPath)).toBe(true);

      const written = fs.readFileSync(outputPath, "utf8");
      expect(written).not.toContain("joao@example.com");
      expect(written).not.toContain("98765-4321");
      expect(written).toContain("[EMAIL REDACTED]");
      expect(written).toContain("requiresHumanReview");
    });

    it("blocks long résumé-like input lines", () => {
      const dir = makeTempDir();
      const inputPath = path.join(dir, "resume.txt");
      const longResume = `Experiência ${"desenvolvedor react ".repeat(50)} skills node`;
      fs.writeFileSync(inputPath, longResume, "utf8");

      const result = runNotesCommand(
        parseCliArgs([
          "notes",
          "--session",
          "P01",
          "--participant",
          "P01",
          "--input",
          inputPath,
          "--output",
          path.join(dir, "out.json"),
          "--yes",
        ]),
        { repoRoot: REPO_ROOT },
      );

      expect(result.exitCode).toBe(CLI_EXIT.SUCCESS);
      const written = fs.readFileSync(path.join(dir, "out.json"), "utf8");
      expect(written).toMatch(/\[RESUME CONTENT REDACTED\]|\[trecho de currículo removido\]/);
    });
  });

  describe("classify", () => {
    it("classifies P0/P1/P2/P3 findings from structured observations", () => {
      const dir = makeTempDir();
      const structuredPath = path.join(dir, "structured.json");
      const outputPath = path.join(dir, "findings.json");

      const structured = runNotesCommand(
        parseCliArgs([
          "notes",
          "--session",
          "P01",
          "--participant",
          "P01",
          "--input",
          (() => {
            const p = path.join(dir, "mix.txt");
            fs.writeFileSync(
              p,
              [
                "currículo persistiu no localStorage após reload",
                "moderador indicou onde clicar no CTA",
                "copy confusa no aviso de privacidade",
                "preferência estética no cabeçalho",
              ].join("\n"),
              "utf8",
            );
            return p;
          })(),
          "--output",
          structuredPath,
          "--yes",
        ]),
        { repoRoot: REPO_ROOT },
      );
      expect(structured.exitCode).toBe(CLI_EXIT.SUCCESS);

      const result = runClassifyCommand(
        parseCliArgs([
          "classify",
          "--session",
          "P01",
          "--participant",
          "P01",
          "--input",
          structuredPath,
          "--output",
          outputPath,
          "--yes",
        ]),
        { repoRoot: REPO_ROOT },
      );

      expect(result.exitCode).toBe(CLI_EXIT.SUCCESS);
      const payload = JSON.parse(fs.readFileSync(outputPath, "utf8"));
      const severities = payload.findings.map((f: { severity: string }) => f.severity);
      expect(severities).toContain("P0");
      expect(severities).toContain("P1");
      expect(payload.findings[0].observation).toBeTruthy();
      expect(payload.findings[0].requiresHumanReview).toBe(true);
    });
  });

  describe("synthesize", () => {
    it("generates sanitized synthesis and GitHub draft with human approval banner", () => {
      const dir = makeTempDir();
      const sessionPath = path.join(dir, "session.json");
      const outputPath = path.join(dir, "synthesis.md");

      fs.writeFileSync(
        sessionPath,
        JSON.stringify({
          observations: [],
          findings: [],
          taskCompletions: [
            { taskId: "resume-analysis", label: "Resume analysis", completed: true },
            { taskId: "job-comparison", label: "Job comparison", completed: true },
            { taskId: "career-plan", label: "Career plan", completed: true },
          ],
          notes: ["ficou 40 segundos procurando o botão", "concluiu análise do currículo"],
          durationMinutes: 28,
          moderatorInterventions: 0,
        }),
        "utf8",
      );

      const result = runSynthesizeCommand(
        parseCliArgs([
          "synthesize",
          "--session",
          "P01",
          "--participant",
          "P01",
          "--input",
          sessionPath,
          "--output",
          outputPath,
          "--yes",
        ]),
        { repoRoot: REPO_ROOT },
      );

      expect(result.exitCode).toBe(CLI_EXIT.SUCCESS);
      const markdown = fs.readFileSync(outputPath, "utf8");
      expect(markdown).toContain("# P01 — Pilot synthesis");
      expect(markdown).toContain("GitHub comment draft");
      expect(markdown).toContain("REQUIRES HUMAN APPROVAL — NOT PUBLISHED");
      expect(markdown).not.toContain("joao@");
    });

    it("exits with code 4 on insufficient evidence", () => {
      const dir = makeTempDir();
      const sessionPath = path.join(dir, "empty.json");
      const outputPath = path.join(dir, "synthesis.md");

      fs.writeFileSync(sessionPath, JSON.stringify({ observations: [], findings: [] }), "utf8");

      const result = runSynthesizeCommand(
        parseCliArgs([
          "synthesize",
          "--session",
          "P01",
          "--participant",
          "P01",
          "--input",
          sessionPath,
          "--output",
          outputPath,
          "--yes",
        ]),
        { repoRoot: REPO_ROOT },
      );

      expect(result.exitCode).toBe(CLI_EXIT.INSUFFICIENT_EVIDENCE);
      expect(result.stats?.decisionRecommendation).toBe("INSUFFICIENT EVIDENCE");
    });
  });

  describe("filesystem safety", () => {
    it("rejects output inside repository by default", () => {
      expect(() =>
        assertSafeOutputPath(path.join(REPO_ROOT, "packages/out.json"), REPO_ROOT),
      ).toThrow(/Unsafe output path/);
    });

    it("accepts /tmp output paths", () => {
      const dir = makeTempDir();
      expect(assertSafeOutputPath(path.join(dir, "out.json"), REPO_ROOT)).toContain(dir);
    });

    it("rejects files larger than 100 KB", () => {
      const huge = "a".repeat(PILOT_CONTENT_MAX_BYTES + 1);
      const result = sanitizePilotContent(huge);
      expect(result.blockReason).toBe("INPUT_REJECTED_TOO_LARGE");
    });
  });
});
