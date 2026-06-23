import path from "node:path";
import type { PilotObservation } from "../../curator-contracts.js";
import { runCareerPilotCurator } from "../../curator-agent.js";
import { formatJson } from "../formatters/json.js";
import { readPilotJsonInput } from "../io/input-reader.js";
import { defaultSessionOutputDir } from "../io/safe-path.js";
import { writePilotOutputFileSync } from "../io/output-writer.js";
import type { ParsedCliArgs } from "../parse-args.js";
import { flagBoolean, flagString, requireFlag } from "../parse-args.js";
import { CLI_EXIT, HUMAN_REVIEW_BANNER } from "../constants.js";
import type { CliCommandResult } from "./types.js";

type StructuredInput = {
  sessionId?: string;
  participantId?: string;
  observations?: PilotObservation[];
  notes?: string[];
};

export type ClassifyCommandOptions = {
  repoRoot: string;
};

export function runClassifyCommand(args: ParsedCliArgs, options: ClassifyCommandOptions): CliCommandResult {
  const sessionId = requireFlag(args, "session");
  const participantId = requireFlag(args, "participant");
  const inputPath = requireFlag(args, "input");
  const outputPath =
    flagString(args, "output") ??
    path.join(defaultSessionOutputDir(sessionId), `${sessionId.toLowerCase()}-findings.json`);
  const yes = flagBoolean(args, "yes");
  const allowRepoOutput = flagBoolean(args, "allow-repo-output");

  const structured = readPilotJsonInput<StructuredInput>(inputPath);
  const observations = structured.observations ?? [];

  const structuredResponse = observations.length
    ? { observations }
    : runCareerPilotCurator({
        mode: "structure_notes",
        sessionId,
        participantId,
        notes: structured.notes ?? [],
      });

  const classifyResponse = runCareerPilotCurator({
    mode: "classify",
    sessionId,
    participantId,
    observations: structuredResponse.observations,
  });

  const payload = {
    sessionId,
    participantId,
    findings: classifyResponse.findings,
    observations: classifyResponse.observations,
    requiresHumanReview: true as const,
  };

  let writtenPath: string | undefined;
  try {
    writtenPath = writePilotOutputFileSync(outputPath, formatJson(payload), {
      repoRoot: options.repoRoot,
      allowRepoOutput,
      yes,
      skipConfirm: yes,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to write output";
    if (message.includes("Unsafe output path")) {
      return { exitCode: CLI_EXIT.UNSAFE_OUTPUT_PATH, stderr: `${message}\n`, stdout: "" };
    }
    return { exitCode: CLI_EXIT.INTERNAL_ERROR, stderr: `${message}\n`, stdout: "" };
  }

  const stdout = [
    "Career Pilot Curator",
    "Mode: classify",
    `Session: ${sessionId}`,
    `Participant: ${participantId}`,
    "",
    `Observations: ${classifyResponse.observations.length}`,
    `Findings: ${classifyResponse.findings.length}`,
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
      command: "classify",
      sessionId,
      participantId,
      observationCount: classifyResponse.observations.length,
      findingCount: classifyResponse.findings.length,
      outputPath: writtenPath,
    },
  };
}
