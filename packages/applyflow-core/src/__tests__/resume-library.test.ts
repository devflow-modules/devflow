import { describe, expect, it } from "vitest";

import { gustavoProfile } from "../candidate-profile.js";
import { ingestApplyFlowJob } from "../ingest-applyflow-job.js";
import { parseApplyFlowDashboardImportJsonString } from "../imported-dashboard-schema.js";
import { parseResumeLibraryImport, serializeResumeLibraryImport } from "../imported-resume-library-schema.js";
import { ensureResumeLibrary } from "../migrate-resume-library.js";
import type { CandidateProfile } from "../profile-schema.js";
import { validateCandidateProfile } from "../profile-schema.js";
import {
  addResumeVariant,
  createResumeLibraryFromProfile,
  deleteResumeVariant,
  duplicateResumeVariant,
  getDefaultResumeVariant,
  renameResumeVariant,
  setDefaultResumeVariant,
} from "../resume-library.js";
import { parseResumeLibrary } from "../resume-library-schema.js";
import { LEGACY_RESUME_VARIANT_ID, LEGACY_RESUME_VARIANT_NAME } from "../resume-library-types.js";

const NOW = new Date("2026-08-14T12:00:00.000Z");
const LATER = new Date("2026-08-14T13:00:00.000Z");

const APPLY_POSTING = `Senior Product Engineer
Remote · CLT

We need React, Next.js, TypeScript and Node.js to ship product integrations.
`;

function frontendOnlyProfile(): CandidateProfile {
  return validateCandidateProfile({
    ...gustavoProfile,
    name: gustavoProfile.name,
    roles: ["Frontend React/Next.js"],
    skills: {
      ...gustavoProfile.skills,
      React: 8,
      Nextjs: 8,
      TypeScript: 8,
      Nodejs: 0,
      Python: 0,
      PostgreSQL: 0,
      Prisma: 0,
      Docker: 0,
      Java: 0,
      Elixir: 0,
      Ruby: 0,
    },
  });
}

describe("ensureResumeLibrary", () => {
  it("migra CandidateProfile legado para uma variante padrão sem perda", () => {
    const result = ensureResumeLibrary({ stored: null, fallbackProfile: gustavoProfile, now: NOW });
    expect(result.migrated).toBe(true);
    expect(result.recoveredFromCorrupt).toBe(false);
    expect(result.library.variants).toHaveLength(1);
    expect(result.library.defaultVariantId).toBe(LEGACY_RESUME_VARIANT_ID);
    expect(result.library.variants[0]?.id).toBe(LEGACY_RESUME_VARIANT_ID);
    expect(result.library.variants[0]?.name).toBe(LEGACY_RESUME_VARIANT_NAME);
    expect(result.library.variants[0]?.isDefault).toBe(true);
    expect(result.library.variants[0]?.profile).toEqual(gustavoProfile);
  });

  it("é idempotente quando a biblioteca já é válida", () => {
    const first = ensureResumeLibrary({ stored: null, fallbackProfile: gustavoProfile, now: NOW });
    const second = ensureResumeLibrary({
      stored: first.library,
      fallbackProfile: frontendOnlyProfile(),
      now: LATER,
    });
    expect(second.migrated).toBe(false);
    expect(second.library).toEqual(first.library);
  });

  it("envolve um CandidateProfile cru guardado como biblioteca", () => {
    const custom = validateCandidateProfile({ ...gustavoProfile, location: "Porto, Portugal" });
    const result = ensureResumeLibrary({ stored: custom, fallbackProfile: gustavoProfile, now: NOW });
    expect(result.migrated).toBe(true);
    expect(result.library.variants[0]?.profile.location).toBe("Porto, Portugal");
  });

  it("recupera dados corrompidos com o perfil de fallback", () => {
    const result = ensureResumeLibrary({
      stored: { version: 1, variants: "nope" },
      fallbackProfile: gustavoProfile,
      now: NOW,
    });
    expect(result.recoveredFromCorrupt).toBe(true);
    expect(result.library.variants).toHaveLength(1);
    expect(result.library.variants[0]?.profile).toEqual(gustavoProfile);
  });
});

