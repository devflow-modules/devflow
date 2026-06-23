import path from "node:path";
import { BLOCKED_REPO_SEGMENTS, CLI_EXIT } from "../constants.js";

export class CliPathError extends Error {
  readonly exitCode: number;

  constructor(message: string, exitCode: number = CLI_EXIT.UNSAFE_OUTPUT_PATH) {
    super(message);
    this.name = "CliPathError";
    this.exitCode = exitCode;
  }
}

function normalizeResolved(targetPath: string): string {
  return path.resolve(targetPath);
}

export function assertSafeOutputPath(
  targetPath: string,
  repoRoot: string,
  options: { allowRepoOutput?: boolean } = {},
): string {
  const resolved = normalizeResolved(targetPath);
  const resolvedRepo = normalizeResolved(repoRoot);

  if (!options.allowRepoOutput && (resolved === resolvedRepo || resolved.startsWith(`${resolvedRepo}${path.sep}`))) {
    throw new CliPathError(
      `Unsafe output path inside repository root: ${resolved}. Use /tmp/career-pilot or pass --allow-repo-output explicitly.`,
    );
  }

  for (const segment of BLOCKED_REPO_SEGMENTS) {
    const blocked = path.join(resolvedRepo, segment);
    if (!options.allowRepoOutput && (resolved === blocked || resolved.startsWith(`${blocked}${path.sep}`))) {
      throw new CliPathError(`Unsafe output path under ${segment}/: ${resolved}`);
    }
  }

  return resolved;
}

export function defaultSessionOutputDir(sessionId: string): string {
  return path.join("/tmp/career-pilot", sessionId);
}
