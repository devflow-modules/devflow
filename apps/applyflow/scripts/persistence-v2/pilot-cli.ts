/**
 * ApplyFlow Persistence V2 — local pilot operator CLI.
 *
 * Commands: status | grant | revoke
 *
 * Never exposes a public admin HTTP surface. Mutations flip only pilotEligible.
 * Production requires --production + --confirm-production <hostFingerprint>.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

import { PrismaClient } from "@prisma/client";

import {
  assertApplyFlowOperatorMutationTargetAllowed,
  classifyApplyFlowDbTarget,
  sanitizeApplyFlowDbTargetForOperator,
  type ApplyFlowDbTargetEnv,
} from "@/lib/persistence-v2/db-target-guard";
import {
  grantPilotEligible,
  getPilotOperatorStatus,
  parsePilotAccountIdentifier,
  PILOT_OPERATOR_FORBIDDEN_COMMANDS,
  revokePilotEligible,
  type PilotOperatorDb,
} from "@/lib/persistence-v2/operator/pilot-operator";

type CliArgs = {
  command: string;
  account?: string;
  confirm?: string;
  production: boolean;
  confirmProduction?: string;
  envFile?: string;
  help: boolean;
};

function printUsage(): void {
  process.stdout.write(`ApplyFlow Persistence V2 — pilot operator (local CLI)

Usage:
  pnpm pilot:status -- --account <accountId|authProviderSub>
  pnpm pilot:grant  -- --account <id> --confirm <token>
  pnpm pilot:revoke -- --account <id> --confirm <token>

Production (future; double-gate — do not run unless authorized):
  ... --production --confirm-production <hostFingerprint> [--env-file <path>]

Notes:
  - status is read-only and prints confirmToken for the next mutation
  - grant/revoke mutate ONLY pilotEligible (never canonicalPersistence)
  - forbidden: ${PILOT_OPERATOR_FORBIDDEN_COMMANDS.join(", ")}
`);
}

function parseArgs(argv: string[]): CliArgs {
  const [command = "", ...rest] = argv;
  const out: CliArgs = {
    command,
    production: false,
    help: false,
  };
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i]!;
    if (arg === "--help" || arg === "-h") {
      out.help = true;
      continue;
    }
    if (arg === "--production") {
      out.production = true;
      continue;
    }
    if (arg === "--account") {
      out.account = rest[++i];
      continue;
    }
    if (arg === "--confirm") {
      out.confirm = rest[++i];
      continue;
    }
    if (arg === "--confirm-production") {
      out.confirmProduction = rest[++i];
      continue;
    }
    if (arg === "--env-file") {
      out.envFile = rest[++i];
      continue;
    }
    if (arg === "--yes") {
      throw new Error(
        "Weak --yes is not accepted. Use --confirm <token> from pilot:status (target-bound).",
      );
    }
    if (PILOT_OPERATOR_FORBIDDEN_COMMANDS.includes(arg as (typeof PILOT_OPERATOR_FORBIDDEN_COMMANDS)[number])) {
      throw new Error(`Forbidden operator command/option: ${arg}`);
    }
    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }
  }
  return out;
}

function loadEnvFile(path: string, override: boolean): void {
  if (!existsSync(path)) {
    throw new Error(`Env file not found: ${path}`);
  }
  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (override || process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function loadOperatorEnv(args: CliArgs): void {
  if (args.envFile) {
    loadEnvFile(resolve(args.envFile), true);
    return;
  }
  // Default: prefer local .env.local so shell Production URLs cannot leak in.
  const localCandidates = [
    resolve(process.cwd(), ".env.local"),
    resolve(process.cwd(), "apps/applyflow/.env.local"),
  ];
  for (const path of localCandidates) {
    if (existsSync(path)) {
      loadEnvFile(path, true);
      return;
    }
  }
}

function asOperatorDb(prisma: PrismaClient): PilotOperatorDb {
  return prisma as unknown as PilotOperatorDb;
}

function emit(payload: Record<string, unknown>): void {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

function targetEnv(): ApplyFlowDbTargetEnv {
  return {
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    APPLYFLOW_DB_TARGET: process.env.APPLYFLOW_DB_TARGET,
    APPLYFLOW_PERSISTENCE_V2: process.env.APPLYFLOW_PERSISTENCE_V2,
  };
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.command || args.command === "help") {
    printUsage();
    return args.help || args.command === "help" ? 0 : 2;
  }

  if (
    PILOT_OPERATOR_FORBIDDEN_COMMANDS.includes(
      args.command as (typeof PILOT_OPERATOR_FORBIDDEN_COMMANDS)[number],
    )
  ) {
    process.stderr.write(`Forbidden command: ${args.command}\n`);
    return 2;
  }

  loadOperatorEnv(args);

  if (!args.account) {
    process.stderr.write("Missing --account <accountId|authProviderSub>\n");
    printUsage();
    return 2;
  }

  const lookup = parsePilotAccountIdentifier(args.account);
  const classification = classifyApplyFlowDbTarget(targetEnv());
  const target = sanitizeApplyFlowDbTargetForOperator(classification);

  const prisma = new PrismaClient();
  try {
    if (args.command === "status") {
      const status = await getPilotOperatorStatus(asOperatorDb(prisma), lookup);
      emit({
        ...status,
        environment: target.kind,
        target,
      });
      return status.accountFound ? 0 : 1;
    }

    if (args.command === "grant" || args.command === "revoke") {
      assertApplyFlowOperatorMutationTargetAllowed(targetEnv(), {
        allowProductionMutation: args.production,
        productionHostConfirm: args.confirmProduction,
      });

      const result =
        args.command === "grant"
          ? await grantPilotEligible(asOperatorDb(prisma), lookup, args.confirm)
          : await revokePilotEligible(asOperatorDb(prisma), lookup, args.confirm);

      emit({
        operation: result.operation,
        environment: target.kind,
        target,
        accountFingerprint: result.accountFingerprint,
        before: result.before,
        after: result.after,
        changed: result.changed,
        result: result.result,
        effectiveModeAfter: result.effectiveModeAfter,
        globalEnabled: result.globalEnabled,
        timestamp: result.timestamp,
      });

      if (
        result.result === "changed" ||
        result.result === "already_granted" ||
        result.result === "already_revoked"
      ) {
        return 0;
      }
      return 1;
    }

    process.stderr.write(`Unknown command: ${args.command}\n`);
    printUsage();
    return 2;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    // Never print env blobs / URLs that may contain credentials.
    const redacted = message
      .replace(/postgresql:\/\/[^\s]+/gi, "postgresql://[redacted]")
      .replace(/postgres:\/\/[^\s]+/gi, "postgres://[redacted]");
    process.stderr.write(
      `${JSON.stringify({
        operation: "error",
        result: "failed",
        error: redacted,
        timestamp: new Date().toISOString(),
      })}\n`,
    );
    process.exit(1);
  });
