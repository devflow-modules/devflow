import readline from "node:readline";
import { stdin as input, stdout as output } from "node:process";
import { runCareerPilotCurator } from "../../curator-agent.js";
import { formatAssistTerminal } from "../formatters/terminal.js";
import type { ParsedCliArgs } from "../parse-args.js";
import { flagBoolean, flagString, requireFlag } from "../parse-args.js";
import { CLI_EXIT } from "../constants.js";
import type { CliCommandResult } from "./types.js";

async function readModeratorQuestion(): Promise<string> {
  console.log("Pergunta do moderador:");
  const rl = readline.createInterface({ input, output });
  const question = await new Promise<string>((resolve) => {
    rl.question("> ", resolve);
  });
  rl.close();
  return question.trim();
}

export async function runAssistCommand(args: ParsedCliArgs): Promise<CliCommandResult> {
  const sessionId = requireFlag(args, "session");
  const participantId = requireFlag(args, "participant");
  let question = flagString(args, "question");

  if (!question) {
    if (!process.stdin.isTTY) {
      return {
        exitCode: CLI_EXIT.VALIDATION_ERROR,
        stdout: "",
        stderr: "Missing --question in non-interactive mode.\n",
      };
    }
    question = await readModeratorQuestion();
  }

  if (!question.trim()) {
    return { exitCode: CLI_EXIT.VALIDATION_ERROR, stderr: "Empty moderator question.\n", stdout: "" };
  }

  const response = runCareerPilotCurator({
    mode: "moderator_assist",
    sessionId,
    participantId,
    moderatorQuestion: question,
    moderatorAssistContext: {
      isTechnicalBlocker: flagBoolean(args, "technical-blocker"),
      isPiiRisk: flagBoolean(args, "pii-risk"),
      isProductionAttempt: flagBoolean(args, "production-attempt"),
      sessionStalledMinutes: flagString(args, "stalled-minutes")
        ? Number(flagString(args, "stalled-minutes"))
        : undefined,
    },
  });

  if (!response.moderatorAssist) {
    return { exitCode: CLI_EXIT.INTERNAL_ERROR, stdout: "Assist output missing.\n" };
  }

  return {
    exitCode: CLI_EXIT.SUCCESS,
    stdout: `${formatAssistTerminal(response.moderatorAssist)}\n`,
    stats: { command: "assist", sessionId, participantId },
  };
}
