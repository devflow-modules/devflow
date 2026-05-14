import type { CareerApplication } from "./schemas/careerApplication.js";
import type { CareerBundle } from "./schemas/careerBundle.js";
import { careerBundleSchema } from "./schemas/careerBundle.js";
import type { InterviewPreparation } from "./schemas/interviewPreparation.js";

export type ParseCareerBundleResult =
  | { ok: true; data: CareerBundle }
  | { ok: false; error: string };

export function parseCareerBundle(input: unknown): ParseCareerBundleResult {
  const r = careerBundleSchema.safeParse(input);
  if (!r.success) {
    const msg = r.error.issues.map((i) => `${i.path.join(".") || "root"}: ${i.message}`).join("; ");
    return { ok: false, error: msg || "Invalid CareerBundle" };
  }
  return { ok: true, data: r.data };
}

export function createCareerBundle(
  applications: CareerApplication[],
  candidate?: CareerBundle["candidate"],
): CareerBundle {
  return {
    schemaVersion: "1.0",
    exportedAt: new Date().toISOString(),
    sourceProduct: "applyflow",
    candidate,
    applications,
  };
}

function statusPriority(status: CareerApplication["status"]): number {
  if (status === "interview_requested") return 0;
  if (status === "interview_scheduled") return 1;
  return 2;
}

/** Candidaturas com entrevista agendada ou pedida, ordenadas (pedido antes de agendada). */
export function getInterviewReadyApplications(bundle: CareerBundle): CareerApplication[] {
  const list = bundle.applications.filter(
    (a) => a.status === "interview_requested" || a.status === "interview_scheduled",
  );
  return [...list].sort((a, b) => {
    const d = statusPriority(a.status) - statusPriority(b.status);
    if (d !== 0) return d;
    return a.id.localeCompare(b.id);
  });
}

/**
 * Gera preparação estável a partir de cargo, skills e descrição (sem IA, sem aleatório).
 */
export function createInterviewPreparationFromApplication(application: CareerApplication): InterviewPreparation {
  const skills = [...application.requiredSkills]
    .map((s) => s.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  const role = application.role.trim() || "Role";
  const company = application.company.trim() || "Company";
  const descSnippet = (application.jobDescription ?? "").trim().slice(0, 280);

  const focusAreas: string[] = [];
  if (skills[0]) {
    focusAreas.push(`Strengthen ${skills[0]} patterns relevant to ${role}.`);
  }
  if (skills[0] && skills[1]) {
    focusAreas.push(`Contrast ${skills[0]} vs ${skills[1]} trade-offs for problems at ${company}.`);
  }
  focusAreas.push(`Explain a recent ${role}-related project in concise English.`);
  focusAreas.push("Practice narrating your thought process while coding.");
  if (descSnippet.length > 0) {
    focusAreas.push("Turn the job excerpt (first 280 chars) into 3 requirement bullets out loud.");
  }

  const technicalQuestions = skills.slice(0, 3).map(
    (s, i) =>
      `For ${role}: outline a small feature where ${s} is central — pick data structures before code (step ${i + 1}).`,
  );
  while (technicalQuestions.length < 3) {
    technicalQuestions.push(
      `For ${role}: walk through input validation and edge cases (generic drill ${technicalQuestions.length + 1}).`,
    );
  }

  const behavioralQuestions = [
    `STAR: a trade-off you faced in a ${role}-like context.`,
    "STAR: a disagreement with a teammate and how you aligned.",
    "STAR: delivering under a tight deadline without sacrificing quality.",
  ];

  const skillPair = skills.slice(0, 2).join(" and ") || "problem solving and testing";
  const speakingPrompts = [
    `Opening: "I'm excited about ${role} because…" — link two strengths: ${skillPair}.`,
    `Clarify scope: "For this ${role}, I want to confirm success metrics…"`,
    `Closing: one sentence on impact you would aim for at ${company}.`,
  ];

  const liveCodingHints: string[] = [
    skills.length > 0
      ? `Start with a brute-force sketch using ${skills[0]}, then tighten complexity.`
      : "Start with two concrete examples, then generalize.",
  ];
  for (const s of skills.slice(1, 4)) {
    liveCodingHints.push(`Watch syntax and naming for ${s}; say each line's intent aloud.`);
  }
  while (liveCodingHints.length < 3) {
    liveCodingHints.push("State loop invariants before mutating state.");
  }

  const estimatedSessionMinutes = Math.min(45, 15 + skills.length * 2 + (descSnippet.length > 0 ? 5 : 0));

  return {
    applicationId: application.id,
    focusAreas: focusAreas.slice(0, 6),
    technicalQuestions: technicalQuestions.slice(0, 6),
    behavioralQuestions,
    speakingPrompts,
    liveCodingHints: liveCodingHints.slice(0, 6),
    estimatedSessionMinutes,
  };
}
