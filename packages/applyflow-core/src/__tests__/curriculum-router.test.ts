import { describe, expect, it, vi } from "vitest";

import { gustavoProfile } from "../candidate-profile.js";
import {
  classifyCurriculumRouterConfidence,
  compareResumeMatchCandidates,
  rankResumeMatchCandidates,
  recommendCurriculum,
} from "../curriculum-router.js";
import { ingestApplyFlowJob } from "../ingest-applyflow-job.js";
import { parseApplyFlowJobsImport } from "../imported-job-schema.js";
import {
  CURRICULUM_ROUTER_DELTA_BANDS_V1,
  CURRICULUM_ROUTER_VERSION,
  JOB_MATCH_SCORING_VERSION,
  type ResumeMatchCandidate,
} from "../job-match-types.js";
import type { CandidateProfile } from "../profile-schema.js";
import { validateCandidateProfile } from "../profile-schema.js";
import {
  addResumeVariant,
  createResumeLibraryFromProfile,
  renameResumeVariant,
  setDefaultResumeVariant,
} from "../resume-library.js";
import type { ResumeLibrary } from "../resume-library-types.js";

const NOW = new Date("2026-08-17T15:00:00.000Z");
const LATER = new Date("2026-08-17T16:00:00.000Z");

const APPLY_POSTING = `Senior Product Engineer
Remote · CLT

We need React, Next.js, TypeScript and Node.js to ship product integrations.
`;

const SKIP_POSTING = `Legacy Engineer
Onsite

Looking for Java, Elixir and Ruby specialists. Mainframe experience is a plus.
`;

function withSkills(overrides: Partial<CandidateProfile["skills"]>): CandidateProfile {
  return validateCandidateProfile({
    ...gustavoProfile,
    skills: {
      ...gustavoProfile.skills,
      ...overrides,
    },
  });
}

function frontendProfile(): CandidateProfile {
  return withSkills({
    Nodejs: 0,
    Python: 0,
    PostgreSQL: 0,
    Prisma: 0,
    Docker: 0,
    AWS: 0,
    Java: 0,
    Elixir: 0,
    Ruby: 0,
  });
}

function twoVariantLibrary(options?: { defaultId?: string }): ResumeLibrary {
  const seeded = createResumeLibraryFromProfile(gustavoProfile, {
    now: NOW,
    name: "Product Engineer",
    id: "rv_product",
  });
  const added = addResumeVariant(seeded, {
    profile: frontendProfile(),
    name: "Frontend React/Next.js",
    now: NOW,
    id: "rv_frontend",
  });
  if (!added.ok) throw new Error(added.error);
  if (!options?.defaultId || options.defaultId === "rv_product") return added.library;
  const switched = setDefaultResumeVariant(added.library, options.defaultId, NOW);
  if (!switched.ok) throw new Error(switched.error);
  return switched.library;
}

function candidate(partial: Pick<ResumeMatchCandidate, "variantId"> & Partial<ResumeMatchCandidate>): ResumeMatchCandidate {
  return {
    variantName: partial.variantId,
    score: 80,
    decision: "apply",
    matchedSkills: ["React"],
    missingSkills: ["Kubernetes"],
    ...partial,
  };
}