describe("ResumeLibrary operations", () => {
  it("garante exactamente um default", () => {
    const library = createResumeLibraryFromProfile(gustavoProfile, { now: NOW });
    expect(library.variants.filter((variant) => variant.isDefault)).toHaveLength(1);
    expect(getDefaultResumeVariant(library).id).toBe(library.defaultVariantId);
  });

  it("cria uma segunda variante e troca o default", () => {
    const seeded = createResumeLibraryFromProfile(gustavoProfile, { now: NOW });
    const added = addResumeVariant(seeded, {
      profile: frontendOnlyProfile(),
      name: "Frontend React/Next.js",
      now: LATER,
      id: "rv_frontend",
      source: "manual",
    });
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    expect(added.library.variants).toHaveLength(2);
    expect(added.library.defaultVariantId).toBe(LEGACY_RESUME_VARIANT_ID);

    const switched = setDefaultResumeVariant(added.library, "rv_frontend", LATER);
    expect(switched.ok).toBe(true);
    if (!switched.ok) return;
    expect(switched.library.defaultVariantId).toBe("rv_frontend");
    expect(switched.library.variants.filter((variant) => variant.isDefault)).toHaveLength(1);
    expect(getDefaultResumeVariant(switched.library).name).toBe("Frontend React/Next.js");
  });

  it("renomeia sem alterar o perfil", () => {
    const seeded = createResumeLibraryFromProfile(gustavoProfile, { now: NOW });
    const renamed = renameResumeVariant(seeded, LEGACY_RESUME_VARIANT_ID, "Product Engineer", LATER);
    expect(renamed.ok).toBe(true);
    if (!renamed.ok) return;
    expect(renamed.library.variants[0]?.name).toBe("Product Engineer");
    expect(renamed.library.variants[0]?.profile).toEqual(gustavoProfile);
  });

  it("rejeita rename vazio", () => {
    const seeded = createResumeLibraryFromProfile(gustavoProfile, { now: NOW });
    const renamed = renameResumeVariant(seeded, LEGACY_RESUME_VARIANT_ID, "   ");
    expect(renamed.ok).toBe(false);
  });

  it("não exclui a única variante", () => {
    const seeded = createResumeLibraryFromProfile(gustavoProfile, { now: NOW });
    const deleted = deleteResumeVariant(seeded, LEGACY_RESUME_VARIANT_ID);
    expect(deleted.ok).toBe(false);
    if (deleted.ok) return;
    expect(deleted.error).toMatch(/único currículo/i);
    expect(deleted.library.variants).toHaveLength(1);
  });

  it("não exclui o default enquanto houver outras variantes", () => {
    const seeded = createResumeLibraryFromProfile(gustavoProfile, { now: NOW });
    const added = addResumeVariant(seeded, {
      profile: frontendOnlyProfile(),
      name: "Frontend React/Next.js",
      now: LATER,
      id: "rv_frontend",
    });
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    const deleted = deleteResumeVariant(added.library, LEGACY_RESUME_VARIANT_ID);
    expect(deleted.ok).toBe(false);
    if (deleted.ok) return;
    expect(deleted.error).toMatch(/padrão/i);
  });

  it("exclui uma variante não padrão", () => {
    const seeded = createResumeLibraryFromProfile(gustavoProfile, { now: NOW });
    const added = addResumeVariant(seeded, {
      profile: frontendOnlyProfile(),
      name: "Frontend React/Next.js",
      now: LATER,
      id: "rv_frontend",
    });
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    const deleted = deleteResumeVariant(added.library, "rv_frontend");
    expect(deleted.ok).toBe(true);
    if (!deleted.ok) return;
    expect(deleted.library.variants).toHaveLength(1);
    expect(deleted.library.defaultVariantId).toBe(LEGACY_RESUME_VARIANT_ID);
  });

  it("duplica o perfil actual sem o tornar default", () => {
    const seeded = createResumeLibraryFromProfile(gustavoProfile, { now: NOW });
    const duplicated = duplicateResumeVariant(seeded, LEGACY_RESUME_VARIANT_ID, {
      now: LATER,
      id: "rv_copy",
      name: "Product Engineer",
    });
    expect(duplicated.ok).toBe(true);
    if (!duplicated.ok) return;
    expect(duplicated.library.variants).toHaveLength(2);
    expect(duplicated.library.defaultVariantId).toBe(LEGACY_RESUME_VARIANT_ID);
    expect(duplicated.library.variants[1]?.profile).toEqual(gustavoProfile);
    expect(duplicated.library.variants[1]?.name).toBe("Product Engineer");
  });
});

