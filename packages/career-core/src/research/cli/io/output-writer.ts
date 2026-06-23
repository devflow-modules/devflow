import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { stdin as input, stdout as output } from "node:process";
import { CLI_EXIT, HUMAN_REVIEW_BANNER } from "../constants.js";
import { assertSafeOutputPath } from "./safe-path.js";

export type WriteFileOptions = {
  repoRoot: string;
  allowRepoOutput?: boolean;
  yes?: boolean;
  confirmMessage?: string;
};

export async function confirmWrite(message: string, yes: boolean): Promise<boolean> {
  if (yes) return true;
  if (!process.stdin.isTTY) return false;

  const rl = readline.createInterface({ input, output });
  const answer = await new Promise<string>((resolve) => {
    rl.question(`${message} [y/N] `, resolve);
  });
  rl.close();
  return answer.trim().toLowerCase() === "y";
}

export async function writePilotOutputFile(
  targetPath: string,
  content: string,
  options: WriteFileOptions,
): Promise<void> {
  const resolved = assertSafeOutputPath(targetPath, options.repoRoot, {
    allowRepoOutput: options.allowRepoOutput,
  });

  if (fs.existsSync(resolved) && !options.yes) {
    const confirmed = await confirmWrite(`File already exists: ${resolved}. Overwrite?`, false);
    if (!confirmed) {
      throw new Error("Write cancelled by user.");
    }
  }

  const confirmed =
    options.yes ||
    (await confirmWrite(
      options.confirmMessage ??
        "A saída foi sanitizada, mas ainda exige revisão humana.\nContinuar e escrever o ficheiro?",
      options.yes ?? false,
    ));

  if (!confirmed) {
    throw new Error("Write cancelled — human confirmation required.");
  }

  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, content, "utf8");
}

export function writePilotOutputFileSync(
  targetPath: string,
  content: string,
  options: WriteFileOptions & { skipConfirm?: boolean },
): string {
  const resolved = assertSafeOutputPath(targetPath, options.repoRoot, {
    allowRepoOutput: options.allowRepoOutput,
  });

  if (fs.existsSync(resolved) && !options.yes && !options.skipConfirm) {
    throw new Error("File exists — confirmation required.");
  }

  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, content, "utf8");
  return resolved;
}

export type CliLogSummary = {
  command: string;
  sessionId: string;
  participantId: string;
  timestamp: string;
  inputLineCount?: number;
  observationCount?: number;
  findingCount?: number;
  severityCounts?: Record<string, number>;
  decisionRecommendation?: string;
  outputPath?: string;
};

export function logCliSummary(summary: CliLogSummary): void {
  const lines = [
    `command=${summary.command}`,
    `sessionId=${summary.sessionId}`,
    `participantId=${summary.participantId}`,
    `timestamp=${summary.timestamp}`,
  ];
  if (summary.inputLineCount !== undefined) lines.push(`inputLineCount=${summary.inputLineCount}`);
  if (summary.observationCount !== undefined) lines.push(`observationCount=${summary.observationCount}`);
  if (summary.findingCount !== undefined) lines.push(`findingCount=${summary.findingCount}`);
  if (summary.severityCounts) {
    for (const [key, value] of Object.entries(summary.severityCounts)) {
      lines.push(`severity.${key}=${value}`);
    }
  }
  if (summary.decisionRecommendation) lines.push(`decision=${summary.decisionRecommendation}`);
  if (summary.outputPath) lines.push(`outputPath=${summary.outputPath}`);
  console.error(lines.join("\n"));
  console.error(HUMAN_REVIEW_BANNER);
}

export function printCliHeader(params: {
  tool: string;
  mode: string;
  sessionId: string;
  participantId: string;
}): void {
  console.log(`${params.tool}`);
  console.log(`Mode: ${params.mode}`);
  console.log(`Session: ${params.sessionId}`);
  console.log(`Participant: ${params.participantId}`);
  console.log("");
}

export function cliError(message: string, exitCode: number = CLI_EXIT.VALIDATION_ERROR): never {
  console.error(message);
  process.exit(exitCode);
}
