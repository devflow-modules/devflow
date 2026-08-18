import { describe, expect, it, vi } from "vitest";

import {
  canCreateApplicationPack,
  createApplicationPack,
  isOpenableJobUrl,
  markApplyFlowJobApplied,
  replaceApplyFlowJob,
  resolveApplicationPackResume,
  setApplicationPackChecklistItem,
} from "../application-pack.js";
import { APPLICATION_PACK_CHECKLIST_IDS, APPLICATION_PACK_VERSION } from "../application-pack-types.js";
import { gustavoProfile } from "../candidate-profile.js";
import { ingestApplyFlowJob } from "../ingest-applyflow-job.js";
import { parseApplyFlowJobsImport } from "../imported-job-schema.js";
import { mergeApplyFlowJobs } from "../merge-applyflow-jobs.js";
import type { CandidateProfile } from "../profile-schema.js";
import { validateCandidateProfile } from "../profile-schema.js";
import {
  addResumeVariant,
  createResumeLibraryFromProfile,
  renameResumeVariant,
  setDefaultResumeVariant,
} from "../resume-library.js";
import type { ResumeLibrary } from "../resume-library-types.js";

const NOW = new Date("2026-08-18T15:00:00.000Z");
const LATER = new Date("2026-08-18T16:00:00.000Z");

const APPLY_POSTING = `Senior Product Engineer
Remote · CLT

We need React, Next.js, TypeScript and Node.js to ship product integrations.
`;

