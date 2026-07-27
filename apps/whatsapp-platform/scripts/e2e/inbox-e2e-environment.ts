import fs from "node:fs";
import path from "node:path";
import { parse } from "dotenv";
import { APP_ROOT, resolveDatasourceUrl, targetFingerprint } from "./inbox-e2e-fixture";

export const ROOT_ENV_PATH = path.resolve(APP_ROOT, "..", "..", ".env.local");
export const APP_ENV_PATH = path.resolve(APP_ROOT, ".env.local");

export type InboxE2EEnvironment = Readonly<{
  env: Readonly<NodeJS.ProcessEnv>;
  datasourceUrl: string;
  targetFingerprint: string;
}>;

export type ResolveInboxE2EEnvironmentOptions = {
  processEnv?: Readonly<NodeJS.ProcessEnv>;
  rootEnvPath?: string;
  appEnvPath?: string;
};

export type TargetFingerprintReport = Readonly<{
  targetFingerprintVerified: true;
}>;

export function verifyTargetFingerprint(
  expected: string,
  actual: string
): TargetFingerprintReport {
  if (
    !/^[a-f0-9]{64}$/i.test(expected) ||
    !/^[a-f0-9]{64}$/i.test(actual) ||
    expected !== actual
  ) {
    throw new Error("Target fingerprint divergente");
  }
  return Object.freeze({ targetFingerprintVerified: true });
}

function parseEnvironmentFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  return parse(fs.readFileSync(filePath));
}

export function resolveInboxE2EEnvironment(
  options: ResolveInboxE2EEnvironmentOptions = {}
): InboxE2EEnvironment {
  const rootEnvPath = path.resolve(options.rootEnvPath ?? ROOT_ENV_PATH);
  const appEnvPath = path.resolve(options.appEnvPath ?? APP_ENV_PATH);
  const env = Object.freeze({
    ...(options.processEnv ?? process.env),
    ...parseEnvironmentFile(rootEnvPath),
    ...parseEnvironmentFile(appEnvPath),
  });
  const datasourceUrl = resolveDatasourceUrl(env);

  return Object.freeze({
    env,
    datasourceUrl,
    targetFingerprint: targetFingerprint(datasourceUrl),
  });
}