describe("Job Match usa só o default", () => {
  it("avalia com o perfil da variante padrão", () => {
    const seeded = createResumeLibraryFromProfile(gustavoProfile, { now: NOW });
    const job = ingestApplyFlowJob({
      description: APPLY_POSTING,
      source: "paste",
      profile: getDefaultResumeVariant(seeded).profile,
      now: NOW,
    });
    expect(job.jobMatch.decision).toBe("apply");
  });

  it("mudar o default muda o perfil do próximo match, sem rescore silencioso", () => {
    const seeded = createResumeLibraryFromProfile(gustavoProfile, { now: NOW });
    const added = addResumeVariant(seeded, {
      profile: frontendOnlyProfile(),
      name: "Frontend React/Next.js",
      now: LATER,
      id: "rv_frontend",
    });
    expect(added.ok).toBe(true);
    if (!added.ok) return;

    const first = ingestApplyFlowJob({
      description: APPLY_POSTING,
      source: "paste",
      profile: getDefaultResumeVariant(added.library).profile,
      now: NOW,
      id: "job_before",
    });

    const switched = setDefaultResumeVariant(added.library, "rv_frontend", LATER);
    expect(switched.ok).toBe(true);
    if (!switched.ok) return;

    const second = ingestApplyFlowJob({
      description: APPLY_POSTING,
      source: "paste",
      profile: getDefaultResumeVariant(switched.library).profile,
      now: LATER,
      id: "job_after",
    });

    expect(first.jobMatch.score).not.toBe(second.jobMatch.score);
    expect(first.jobMatch.matchedSkills).toContain("Node.js");
    expect(second.jobMatch.matchedSkills).not.toContain("Node.js");
  });
});

describe("import / parse ResumeLibrary", () => {
  it("roundtrip da biblioteca versionada com kind dedicado", () => {
    const seeded = createResumeLibraryFromProfile(gustavoProfile, { now: NOW });
    const serialized = serializeResumeLibraryImport(seeded);
    expect((serialized as { kind: string; version: number }).kind).toBe("resume-library");
    expect((serialized as { version: number }).version).toBe(1);
    const parsed = parseResumeLibraryImport(serialized);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.kind).toBe("resume-library");
  });

  it("aceita export legado de CandidateProfile", () => {
    const parsed = parseResumeLibraryImport(gustavoProfile);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.kind).toBe("resume-profile");
  });

  it("não trata jobs v2 como biblioteca", () => {
    const r = parseApplyFlowDashboardImportJsonString(
      JSON.stringify({ version: 2, listings: [{ description: "React TypeScript Next.js Node.js" }] }),
      { profile: gustavoProfile, now: NOW },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.kind).toBe("jobs");
  });

  it("mantém import v1 de candidaturas", () => {
    const r = parseApplyFlowDashboardImportJsonString(
      JSON.stringify({
        version: 1,
        applications: [
          {
            id: "1",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-02T00:00:00.000Z",
            status: "reviewing",
            source: "linkedin",
          },
        ],
      }),
      { profile: gustavoProfile, now: NOW },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.kind).toBe("applications");
  });

  it("encaminha resume-library no parser do dashboard", () => {
    const seeded = createResumeLibraryFromProfile(gustavoProfile, { now: NOW });
    const r = parseApplyFlowDashboardImportJsonString(JSON.stringify(serializeResumeLibraryImport(seeded)), {
      profile: gustavoProfile,
      now: NOW,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.kind).toBe("resume-library");
  });

  it("rejeita JSON corrompido da biblioteca", () => {
    const parsed = parseResumeLibrary({ version: 1, defaultVariantId: "x", variants: [{ id: "x" }] });
    expect(parsed.ok).toBe(false);
  });
});
