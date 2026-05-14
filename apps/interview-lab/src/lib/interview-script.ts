/**
 * Roteiro guiado por fases para narração em inglês durante a simulação.
 * Copy do produto em inglês (Sprint 0.4).
 */

export type InterviewPhaseId =
  | "opening"
  | "understanding"
  | "approach"
  | "coding"
  | "testing"
  | "complexity"
  | "closing"
  | "stuck-recovery";

export type InterviewPhase = {
  id: InterviewPhaseId;
  title: string;
  shortDescription: string;
  prompts: string[];
};

export const INTERVIEW_SCRIPT_PHASES: InterviewPhase[] = [
  {
    id: "opening",
    title: "Opening",
    shortDescription: "Frame the session and confirm you understood the brief.",
    prompts: [
      "Let me restate the problem to make sure I understand it correctly.",
      "Before coding, I'll confirm the input, output, and examples.",
    ],
  },
  {
    id: "understanding",
    title: "Understanding",
    shortDescription: "Clarify inputs, outputs, and rules out loud.",
    prompts: [
      "The input is...",
      "The expected output is...",
      "One important rule is...",
    ],
  },
  {
    id: "approach",
    title: "Approach",
    shortDescription: "Explain your plan before touching the editor.",
    prompts: [
      "My approach is to...",
      "I chose this approach because...",
      "This looks like a frequency map / sorting / two pointers problem because...",
    ],
  },
  {
    id: "coding",
    title: "Coding",
    shortDescription: "Narrate while you implement.",
    prompts: [
      "Now I'll implement this step by step.",
      "Here I'm creating the main data structure.",
      "Now I'm handling the tie-breaker or edge case.",
    ],
  },
  {
    id: "testing",
    title: "Testing",
    shortDescription: "Walk through examples and edge cases verbally.",
    prompts: [
      "Let's test this with the first example.",
      "Now I'll test an edge case.",
      "The expected result should be...",
    ],
  },
  {
    id: "complexity",
    title: "Complexity",
    shortDescription: "Close the loop on cost and bottlenecks.",
    prompts: [
      "The time complexity is...",
      "The space complexity is...",
      "The most expensive operation here is...",
    ],
  },
  {
    id: "closing",
    title: "Closing",
    shortDescription: "Summarize and mention trade-offs or next steps.",
    prompts: [
      "This solution handles the main examples and edge cases.",
      "If we needed to optimize further, I would consider...",
    ],
  },
  {
    id: "stuck-recovery",
    title: "Stuck / Recovery",
    shortDescription: "Buy time and reset safely under pressure.",
    prompts: [
      "Let me think about this edge case for a moment.",
      "I'll start with the simplest correct approach first, then improve it if needed.",
      "I'm going to write pseudocode first to make the logic clear.",
    ],
  },
];

export const GUIDED_SCRIPT_USAGE_EXPORT = "Not tracked in this session.";

export function getInterviewPhase(id: InterviewPhaseId): InterviewPhase | undefined {
  return INTERVIEW_SCRIPT_PHASES.find((p) => p.id === id);
}

export function buildQuickOpeningCopy(): string {
  const p = getInterviewPhase("opening");
  return p ? p.prompts.join("\n\n") : "";
}

/** Primeira frase da fase Stuck / Recovery (atalho sob pressão). */
export function buildQuickStuckCopy(): string {
  const p = getInterviewPhase("stuck-recovery");
  return p?.prompts[0] ?? "";
}

export function buildQuickComplexityCopy(): string {
  const p = getInterviewPhase("complexity");
  return p ? p.prompts.join("\n\n") : "";
}
