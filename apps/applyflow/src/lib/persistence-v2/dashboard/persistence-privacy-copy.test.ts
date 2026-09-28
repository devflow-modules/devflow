import { describe, expect, it } from "vitest";

import {
  persistencePrivacyCopyForMode,
  resolveDashboardPrivacyMode,
} from "./persistence-privacy-copy";

describe("persistencePrivacyCopyForMode", () => {
  it("keeps local-first messaging only for v1", () => {
    const copy = persistencePrivacyCopyForMode("v1");
    expect(copy.title.toLowerCase()).toContain("local-first");
    expect(copy.body.toLowerCase()).toContain("navegador");
    expect(copy.storageLabel).toBe("localStorage");
  });

  it("v2_active must not claim browser-only canonical storage", () => {
    const copy = persistencePrivacyCopyForMode("v2_active");
    expect(copy.title.toLowerCase()).not.toContain("local-first");
    expect(copy.body.toLowerCase()).not.toMatch(/ficam neste navegador/);
    expect(copy.body.toLowerCase()).toContain("nuvem");
    expect(copy.body.toLowerCase()).toMatch(/não é a fonte canónica|nao e a fonte canonica/);
    expect(copy.storageLabel).toBeUndefined();
  });

  it("v2_offering explains migration/activation without silent promotion", () => {
    const copy = persistencePrivacyCopyForMode("v2_offering");
    expect(copy.body.toLowerCase()).toMatch(/ativar|migrar/);
    expect(copy.body.toLowerCase()).toMatch(/não promove|nao promove/);
  });

  it("v2_read_only keeps cloud readable and denies writes without local fallback", () => {
    const copy = persistencePrivacyCopyForMode("v2_read_only");
    expect(copy.body.toLowerCase()).toMatch(/consulta|leitura/);
    expect(copy.body.toLowerCase()).toMatch(/desativadas|desativad/);
    expect(copy.body.toLowerCase()).not.toMatch(/ficam neste navegador/);
  });

  it("v2_paused must not imply local fallback as canonical", () => {
    const copy = persistencePrivacyCopyForMode("v2_paused");
    expect(copy.body.toLowerCase()).toMatch(/não foi usado como substituto|nao foi usado como substituto/);
    expect(copy.body.toLowerCase()).not.toMatch(/ficam neste navegador/);
  });
});

describe("resolveDashboardPrivacyMode", () => {
  it("maps cloud + full write to v2_active", () => {
    expect(
      resolveDashboardPrivacyMode({
        usesCloudPersistence: true,
        writeCapability: "full",
        emptyActivationEligible: false,
        activationPendingNotice: false,
      }),
    ).toBe("v2_active");
  });

  it("maps cloud + read_only to v2_read_only", () => {
    expect(
      resolveDashboardPrivacyMode({
        usesCloudPersistence: true,
        writeCapability: "read_only",
        emptyActivationEligible: false,
        activationPendingNotice: false,
      }),
    ).toBe("v2_read_only");
  });

  it("maps offering/activation pending to v2_offering", () => {
    expect(
      resolveDashboardPrivacyMode({
        usesCloudPersistence: false,
        writeCapability: "full",
        emptyActivationEligible: true,
        activationPendingNotice: false,
      }),
    ).toBe("v2_offering");
    expect(
      resolveDashboardPrivacyMode({
        usesCloudPersistence: false,
        writeCapability: "full",
        emptyActivationEligible: false,
        activationPendingNotice: true,
      }),
    ).toBe("v2_offering");
  });

  it("defaults to v1 when local anonymous", () => {
    expect(
      resolveDashboardPrivacyMode({
        usesCloudPersistence: false,
        writeCapability: "full",
        emptyActivationEligible: false,
        activationPendingNotice: false,
      }),
    ).toBe("v1");
  });
});
