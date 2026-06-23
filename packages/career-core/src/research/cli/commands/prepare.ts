import { runCareerPilotCurator } from "../../curator-agent.js";
import type { OutputFormat } from "../formatters/terminal.js";
import { formatPrepare } from "../formatters/terminal.js";
import type { ParsedCliArgs } from "../parse-args.js";
import { flagBoolean, flagString, requireFlag } from "../parse-args.js";
import { CLI_EXIT } from "../constants.js";
import type { CliCommandResult } from "./types.js";

export function runPrepareCommand(args: ParsedCliArgs): CliCommandResult {
  const sessionId = requireFlag(args, "session");
  const participantId = requireFlag(args, "participant");
  const productVersion = requireFlag(args, "product-version");
  const format = (flagString(args, "format") ?? "terminal") as OutputFormat;
  const participantProfile = flagString(args, "participant-profile");

  const response = runCareerPilotCurator({
    mode: "prepare",
    sessionId,
    participantId,
    productVersion,
    participantProfile,
  });

  if (!response.prepare) {
    return { exitCode: CLI_EXIT.INTERNAL_ERROR, stdout: "Prepare output missing.\n" };
  }

  return {
    exitCode: CLI_EXIT.SUCCESS,
    stdout: `${formatPrepare(response.prepare, format)}\n`,
    stats: {
      command: "prepare",
      sessionId,
      participantId,
    },
  };
}
