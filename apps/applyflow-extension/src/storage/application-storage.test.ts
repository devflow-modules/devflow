import { beforeEach, describe, expect, it } from "vitest";

import {
  EXPORT_FORBIDDEN_PROPERTY_NAMES,
  applicationsToCsv,
} from "./application-history-export.js";
import { chromeStorageBag } from "../test/chrome-storage-mock.js";
import {
  STORAGE_APPLICATION_JSON_VERSION,
  clearApplications,
  deleteApplication,
  findApplicationByNormalizedJobUrl,
  getApplications,
  saveApplication,
  updateApplicationNotes,
  updateApplicationStatus,
} from "./application-storage.js";
import { STORAGE_APPLICATIONS_KEY } from "./storage-types.js";

describe("application-storage", () => {
  beforeEach(() => {
    chromeStorageBag.clear();
  });

  it("getApplications retorna lista vazia quando não há storage", async () => {
    await expect(getApplications()).resolves.toEqual([]);
    await expect(findApplicationByNormalizedJobUrl("https://linkedin.com/jobs/view/123")).resolves.toBeNull();
  });

  it("saveApplication cria registo ordenado pelo mais recente", async () => {
    const a = await saveApplication({
      status: "reviewing",
      jobTitle: "Engenheiro",
      companyName: "ACME",
      jobUrl: "https://linkedin.com/jobs/view/1",
      fitScore: 42,
      fieldsDetected: 3,
      fieldsFilled: 1,
      blockedCount: 0,
      failedCount: 0,
    });
    expect(a.id.length).toBeGreaterThan(4);
    expect(a.source).toBe("linkedin");
    expect(a.status).toBe("reviewing");
    const list = await getApplications();
    expect(list).toHaveLength(1);
    expect(list[0]!.jobTitle).toBe("Engenheiro");

    const raw = chromeStorageBag.get(STORAGE_APPLICATIONS_KEY) as { version: number; applications: unknown[] };
    expect(raw.version).toBe(STORAGE_APPLICATION_JSON_VERSION);
    const persisted = JSON.stringify(raw);
    expect(persisted).not.toContain("suggestedValue");
    expect(persisted).not.toContain("cover letter texto");
  });

  it("saveApplication deduplica por jobUrl normalizada", async () => {
    const first = await saveApplication({
      jobUrl: "https://linkedin.com/jobs/view/x#frag",
      jobTitle: "A",
      status: "reviewing",
      fieldsDetected: 1,
    });
    const second = await saveApplication({
      jobUrl: "https://linkedin.com/jobs/view/x",
      jobTitle: "B",
      status: "applied",
      fieldsDetected: 4,
      fieldsFilled: 2,
    });
    expect(second.id).toBe(first.id);
    const list = await getApplications();
    expect(list).toHaveLength(1);
    expect(list[0]!.jobTitle).toBe("B");
    expect(list[0]!.status).toBe("applied");
    expect(list[0]!.fieldsDetected).toBe(4);

    await expect(findApplicationByNormalizedJobUrl("https://linkedin.com/jobs/view/x")).resolves.toMatchObject({
      id: first.id,
    });
  });

  it("saveApplication permite registos diferentes sem URL (sem dedupe)", async () => {
    await saveApplication({ jobTitle: "Sem URL 1", status: "ignored" });
    await saveApplication({ jobTitle: "Sem URL 2", status: "ignored" });
    const list = await getApplications();
    expect(list.length).toBeGreaterThanOrEqual(2);
    expect(new Set(list.map((a) => a.id)).size).toBe(list.length);
  });

  it("updateApplicationStatus altera estado", async () => {
    const a = await saveApplication({ jobUrl: "https://linkedin.com/z", status: "reviewing" });
    const updated = await updateApplicationStatus(a.id, "waiting_response");
    expect(updated?.status).toBe("waiting_response");

    await expect(findApplicationByNormalizedJobUrl("https://linkedin.com/z")).resolves.toMatchObject({
      status: "waiting_response",
    });
  });

  it("updateApplicationNotes altera notas", async () => {
    const a = await saveApplication({ jobUrl: "https://linkedin.com/n", notes: "a" });
    const u = await updateApplicationNotes(a.id, " nova nota ");
    expect(u?.notes).toContain("nova nota");

    await expect(findApplicationByNormalizedJobUrl("https://linkedin.com/n")).resolves.toMatchObject({
      notes: expect.stringContaining("nova nota"),
    });
  });

  it("deleteApplication remove registro", async () => {
    const a = await saveApplication({ jobUrl: "https://linkedin.com/del", status: "ignored" });
    await deleteApplication(a.id);
    await expect(getApplications()).resolves.toEqual([]);
  });

  it("saveApplication persiste jobMeta (dedupe skills)", async () => {
    await saveApplication({
      jobUrl: "https://linkedin.com/jobs/meta",
      status: "reviewing",
      jobMeta: {
        seniority: "senior",
        roleType: "frontend",
        workModel: "remote",
        contractType: "pj",
        englishRequired: true,
        detectedSkills: ["React", "react", "TypeScript"],
        salaryMentioned: true,
      },
    });
    const list = await getApplications();
    expect(list[0]?.jobMeta?.seniority).toBe("senior");
    expect(list[0]?.jobMeta?.roleType).toBe("frontend");
    expect(list[0]?.jobMeta?.detectedSkills).toEqual(expect.arrayContaining(["React", "TypeScript"]));
    expect(list[0]?.jobMeta?.detectedSkills?.length).toBe(2);
  });

  it("clearApplications remove a chave", async () => {
    await saveApplication({ jobUrl: "https://linkedin.com/cl", status: "reviewing" });
    await clearApplications();
    expect(chromeStorageBag.has(STORAGE_APPLICATIONS_KEY)).toBe(false);
  });

  it("mantém no máximo 500 registros", async () => {
    for (let i = 0; i < 505; i++) {
      await saveApplication({
        jobUrl: `https://linkedin.com/jobs/unique_${i}`,
        jobTitle: `T${i}`,
        status: "reviewing",
      });
    }
    const list = await getApplications();
    expect(list.length).toBe(500);
  });
});

