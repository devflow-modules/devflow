import { normalizeJobTextForIntel } from "./job-intelligence.js";

/**
 * Explicit technology identities. A surface matches only at a token boundary,
 * and a longer surface consumes its span so a shorter identity cannot be
 * inferred from the middle of another name.
 */
const TECHNOLOGY_SURFACES: ReadonlyArray<{ identity: string; surface: string }> = [
  { identity: "aws", surface: "amazon web services" },
  { identity: "aws", surface: "aws" },
  { identity: "javascript", surface: "javascript" },
  { identity: "java", surface: "java" },
  { identity: "typescript", surface: "typescript" },
  { identity: "react-native", surface: "react native" },
  { identity: "react", surface: "react.js" },
  { identity: "react", surface: "reactjs" },
  { identity: "react", surface: "react" },
  { identity: "next", surface: "next.js" },
  { identity: "next", surface: "nextjs" },
  { identity: "node", surface: "node.js" },
  { identity: "node", surface: "nodejs" },
  { identity: "node", surface: "node" },
  { identity: "postgresql", surface: "postgresql" },
  { identity: "postgresql", surface: "postgres" },
  { identity: "sql-server", surface: "microsoft sql server" },
  { identity: "sql-server", surface: "sql server" },
  { identity: "docker", surface: "docker" },
  { identity: "kubernetes", surface: "kubernetes" },
  { identity: "kubernetes", surface: "k8s" },
  { identity: "express", surface: "express.js" },
  { identity: "express", surface: "expressjs" },
  { identity: "express", surface: "express" },
  { identity: "github-actions", surface: "github actions" },
  { identity: "csharp", surface: "c sharp" },
  { identity: "csharp", surface: "csharp" },
  { identity: "csharp", surface: "c#" },
  { identity: "cpp", surface: "c++" },
  { identity: "dotnet", surface: "asp.net" },
  { identity: "dotnet", surface: ".net" },
  { identity: "dotnet", surface: "dotnet" },
  { identity: "dotnet", surface: "dot net" },
  { identity: "rest", surface: "rest api" },
  { identity: "rest", surface: "restful" },
  { identity: "rest", surface: "rest" },
];

const SURFACES = TECHNOLOGY_SURFACES.map((item) => ({
  identity: item.identity,
  surface: normalizeJobTextForIntel(item.surface),
})).sort(
  (left, right) =>
    right.surface.length - left.surface.length ||
    left.identity.localeCompare(right.identity) ||
    left.surface.localeCompare(right.surface),
);

function isBoundary(text: string, index: number): boolean {
  if (index < 0 || index >= text.length) return true;
  return !/[a-z0-9]/i.test(text[index] ?? "");
}

function findBounded(text: string, surface: string, from: number): number {
  let cursor = from;
  while (cursor <= text.length - surface.length) {
    const at = text.indexOf(surface, cursor);
    if (at < 0) return -1;
    if (isBoundary(text, at - 1) && isBoundary(text, at + surface.length)) return at;
    cursor = at + 1;
  }
  return -1;
}

/** Identities present in text. Longer surfaces win overlapping spans. */
export function technologyIdentities(text: string): Set<string> {
  const folded = normalizeJobTextForIntel(text);
  const occupied = new Array<boolean>(folded.length).fill(false);
  const found = new Set<string>();
  for (const { identity, surface } of SURFACES) {
    if (!surface) continue;
    let from = 0;
    while (from < folded.length) {
      const at = findBounded(folded, surface, from);
      if (at < 0) break;
      const end = at + surface.length;
      let overlaps = false;
      for (let index = at; index < end; index += 1) {
        if (occupied[index]) {
          overlaps = true;
          break;
        }
      }
      if (!overlaps) {
        for (let index = at; index < end; index += 1) occupied[index] = true;
        found.add(identity);
      }
      from = at + 1;
    }
  }
  return found;
}

function hasBoundedSurface(text: string, surface: string): boolean {
  return findBounded(text, surface, 0) >= 0;
}

/**
 * True when `text` contains the same technology identity as `hint`.
 * Unknown hints match only as a full bounded surface, never as a substring.
 */
export function textMentionsTechnology(text: string, hint: string): boolean {
  const needle = normalizeJobTextForIntel(hint);
  if (needle.length < 2) return false;
  const hintIds = technologyIdentities(needle);
  const folded = normalizeJobTextForIntel(text);
  if (hintIds.size > 0) {
    const textIds = technologyIdentities(folded);
    for (const id of hintIds) {
      if (textIds.has(id)) return true;
    }
    return false;
  }
  return hasBoundedSurface(folded, needle);
}
