import path from "node:path";
import type {
  PilotFinding,
  PilotObservation,
  PilotTaskCompletion,
} from "../../curator-contracts.js";
import { runCareerPilotCurator } from "../../curator-agent.js";
import { countFindingsBySeverity } from "../../finding-classifier.js";
import { formatSynthesisMarkdown } from "../formatters/markdown.js";
import { readPilotJsonInput } from "../io/input-reader.js";
import { defaultSessionOutputDir, CliPathError } from "../io/safe-path.js";
import { writePilotOutputFile } from "../io/output-writer.js";
import type { ParsedCliArgs } from "../parse-args.js";
import { flagBoolean, flagString, requireFlag } from "../parse-args.js";
import { CLI_EXIT, HUMAN_APPROVAL_BANNER, HUMAN_REVIEW_BANNER } from "../constants.js";
import type { CliCommandResult } from "./types.js";

type SessionInput = {
  observations?: Array<Partial<PilotObservation> & Pick<PilotObservation, "observation">>;
  findings?: PilotFinding[];
  taskCompletions?: PilotTaskCompletion[];
  durationMinutes?: number;
  moderatorInterventions?: number;
  totalParticipantsInCohort?: number;
  sessionsWithSamePattern?: number;
  notes?: string[];
};

function normalizeObservations(
  observations: SessionInput["observations"],
): PilotObservation[] {
  return (observations ?? []).map((item) => ({
    type: item.type ?? "unknown",
    observation: item.observation,
    interpretation: item.interpretation,
    evidence: item.evidence ?? [item.observation],
    confidence: item.confidence ?? "medium",
    affectedFlow: item.affectedFlow,
    sourceNoteIndex: item.sourceNoteIndex,
  }));
}

export type SynthesizeCommandOptions = {
  repoRoot: string;
};

export async function runSynthesizeCommand(
  args: ParsedCliArgs,
  options: SynthesizeCommandOptions,
): Promise<CliCommandResult> {
  const sessionId = requireFlag(args, "session");
  const participantId = requireFlag(args, "participant");
  const inputPath = requireFlag(args, "input");
  const outputPath =
    flagString(args, "output") ??
    path.join(defaultSessionOutputDir(sessionId), `${sessionId.toLowerCase()}-synthesis.md`);
  const yes = flagBoolean(args, "yes");
  const allowRepoOutput = flagBoolean(args, "allow-repo-output");
  const productVersion = flagString(args, "product-version");

  const sessionInput = readPilotJsonInput<SessionInput>(inputPath);

  let observations = normalizeObservations(sessionInput.observations);
  if (!observations.length && sessionInput.notes?.length) {
    observations = runCareerPilotCurator({
      mode: "structure_notes",
      sessionId,
      participantId,
      notes: sessionInput.notes,
    }).observations;
  }

  const response = runCareerPilotCurator({
    mode: "synthesize",
    sessionId,
    participantId,
    productVersion,
    observations,
    findings: sessionInput.findings,
    taskCompletions: sessionInput.taskCompletions,
    durationMinutes: sessionInput.durationMinutes,
    moderatorInterventions: sessionInput.moderatorInterventions,
    totalParticipantsInCohort: sessionInput.totalParticipantsInCohort,
    sessionsWithSamePattern: sessionInput.sessionsWithSamePattern,
  });

  const markdown = `${formatSynthesisMarkdown(response)}\n\n---\n\n${HUMAN_APPROVAL_BANNER}\n`;

  let writtenPath: string | undefined;
  try {
    await writePilotOutputFile(outputPath, markdown, {
      repoRoot: options.repoRoot,
      allowRepoOutput,
      yes,
      confirmMessage:
        "A saída foi sanitizada, mas ainda exige revisão humana.\nContinuar e escrever o ficheiro?",
    });
    writtenPath = outputPath;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to write output";
    if (error instanceof CliPathError) {
      return { exitCode: error.exitCode, stderr: `${message}\n`, stdout: "" };
    }
    if (message.includes("UNSAFE_OUTPUT_PATH") || message.includes("Unsafe output path")) {
      return { exitCode: CLI_EXIT.UNSAFE_OUTPUT_PATH, stderr: `${message}\n`, stdout: "" };
    }
    if (message.includes("cancelled") || message.includes("confirmation")) {
      return { exitCode: CLI_EXIT.VALIDATION_ERROR, stderr: `${message}\n`, stdout: "" };
    }
    return { exitCode: CLI_EXIT.INTERNAL_ERROR, stderr: `${message}\n`, stdout: "" };
  }

  const severityCounts = countFindingsBySeverity(response.findings);
  const exitCode =
    response.recommendation === "INSUFFICIENT EVIDENCE"
      ? CLI_EXIT.INSUFFICIENT_EVIDENCE
      : CLI_EXIT.SUCCESS;

  const stdout = [
    "Career Pilot Curator",
    "Mode: synthesize",
    `Session: ${sessionId}`,
    `Participant: ${participantId}`,
    "",
    `Decision recommendation: ${response.recommendation ?? "INSUFFICIENT EVIDENCE"}`,
    `Findings: ${response.findings.length}`,
    "",
    "Output:",
    `  ${writtenPath}`,
    "",
    HUMAN_REVIEW_BANNER,
    HUMAN_APPROVAL_BANNER,
    "",
  ].join("\n");

  return {
    exitCode,
    stdout: `${stdout}\n`,
    stats: {
      command: "synthesize",
      sessionId,
      participantId,
      observationCount: response.observations.length,
      findingCount: response.findings.length,
      severityCounts,
      decisionRecommendation: response.recommendation,
      outputPath: writtenPath,
    },
  };
}
