import fs from "node:fs";
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

function resolveExistingRealPath(targetPath: string): string {
  const resolved = normalizeResolved(targetPath);

  if (fs.existsSync(resolved)) {
    return fs.realpathSync(resolved);
  }

  const parent = path.dirname(resolved);
  const base = path.basename(resolved);

  if (fs.existsSync(parent)) {
    return path.join(fs.realpathSync(parent), base);
  }

  let cursor = parent;
  while (!fs.existsSync(cursor)) {
    const parentCursor = path.dirname(cursor);
    if (parentCursor === cursor) break;
    cursor = parentCursor;
  }

  if (fs.existsSync(cursor)) {
    const realBase = fs.realpathSync(cursor);
    const relative = path.relative(cursor, resolved);
    return path.join(realBase, relative);
  }

  return resolved;
}

function isPathInsideRepo(candidatePath: string, realRepo: string): boolean {
  return candidatePath === realRepo || candidatePath.startsWith(`${realRepo}${path.sep}`);
}

export function assertSafeOutputPath(
  targetPath: string,
  repoRoot: string,
  options: { allowRepoOutput?: boolean } = {},
): string {
  const resolved = normalizeResolved(targetPath);
  const realRepo = fs.realpathSync(repoRoot);
  const realTarget = resolveExistingRealPath(resolved);

  if (!options.allowRepoOutput && isPathInsideRepo(realTarget, realRepo)) {
    throw new CliPathError(
      `UNSAFE_OUTPUT_PATH: ${resolved}. Use /tmp/career-pilot or pass --allow-repo-output explicitly.`,
    );
  }

  for (const segment of BLOCKED_REPO_SEGMENTS) {
    const blocked = path.join(realRepo, segment);
    if (!options.allowRepoOutput && isPathInsideRepo(realTarget, blocked)) {
      throw new CliPathError(`UNSAFE_OUTPUT_PATH under ${segment}/: ${resolved}`);
    }
  }

  return resolved;
}

export function defaultSessionOutputDir(sessionId: string): string {
  return path.join("/tmp/career-pilot", sessionId);
}
