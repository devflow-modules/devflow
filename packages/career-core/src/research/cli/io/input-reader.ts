import fs from "node:fs";
import path from "node:path";
import { CLI_EXIT } from "../constants.js";
import { PILOT_CONTENT_MAX_BYTES, sanitizePilotContent } from "../../privacy-sanitizer.js";
import { CliPathError } from "./safe-path.js";

export class CliInputError extends Error {
  readonly exitCode: number;

  constructor(message: string, exitCode: number = CLI_EXIT.VALIDATION_ERROR) {
    super(message);
    this.name = "CliInputError";
    this.exitCode = exitCode;
  }
}

const SUPPORTED_EXTENSIONS = new Set([".txt", ".json", ".md"]);

function stripMarkdownFrontmatter(content: string): string {
  if (!content.startsWith("---\n")) return content;
  const end = content.indexOf("\n---\n", 4);
  if (end === -1) return content;
  return content.slice(end + 5);
}

function stripMarkdownCodeFences(content: string): string {
  return content.replace(/```[\s\S]*?```/g, "[code block removed]");
}

export function parseNotesFromText(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}

export function readPilotInputFile(inputPath: string): {
  content: string;
  lineCount: number;
  extension: string;
} {
  const extension = path.extname(inputPath).toLowerCase();
  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    throw new CliInputError(`Unsupported input extension: ${extension}. Use .txt, .json or .md`);
  }

  if (!fs.existsSync(inputPath)) {
    throw new CliInputError(`Input file not found: ${inputPath}`);
  }

  const raw = fs.readFileSync(inputPath, "utf8");
  const byteLength = Buffer.byteLength(raw, "utf8");
  if (byteLength > PILOT_CONTENT_MAX_BYTES) {
    throw new CliInputError("INPUT_REJECTED_TOO_LARGE", CLI_EXIT.UNSAFE_INPUT);
  }

  let content = raw;
  if (extension === ".md") {
    content = stripMarkdownFrontmatter(content);
    content = stripMarkdownCodeFences(content);
  }

  if (extension === ".json") {
    try {
      JSON.parse(content);
    } catch {
      throw new CliInputError("Invalid JSON input file");
    }
    return { content, lineCount: content.split(/\r?\n/).length, extension };
  }

  const lines = parseNotesFromText(content);
  return { content: lines.join("\n"), lineCount: lines.length, extension };
}

export function readPilotJsonInput<T>(inputPath: string): T {
  const { content, extension } = readPilotInputFile(inputPath);
  if (extension !== ".json") {
    throw new CliInputError("JSON input required for this command");
  }
  return JSON.parse(content) as T;
}

export function sanitizeNotesLines(lines: string[]): {
  sanitizedLines: string[];
  redactionCount: number;
  blockedLines: number;
  warnings: string[];
} {
  const sanitizedLines: string[] = [];
  let redactionCount = 0;
  let blockedLines = 0;
  const warnings: string[] = [];

  for (const line of lines) {
    const result = sanitizePilotContent(line);
    redactionCount += result.redactionCount;
    if (result.blocked) {
      blockedLines += 1;
      warnings.push(result.blockReason ?? "Blocked potentially sensitive line.");
      sanitizedLines.push(result.sanitized || "[PERSONAL DATA REDACTED]");
      continue;
    }
    sanitizedLines.push(result.sanitized);
  }

  return { sanitizedLines, redactionCount, blockedLines, warnings };
}