describe("applications export CSV — sem campos sensíveis declarados", () => {
  it("applicationsToCsv não inclui propriedades proibidas", () => {
    const apps = [
      {
        id: "id-1",
        createdAt: "2026-05-07T12:00:00.000Z",
        updatedAt: "2026-05-07T12:00:00.000Z",
        source: "linkedin" as const,
        jobTitle: "Dev",
        companyName: "Co",
        jobUrl: "https://linkedin.com/jobs/1",
        status: "reviewing" as const,
        fitScore: 10,
        fieldsDetected: 2,
        fieldsFilled: 1,
        blockedCount: 0,
        failedCount: 0,
        notes: "",
        jobMeta: {
          seniority: "mid",
          roleType: "backend",
          workModel: "hybrid",
          contractType: "clt",
          englishRequired: true,
          detectedSkills: ["Java", "PostgreSQL"],
        },
      },
    ];
    const csv = applicationsToCsv(apps);
    for (const forbidden of EXPORT_FORBIDDEN_PROPERTY_NAMES) {
      expect(csv.toLowerCase()).not.toContain(forbidden.toLowerCase());
    }
    expect(csv).toContain("createdAt");
    expect(csv).toContain("linkedin");
    expect(csv).toContain("seniority");
    expect(csv).toContain("roleType");
    expect(csv).toContain("detectedSkills");
    expect(csv).toContain("mid");
    expect(csv).toContain("backend");
    expect(csv).toContain("Java|PostgreSQL");
    expect(csv).not.toContain("id-1"); // CSV não inclui coluna id
    const header = csv.trim().split("\n")[0]!;
    expect(header.toLowerCase()).not.toContain("jobtext");
    expect(header.toLowerCase()).not.toContain("rawsnippet");
  });
});
