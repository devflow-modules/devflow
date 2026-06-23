#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runAssistCommand } from "./commands/assist.js";
import { runClassifyCommand } from "./commands/classify.js";
import { runNotesCommand } from "./commands/notes.js";
import { runPrepareCommand } from "./commands/prepare.js";
import { runSynthesizeCommand } from "./commands/synthesize.js";
import { CLI_EXIT } from "./constants.js";
import { logCliSummary } from "./io/output-writer.js";
import { parseCliArgs } from "./parse-args.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../../../../");

function printHelp(): void {
  console.log(`Career Pilot Curator — offline moderator support CLI

Usage:
  pnpm pilot:curator <command> [options]

Commands:
  prepare     Session protocol, preflight and opening script
  assist      Neutral moderator guidance (interactive or --question)
  notes       Structure and sanitize raw notes → JSON
  classify    Classify structured observations → findings JSON
  synthesize  Produce anonymized synthesis markdown + GitHub draft

Global options:
  --yes                 Skip interactive confirmations (CI/tests only)
  --allow-repo-output   Allow writing inside repository (discouraged)

Examples:
  pnpm pilot:curator prepare --session P01 --participant P01 --product-version main@d3de0e7
  pnpm pilot:curator assist --session P01 --participant P01 --question "O participante perguntou onde clicar."
  pnpm pilot:curator notes --session P01 --participant P01 --input /tmp/p01-notes.txt --output /tmp/career-pilot/P01/p01-structured.json --yes
`);
}

async function main(): Promise<void> {
  const args = parseCliArgs(process.argv.slice(2));
  const command = args.command;

  if (!command || command === "help" || args.flags.has("help")) {
    printHelp();
    process.exit(CLI_EXIT.SUCCESS);
  }

  try {
    let result;
    switch (command) {
      case "prepare":
        result = runPrepareCommand(args);
        break;
      case "assist":
        result = await runAssistCommand(args);
        break;
      case "notes":
        result = runNotesCommand(args, { repoRoot: REPO_ROOT });
        break;
      case "classify":
        result = runClassifyCommand(args, { repoRoot: REPO_ROOT });
        break;
      case "synthesize":
        result = runSynthesizeCommand(args, { repoRoot: REPO_ROOT });
        break;
      default:
        console.error(`Unknown command: ${command}`);
        printHelp();
        process.exit(CLI_EXIT.VALIDATION_ERROR);
        return;
    }

    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);

    if (result.stats) {
      logCliSummary({
        ...result.stats,
        timestamp: new Date().toISOString(),
        severityCounts: result.stats.severityCounts,
        decisionRecommendation: result.stats.decisionRecommendation,
      });
    }

    process.exit(result.exitCode);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal CLI error";
    const exitCode =
      error instanceof Error && "exitCode" in error && typeof error.exitCode === "number"
        ? error.exitCode
        : CLI_EXIT.INTERNAL_ERROR;
    console.error(message);
    process.exit(exitCode);
  }
}

main();