describe("recommendCurriculum", () => {
  it("1. biblioteca com 1 variante não produz recomendação artificial", () => {
    const library = createResumeLibraryFromProfile(gustavoProfile, { now: NOW, id: "rv_only" });
    expect(recommendCurriculum({ skills: ["React", "Node.js"] }, library, { now: NOW })).toBeUndefined();

    const job = ingestApplyFlowJob({
      description: APPLY_POSTING,
      source: "paste",
      profile: gustavoProfile,
      resumeLibrary: library,
      now: NOW,
      id: "job_single",
    });
    expect(job.curriculumRecommendation).toBeUndefined();
    expect(job.evaluatedWith).toEqual({ variantId: "rv_only", variantName: "Perfil principal" });
  });

  it("2. 2 variantes → maior score vence", () => {
    const library = twoVariantLibrary();
    const rec = recommendCurriculum({ skills: ["React", "Next.js", "TypeScript", "Node.js"] }, library, { now: NOW });
    expect(rec?.recommendedVariantId).toBe("rv_product");
    expect(rec?.candidates[0]?.score).toBeGreaterThan(rec?.candidates[1]?.score ?? 0);
    expect(rec?.routerVersion).toBe(CURRICULUM_ROUTER_VERSION);
    expect(rec?.scoringVersion).toBe(JOB_MATCH_SCORING_VERSION);
  });

  it("3. tie por score → matched skills desempata", () => {
    const ranked = rankResumeMatchCandidates(
      [
        candidate({
          variantId: "rv_b",
          score: 80,
          matchedSkills: ["React"],
          missingSkills: ["K8s"],
        }),
        candidate({
          variantId: "rv_a",
          score: 80,
          matchedSkills: ["React", "Node.js"],
          missingSkills: ["K8s"],
        }),
      ],
      "rv_b",
    );
    expect(ranked[0]?.variantId).toBe("rv_a");
  });

  it("4. matched igual → missing skills desempata", () => {
    const ranked = rankResumeMatchCandidates(
      [
        candidate({
          variantId: "rv_b",
          score: 80,
          matchedSkills: ["React"],
          missingSkills: ["K8s", "Go"],
        }),
        candidate({
          variantId: "rv_a",
          score: 80,
          matchedSkills: ["React"],
          missingSkills: ["K8s"],
        }),
      ],
      "rv_b",
    );
    expect(ranked[0]?.variantId).toBe("rv_a");
  });

  it("5. empate total → default desempata", () => {
    const ranked = rankResumeMatchCandidates(
      [
        candidate({ variantId: "rv_z", score: 80, matchedSkills: ["React"], missingSkills: ["K8s"] }),
        candidate({ variantId: "rv_a", score: 80, matchedSkills: ["React"], missingSkills: ["K8s"] }),
      ],
      "rv_z",
    );
    expect(ranked[0]?.variantId).toBe("rv_z");
  });

  it("6. empate até default → variantId lexical estável", () => {
    const ranked = rankResumeMatchCandidates(
      [
        candidate({ variantId: "rv_zeta", score: 80, matchedSkills: ["React"], missingSkills: ["K8s"] }),
        candidate({ variantId: "rv_alpha", score: 80, matchedSkills: ["React"], missingSkills: ["K8s"] }),
      ],
      "rv_missing",
    );
    expect(ranked.map((item) => item.variantId)).toEqual(["rv_alpha", "rv_zeta"]);
  });

  it("7. default não recebe bônus de score", () => {
    const library = twoVariantLibrary({ defaultId: "rv_frontend" });
    const rec = recommendCurriculum({ skills: ["React", "Next.js", "TypeScript", "Node.js"] }, library, { now: NOW });
    const product = rec?.candidates.find((item) => item.variantId === "rv_product");
    const frontend = rec?.candidates.find((item) => item.variantId === "rv_frontend");
    expect(product?.score).toBeGreaterThan(frontend?.score ?? 0);
    expect(rec?.recommendedVariantId).toBe("rv_product");
    expect(compareResumeMatchCandidates(product!, frontend!, "rv_frontend")).toBeLessThan(0);
  });

  it("8. delta >= margem clara", () => {
    expect(classifyCurriculumRouterConfidence(CURRICULUM_ROUTER_DELTA_BANDS_V1.clear)).toBe("clear");
    const library = twoVariantLibrary();
    const rec = recommendCurriculum({ skills: ["React", "Next.js", "TypeScript", "Node.js"] }, library, { now: NOW });
    expect(rec?.scoreDelta).toBeGreaterThanOrEqual(CURRICULUM_ROUTER_DELTA_BANDS_V1.clear);
    expect(rec?.confidence).toBe("clear");
  });

  it("9. delta baixo → equivalência", () => {
    expect(classifyCurriculumRouterConfidence(4)).toBe("equivalent");
    expect(classifyCurriculumRouterConfidence(CURRICULUM_ROUTER_DELTA_BANDS_V1.moderate)).toBe("moderate");
    expect(classifyCurriculumRouterConfidence(9)).toBe("moderate");

    const close = addResumeVariant(createResumeLibraryFromProfile(gustavoProfile, { now: NOW, id: "rv_a" }), {
      profile: withSkills({ AWS: 0 }),
      name: "Quase igual",
      now: NOW,
      id: "rv_b",
    });
    expect(close.ok).toBe(true);
    if (!close.ok) return;
    const rec = recommendCurriculum({ skills: ["React", "TypeScript"] }, close.library, { now: NOW });
    expect(rec?.confidence).toBe("equivalent");
    expect(rec?.scoreDelta).toBeLessThan(CURRICULUM_ROUTER_DELTA_BANDS_V1.moderate);
  });

  it("10. recommendation snapshot é persistido no ingest", () => {
    const library = twoVariantLibrary();
    const job = ingestApplyFlowJob({
      description: APPLY_POSTING,
      source: "paste",
      profile: gustavoProfile,
      resumeLibrary: library,
      now: NOW,
      id: "job_snap",
    });
    expect(job.curriculumRecommendation?.recommendedVariantId).toBe("rv_product");
    expect(job.curriculumRecommendation?.candidates).toHaveLength(2);
    expect(job.evaluatedWith?.variantId).toBe("rv_product");
    expect(job.jobMatch.scoringVersion).toBe("v1");
  });

  it("11. rename depois da avaliação não altera snapshot antigo", () => {
    const library = twoVariantLibrary();
    const job = ingestApplyFlowJob({
      description: APPLY_POSTING,
      source: "paste",
      profile: gustavoProfile,
      resumeLibrary: library,
      now: NOW,
      id: "job_rename",
    });
    const renamed = renameResumeVariant(library, "rv_product", "Staff Product", LATER);
    expect(renamed.ok).toBe(true);
    expect(job.curriculumRecommendation?.recommendedVariantName).toBe("Product Engineer");
    expect(job.evaluatedWith?.variantName).toBe("Product Engineer");
  });

  it("12. troca de default não recalcula job antigo", () => {
    const library = twoVariantLibrary();
    const job = ingestApplyFlowJob({
      description: APPLY_POSTING,
      source: "paste",
      profile: gustavoProfile,
      resumeLibrary: library,
      now: NOW,
      id: "job_default",
    });
    const snapshot = structuredClone(job);
    const switched = setDefaultResumeVariant(library, "rv_frontend", LATER);
    expect(switched.ok).toBe(true);
    expect(job).toEqual(snapshot);
  });

  it("13. adicionar nova variante não recalcula job antigo", () => {
    const library = twoVariantLibrary();
    const job = ingestApplyFlowJob({
      description: APPLY_POSTING,
      source: "paste",
      profile: gustavoProfile,
      resumeLibrary: library,
      now: NOW,
      id: "job_add",
    });
    const before = job.curriculumRecommendation?.candidates.length;
    const added = addResumeVariant(library, {
      profile: frontendProfile(),
      name: "Full Stack",
      now: LATER,
      id: "rv_full",
    });
    expect(added.ok).toBe(true);
    expect(job.curriculumRecommendation?.candidates).toHaveLength(before ?? 0);
  });

  it("14. novo job considera biblioteca atualizada", () => {
    const library = twoVariantLibrary();
    const added = addResumeVariant(library, {
      profile: frontendProfile(),
      name: "Full Stack",
      now: LATER,
      id: "rv_full",
    });
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    const job = ingestApplyFlowJob({
      description: APPLY_POSTING,
      source: "paste",
      profile: gustavoProfile,
      resumeLibrary: added.library,
      now: LATER,
      id: "job_new",
    });
    expect(job.curriculumRecommendation?.candidates).toHaveLength(3);
    expect(job.curriculumRecommendation?.candidates.map((item) => item.variantId)).toContain("rv_full");
  });

  it("15. import v2 de job avaliado preserva recommendation", () => {
    const library = twoVariantLibrary();
    const stored = ingestApplyFlowJob({
      description: APPLY_POSTING,
      source: "paste",
      profile: gustavoProfile,
      resumeLibrary: library,
      now: NOW,
      id: "job_stored",
    });
    stored.curriculumRecommendation = {
      ...stored.curriculumRecommendation!,
      recommendedVariantName: "Frozen name",
      scoreDelta: 42,
    };
    const parsed = parseApplyFlowJobsImport({ version: 2, jobs: [stored] }, { profile: frontendProfile(), now: LATER });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.jobs[0]?.curriculumRecommendation?.recommendedVariantName).toBe("Frozen name");
    expect(parsed.jobs[0]?.curriculumRecommendation?.scoreDelta).toBe(42);
    expect(parsed.jobs[0]?.jobMatch).toEqual(stored.jobMatch);
  });

  it("16. import de listing cru calcula recommendation", () => {
    const library = twoVariantLibrary();
    const parsed = parseApplyFlowJobsImport(
      {
        version: 2,
        listings: [{ description: APPLY_POSTING, title: "Imported listing" }],
      },
      { profile: gustavoProfile, resumeLibrary: library, now: NOW },
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.jobs[0]?.curriculumRecommendation?.recommendedVariantId).toBe("rv_product");
    expect(parsed.jobs[0]?.evaluatedWith?.variantId).toBe("rv_product");
  });

  it("17. jobs F1 antigos sem recommendation continuam válidos", () => {
    const f1 = ingestApplyFlowJob({
      description: APPLY_POSTING,
      source: "paste",
      profile: gustavoProfile,
      now: NOW,
      id: "job_f1",
    });
    expect(f1.curriculumRecommendation).toBeUndefined();
    expect(f1.evaluatedWith).toBeUndefined();
    const parsed = parseApplyFlowJobsImport({ version: 2, jobs: [f1] }, { profile: gustavoProfile, now: NOW });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.jobs[0]?.id).toBe("job_f1");
    expect(parsed.jobs[0]?.curriculumRecommendation).toBeUndefined();
  });

  it("18. SKIP do Job Match permanece a decisão do job mesmo com Router", () => {
    const library = twoVariantLibrary();
    const job = ingestApplyFlowJob({
      description: SKIP_POSTING,
      source: "paste",
      profile: gustavoProfile,
      resumeLibrary: library,
      now: NOW,
      id: "job_skip",
    });
    expect(job.jobMatch.decision).toBe("skip");
    expect(job.status).toBe("ignored");
    expect(job.curriculumRecommendation).toBeDefined();
    expect(job.curriculumRecommendation?.recommendedVariantId).toBeTruthy();
  });

  it("19–20. determinístico, sem LLM e sem backend", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const library = twoVariantLibrary();
    const jobSkills = { skills: ["React", "Next.js", "TypeScript", "Node.js"] };
    const first = recommendCurriculum(jobSkills, library, { now: NOW });
    const second = recommendCurriculum(jobSkills, library, { now: NOW });
    expect(first).toEqual(second);
    expect(first?.recommendedVariantId).toBe(second?.recommendedVariantId);
    expect(first?.candidates.map((item) => item.score)).toEqual(second?.candidates.map((item) => item.score));
    expect(first?.confidence).toBe(second?.confidence);
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("Job Match continua no default quando o Router recomenda outro currículo", () => {
    const library = twoVariantLibrary({ defaultId: "rv_frontend" });
    const job = ingestApplyFlowJob({
      description: APPLY_POSTING,
      source: "paste",
      profile: gustavoProfile,
      resumeLibrary: library,
      now: NOW,
      id: "job_split",
    });
    expect(job.evaluatedWith?.variantId).toBe("rv_frontend");
    expect(job.jobMatch.score).toBeLessThan(job.curriculumRecommendation?.candidates[0]?.score ?? 0);
    expect(job.curriculumRecommendation?.recommendedVariantId).toBe("rv_product");
    expect(job.jobMatch.decision).not.toBe("apply");
  });
});