const STRETCH_POSTING = `Backend Engineer
Hybrid

Stack: React, TypeScript and Kubernetes. PostgreSQL is a plus.
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

describe("createApplicationPack", () => {
  it("1. APPLY pode gerar Pack", () => {
    const library = twoVariantLibrary();
    const job = ingestApplyFlowJob({
      description: APPLY_POSTING,
      source: "paste",
      profile: gustavoProfile,
      resumeLibrary: library,
      now: NOW,
      id: "job_apply",
    });
    expect(job.jobMatch.decision).toBe("apply");
    const created = createApplicationPack({ job, library, now: NOW });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.job.applicationPack?.packVersion).toBe(APPLICATION_PACK_VERSION);
    expect(created.job.applicationPack?.match.decision).toBe("apply");
    expect(created.job.status).toBe("reviewing");
  });

  it("2. STRETCH pode gerar Pack", () => {
    const library = createResumeLibraryFromProfile(gustavoProfile, { now: NOW, id: "rv_only" });
    const job = ingestApplyFlowJob({
      description: STRETCH_POSTING,
      source: "paste",
      profile: gustavoProfile,
      resumeLibrary: library,
      now: NOW,
      id: "job_stretch",
    });
    expect(job.jobMatch.decision).toBe("stretch");
    expect(canCreateApplicationPack(job)).toBe(true);
    const created = createApplicationPack({ job, library, now: NOW });
    expect(created.ok).toBe(true);
  });

  it("3. SKIP não pode gerar Pack", () => {
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
    expect(canCreateApplicationPack(job)).toBe(false);
    const created = createApplicationPack({ job, library, now: NOW });
    expect(created.ok).toBe(false);
    expect(job.applicationPack).toBeUndefined();
  });

  it("4. recommended resume é pré-selecionado", () => {
    const library = twoVariantLibrary({ defaultId: "rv_frontend" });
    const job = ingestApplyFlowJob({
      description: APPLY_POSTING,
      source: "paste",
      profile: gustavoProfile,
      resumeLibrary: library,
      now: NOW,
      id: "job_rec",
    });
    const resolved = resolveApplicationPackResume(job, library);
    expect(resolved.source).toBe("recommended");
    expect(resolved.variant.id).toBe("rv_product");
    const created = createApplicationPack({ job, library, now: NOW });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.job.applicationPack?.resume.variantId).toBe("rv_product");
    expect(created.job.applicationPack?.resume.recommendedByRouter).toBe(true);
  });

  it("5. sem recommendation usa evaluatedWith", () => {
    const library = createResumeLibraryFromProfile(gustavoProfile, {
      now: NOW,
      name: "Perfil principal",
      id: "rv_only",
    });
    const job = ingestApplyFlowJob({
      description: APPLY_POSTING,
      source: "paste",
      profile: gustavoProfile,
      resumeLibrary: library,
      now: NOW,
      id: "job_eval",
    });
    expect(job.curriculumRecommendation).toBeUndefined();
    expect(job.evaluatedWith?.variantId).toBe("rv_only");
    const resolved = resolveApplicationPackResume(job, library);
    expect(resolved.source).toBe("evaluated-with");
  });

  it("6. sem recommendation/evaluatedWith usa o default", () => {
    const library = createResumeLibraryFromProfile(gustavoProfile, { now: NOW, id: "rv_only" });
    const job = ingestApplyFlowJob({
      description: APPLY_POSTING,
      source: "paste",
      profile: gustavoProfile,
      now: NOW,
      id: "job_f1",
    });
    expect(job.evaluatedWith).toBeUndefined();
    const resolved = resolveApplicationPackResume(job, library);
    expect(resolved.source).toBe("default");
    expect(resolved.variant.id).toBe("rv_only");
  });

  it("7. usuário pode escolher outra variante antes de criar", () => {
    const library = twoVariantLibrary({ defaultId: "rv_frontend" });
    const job = ingestApplyFlowJob({
      description: APPLY_POSTING,
      source: "paste",
      profile: gustavoProfile,
      resumeLibrary: library,
      now: NOW,
      id: "job_choice",
    });
    const created = createApplicationPack({ job, library, variantId: "rv_frontend", now: NOW });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.job.applicationPack?.resume.variantId).toBe("rv_frontend");
    expect(created.job.applicationPack?.resume.recommendedByRouter).toBe(false);
    expect(created.job.applicationPack?.match.score).toBe(job.jobMatch.score);
  });

  it("8. criar Pack não muda default", () => {
    const library = twoVariantLibrary({ defaultId: "rv_frontend" });
    const job = ingestApplyFlowJob({
      description: APPLY_POSTING,
      source: "paste",
      profile: gustavoProfile,
      resumeLibrary: library,
      now: NOW,
      id: "job_default",
    });
    const created = createApplicationPack({ job, library, now: NOW });
    expect(created.ok).toBe(true);
    expect(created.library.defaultVariantId).toBe("rv_frontend");
    expect(library.defaultVariantId).toBe("rv_frontend");
  });

  it("9–12. snapshot histórico sobrevive a rename, default e Router", () => {
    const library = twoVariantLibrary({ defaultId: "rv_frontend" });
    const job = ingestApplyFlowJob({
      description: APPLY_POSTING,
      source: "paste",
      profile: gustavoProfile,
      resumeLibrary: library,
      now: NOW,
      id: "job_hist",
    });
    const created = createApplicationPack({ job, library, now: NOW });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const packed = created.job;
    const snapshot = structuredClone(packed.applicationPack);

    const renamed = renameResumeVariant(library, "rv_product", "Staff Product", LATER);
    expect(renamed.ok).toBe(true);
    const switched = setDefaultResumeVariant(library, "rv_product", LATER);
    expect(switched.ok).toBe(true);
    packed.curriculumRecommendation = {
      ...packed.curriculumRecommendation!,
      recommendedVariantId: "rv_frontend",
      recommendedVariantName: "Frontend React/Next.js",
    };

    expect(packed.applicationPack).toEqual(snapshot);
    expect(packed.applicationPack?.resume.variantName).toBe("Product Engineer");
  });

  it("13. match snapshot não recalcula o job", () => {
    const library = twoVariantLibrary({ defaultId: "rv_frontend" });
    const job = ingestApplyFlowJob({
      description: APPLY_POSTING,
      source: "paste",
      profile: gustavoProfile,
      resumeLibrary: library,
      now: NOW,
      id: "job_match",
    });
    const originalMatch = structuredClone(job.jobMatch);
    const created = createApplicationPack({ job, library, now: NOW });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.job.jobMatch).toEqual(originalMatch);
    expect(created.job.curriculumRecommendation).toEqual(job.curriculumRecommendation);
    expect(created.library.defaultVariantId).toBe(library.defaultVariantId);
    expect(created.job.applicationPack?.match.score).toBe(100);
    expect(created.job.jobMatch.score).toBe(75);
  });

  it("14–16. highlights e gaps vêm só dos dados existentes", () => {
    const library = twoVariantLibrary();
    const job = ingestApplyFlowJob({
      description: APPLY_POSTING,
      source: "paste",
      profile: gustavoProfile,
      resumeLibrary: library,
      now: NOW,
      id: "job_facts",
    });
    const created = createApplicationPack({ job, library, now: NOW });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const pack = created.job.applicationPack!;
    expect(pack.highlights).toEqual(pack.match.matchedSkills);
    expect(pack.gaps).toEqual(pack.match.missingSkills);
    expect(pack.highlights.join(" ")).not.toMatch(/liderei|arquiteturas distribuídas/i);
    expect(pack.candidateFacts.name).toBe(gustavoProfile.name);
    expect(pack.candidateFacts.location).toBe(gustavoProfile.location);
    expect(pack.candidateFacts.englishLevel).toBe(gustavoProfile.englishLevel);
    expect(pack.candidateFacts.answerBank?.professionalSummary).toBe(gustavoProfile.answerBank.professionalSummary);
    expect(JSON.stringify(pack.candidateFacts.answerBank)).not.toMatch(/gerad[oa]|adaptad[oa] a esta vaga/i);
  });

  it("17–18. checklist persiste, substitui o job e não reescreve o snapshot", () => {
    const library = twoVariantLibrary();
    const job = ingestApplyFlowJob({
      description: APPLY_POSTING,
      source: "paste",
      profile: gustavoProfile,
      resumeLibrary: library,
      now: NOW,
      id: "job_check",
    });
    const created = createApplicationPack({ job, library, now: NOW });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.job.applicationPack?.checklist.map((item) => item.id)).toEqual([...APPLICATION_PACK_CHECKLIST_IDS]);
    expect(created.job.applicationPack?.checklist.every((item) => item.done === false)).toBe(true);

    const checked = setApplicationPackChecklistItem({
      job: created.job,
      itemId: "review-resume",
      done: true,
      now: LATER,
    });
    expect(checked.id).toBe(created.job.id);
    expect(checked.updatedAt).toBe(LATER.toISOString());
    expect(checked.applicationPack?.updatedAt).toBe(LATER.toISOString());
    expect(checked.applicationPack?.createdAt).toBe(created.job.applicationPack?.createdAt);
    expect(checked.applicationPack?.checklist.find((item) => item.id === "review-resume")?.done).toBe(true);

    const { checklist: createdChecklist, updatedAt: createdPackUpdatedAt, ...createdSnapshot } = created.job.applicationPack!;
    const { checklist: checkedChecklist, updatedAt: checkedPackUpdatedAt, ...checkedSnapshot } = checked.applicationPack!;
    expect(createdChecklist).not.toEqual(checkedChecklist);
    expect(createdPackUpdatedAt).not.toBe(checkedPackUpdatedAt);
    expect(checkedSnapshot).toEqual(createdSnapshot);

    const merged = mergeApplyFlowJobs([created.job], [checked]);
    expect(merged.skipped).toBe(1);
    expect(merged.jobs[0]?.applicationPack?.checklist.find((item) => item.id === "review-resume")?.done).toBe(false);

    const replaced = replaceApplyFlowJob([created.job], checked);
    expect(replaced).toHaveLength(1);
    expect(replaced[0]).toBe(checked);
    expect(replaced[0]?.applicationPack?.checklist.find((item) => item.id === "review-resume")?.done).toBe(true);

    const unchecked = setApplicationPackChecklistItem({
      job: checked,
      itemId: "review-resume",
      done: false,
      now: LATER,
    });
    expect(unchecked.applicationPack?.checklist.find((item) => item.id === "review-resume")?.done).toBe(false);
  });

  it("19. refresh preserva Pack", () => {
    const library = twoVariantLibrary();
    const job = ingestApplyFlowJob({
      description: APPLY_POSTING,
      source: "paste",
      profile: gustavoProfile,
      resumeLibrary: library,
      now: NOW,
      id: "job_refresh",
    });
    const created = createApplicationPack({ job, library, now: NOW });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const checked = setApplicationPackChecklistItem({
      job: created.job,
      itemId: "open-job",
      done: true,
      now: LATER,
    });
    const restored = JSON.parse(JSON.stringify(checked)) as typeof checked;
    expect(restored.applicationPack).toEqual(checked.applicationPack);
    expect(restored.status).toBe("reviewing");
    const again = createApplicationPack({ job: restored, library, now: LATER });
    expect(again.ok).toBe(false);
  });

  it("20. job antigo sem Pack continua válido", () => {
    const job = ingestApplyFlowJob({
      description: APPLY_POSTING,
      source: "paste",
      profile: gustavoProfile,
      now: NOW,
      id: "job_legacy",
    });
    expect(job.applicationPack).toBeUndefined();
    const parsed = parseApplyFlowJobsImport({ version: 2, jobs: [job] }, { profile: gustavoProfile, now: NOW });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.jobs[0]?.applicationPack).toBeUndefined();
  });

  it("21. import v2 preserva Pack", () => {
    const library = twoVariantLibrary();
    const job = ingestApplyFlowJob({
      description: APPLY_POSTING,
      source: "paste",
      profile: gustavoProfile,
      resumeLibrary: library,
      now: NOW,
      id: "job_import_pack",
    });
    const created = createApplicationPack({ job, library, now: NOW });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    created.job.applicationPack = {
      ...created.job.applicationPack!,
      resume: { ...created.job.applicationPack!.resume, variantName: "Frozen pack name" },
      checklist: created.job.applicationPack!.checklist.map((item) =>
        item.id === "review-resume" ? { ...item, done: true } : item,
      ),
    };
    const parsed = parseApplyFlowJobsImport({ version: 2, jobs: [created.job] }, { profile: frontendProfile(), now: LATER });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.jobs[0]?.applicationPack?.resume.variantName).toBe("Frozen pack name");
    expect(parsed.jobs[0]?.applicationPack?.checklist.find((item) => item.id === "review-resume")?.done).toBe(true);
    expect(parsed.jobs[0]?.applicationPack?.match).toEqual(created.job.applicationPack?.match);
    expect(parsed.jobs[0]?.jobMatch).toEqual(created.job.jobMatch);
  });

  it("22. listing cru não cria Pack", () => {
    const library = twoVariantLibrary();
    const parsed = parseApplyFlowJobsImport(
      { version: 2, listings: [{ description: APPLY_POSTING, title: "Raw listing" }] },
      { profile: gustavoProfile, resumeLibrary: library, now: NOW },
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.jobs[0]?.applicationPack).toBeUndefined();
  });

  it("23–24. Preparar candidatura não aplica; Mark Applied exige clique explícito", () => {
    const library = twoVariantLibrary();
    const job = ingestApplyFlowJob({
      description: APPLY_POSTING,
      source: "paste",
      profile: gustavoProfile,
      resumeLibrary: library,
      now: NOW,
      id: "job_applied",
    });
    expect(job.status).toBe("reviewing");
    const created = createApplicationPack({ job, library, now: NOW });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.job.status).toBe("reviewing");
    expect(created.job.applicationPack?.checklist.find((item) => item.id === "mark-applied")?.done).toBe(false);

    const applied = markApplyFlowJobApplied(created.job, LATER);
    expect(applied.status).toBe("applied");
    expect(applied.updatedAt).toBe(LATER.toISOString());
    expect(applied.applicationPack).toEqual(created.job.applicationPack);
    expect(applied.applicationPack?.checklist.find((item) => item.id === "mark-applied")?.done).toBe(false);
    expect(created.job.status).toBe("reviewing");
    expect(job.status).toBe("reviewing");
  });

  it("25–26. determinístico, sem LLM e sem backend", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const library = twoVariantLibrary();
    const job = ingestApplyFlowJob({
      description: APPLY_POSTING,
      source: "paste",
      profile: gustavoProfile,
      resumeLibrary: library,
      now: NOW,
      id: "job_det",
      url: "https://example.com/jobs/product",
    });
    const first = createApplicationPack({ job, library, now: NOW });
    const second = createApplicationPack({ job, library, now: NOW });
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(first.job.applicationPack?.resume).toEqual(second.job.applicationPack?.resume);
    expect(first.job.applicationPack?.match).toEqual(second.job.applicationPack?.match);
    expect(first.job.applicationPack?.highlights).toEqual(second.job.applicationPack?.highlights);
    expect(isOpenableJobUrl(job.url)).toBe(true);
    expect(isOpenableJobUrl("javascript:alert(1)")).toBe(false);
    expect(isOpenableJobUrl("/jobs/local")).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
