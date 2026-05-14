import type { ProblemDefinition, TestOutcome } from "./types";
import { deepEqual } from "./deep-equal";

/**
 * Extrai e devolve `solve` a partir do código do utilizador.
 *
 * **Aviso de segurança (MVP interno):** usa `new Function`, equivalente a eval dinâmico.
 * Destina-se apenas a ambiente local/dev com código teu. Nunca passes código ou dados
 * não confiáveis a esta função num produto exposto à Internet.
 */
export function extractSolveFromUserCode(userCode: string): (...args: unknown[]) => unknown {
  const factory = new Function(`"use strict";\n${userCode}\n;return typeof solve === "function" ? solve : null;`);
  const solve = factory() as unknown;
  if (typeof solve !== "function") {
    throw new Error("Define a top-level function named `solve` that implements the problem.");
  }
  return solve as (...args: unknown[]) => unknown;
}

function serialize(v: unknown): string {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export async function runProblemTests(userCode: string, problem: ProblemDefinition): Promise<TestOutcome[]> {
  let solve: (...args: unknown[]) => unknown;
  try {
    solve = extractSolveFromUserCode(userCode);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return [{ id: "parse", pass: false, detail: msg }];
  }

  if (problem.runCustomTests) {
    try {
      return await problem.runCustomTests(solve);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return [{ id: "custom", pass: false, detail: msg }];
    }
  }

  const outcomes: TestOutcome[] = [];
  for (const tc of problem.testCases) {
    try {
      const received = solve(...tc.input);
      const pass = deepEqual(received, tc.expected);
      outcomes.push({
        id: tc.id,
        pass,
        expected: tc.expected,
        received,
        detail: pass ? undefined : `Expected ${serialize(tc.expected)}, received ${serialize(received)}`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      outcomes.push({
        id: tc.id,
        pass: false,
        expected: tc.expected,
        detail: msg,
      });
    }
  }
  return outcomes;
}

export function countPassed(outcomes: TestOutcome[]): number {
  return outcomes.filter((o) => o.pass).length;
}

/** Número de casos de teste esperados (para histórico quando ainda não houve Run). */
export function expectedTestCount(problem: ProblemDefinition): number {
  if (problem.runCustomTests) return 2;
  return problem.testCases.length;
}
