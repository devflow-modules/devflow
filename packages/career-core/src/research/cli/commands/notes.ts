import path from "node:path";
import { structurePilotNotes } from "../../evidence-normalizer.js";
import { formatJson } from "../formatters/json.js";
import { readPilotInputFile, sanitizeNotesLines, parseNotesFromText } from "../io/input-reader.js";
import { CliPathError, defaultSessionOutputDir } from "../io/safe-path.js";
import { writePilotOutputFileSync } from "../io/output-writer.js";
import type { ParsedCliArgs } from "../parse-args.js";
import { flagBoolean, flagString, requireFlag } from "../parse-args.js";
import { CLI_EXIT, HUMAN_REVIEW_BANNER } from "../constants.js";
import type { CliCommandResult } from "./types.js";

export type NotesCommandOptions = {
  repoRoot: string;
};

export function runNotesCommand(args: ParsedCliArgs, options: NotesCommandOptions): CliCommandResult {
  const sessionId = requireFlag(args, "session");
  const participantId = requireFlag(args, "participant");
  const inputPath = requireFlag(args, "input");
  const outputPath =
    flagString(args, "output") ?? path.join(defaultSessionOutputDir(sessionId), `${sessionId.toLowerCase()}-structured.json`);
  const yes = flagBoolean(args, "yes");
  const allowRepoOutput = flagBoolean(args, "allow-repo-output");

  const { content, lineCount } = readPilotInputFile(inputPath);
  const rawLines = parseNotesFromText(content);
  const { sanitizedLines, redactionCount, warnings } = sanitizeNotesLines(rawLines);

  const observations = structurePilotNotes(sanitizedLines);

  const payload = {
    sessionId,
    participantId,
    observations,
    warnings,
    requiresHumanReview: true as const,
  };

  let writtenPath: string | undefined;
  try {
    writtenPath = writePilotOutputFileSync(outputPath, formatJson(payload), {
      repoRoot: options.repoRoot,
      allowRepoOutput,
      yes,
      skipConfirm: yes,
      confirmMessage: "A saída foi sanitizada, mas ainda exige revisão humana.\nContinuar e escrever o ficheiro?",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to write output";
    if (error instanceof CliPathError) {
      return { exitCode: error.exitCode, stderr: `${message}\n`, stdout: "" };
    }
    if (message.includes("UNSAFE_OUTPUT_PATH") || message.includes("Unsafe output path")) {
      return { exitCode: CLI_EXIT.UNSAFE_OUTPUT_PATH, stderr: `${message}\n`, stdout: "" };
    }
    if (message.includes("cancelled")) {
      return { exitCode: CLI_EXIT.VALIDATION_ERROR, stderr: `${message}\n`, stdout: "" };
    }
    return { exitCode: CLI_EXIT.INTERNAL_ERROR, stderr: `${message}\n`, stdout: "" };
  }

  const stdout = [
    "Career Pilot Curator",
    "Mode: structure_notes",
    `Session: ${sessionId}`,
    `Participant: ${participantId}`,
    "",
    `Input lines: ${lineCount}`,
    `Observations created: ${observations.length}`,
    `Potentially sensitive fragments redacted: ${redactionCount}`,
    "",
    "Output:",
    `  ${writtenPath}`,
    "",
    HUMAN_REVIEW_BANNER,
    "",
  ].join("\n");

  return {
    exitCode: CLI_EXIT.SUCCESS,
    stdout: `${stdout}\n`,
    stats: {
      command: "notes",
      sessionId,
      participantId,
      inputLineCount: lineCount,
      observationCount: observations.length,
      redactionCount,
      outputPath: writtenPath,
    },
  };
}
