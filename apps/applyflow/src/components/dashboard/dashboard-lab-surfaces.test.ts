import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { shouldShowInterviewLabExport, shouldShowProviderConsentOnDashboard } from "./dashboard-lab-surfaces";

describe("dashboard lab surfaces", () => {
  it("monta o consent Nango real e omite o mock de preview", () => {
    expect(shouldShowProviderConsentOnDashboard()).toBe(true);
    const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "dashboard-client.tsx"), "utf8");
    expect(source).toContain("ProviderConsentConfirmationPanel");
    expect(source).not.toContain("ProviderConsentMockPanel");
    expect(source).not.toContain("Provider consent preview");
  });

  it("esconde CareerBundle/Interview Lab quando só há Inbox", () => {
    expect(shouldShowInterviewLabExport(0)).toBe(false);
    expect(shouldShowInterviewLabExport(2)).toBe(true);
  });

  it("não mistura vaga salva com candidatura nem esconde recuperação", () => {
    const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "dashboard-client.tsx"), "utf8");
    expect(source).not.toContain("projectJobForFunnel");
    expect(source).not.toContain("Nenhum dado carregado");
    expect(source).toContain("dashboardWorkFlags");
    expect(source).toContain("DASHBOARD_APPLICATIONS_TITLE");
    expect(source).toContain("InboundApplicationResponsePanel");
    expect(source).toContain("JobsStorageRecoveryBanner");
    expect(source).toContain("status={jobsStorageStatus}");
    expect(source).toContain("ResumeLibraryRecoveryBanner");
    expect(source).toContain("DASHBOARD_PREPARE_INTERVIEW");
    expect(source).toContain("DASHBOARD_PREPARE_INTERVIEW_HINT");
    expect(source).toContain("DASHBOARD_OPEN_INTERVIEW_LAB_HINT");
  });
});
