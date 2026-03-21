import { describe, it, expect } from "vitest";
import { buildOperationalHealth } from "../whatsappOnboarding.health.mapper";
import { BlockedReason, OnboardingCurrentStage } from "../whatsappOnboarding.operational.enums";

describe("buildOperationalHealth", () => {
  it("bloqueia sem token", () => {
    const h = buildOperationalHealth({
      envHasToken: false,
      envHasWaba: true,
      envHasVerifyToken: true,
      tokenOk: false,
      wabaOk: false,
      businessConfigured: false,
      businessId: null,
      wabaId: "w",
      phone: null,
      phoneNumbersCount: 0,
      persisted: null,
      persistenceOk: true,
      listOrStatusError: null,
    });
    expect(h.blockedReason).toBe(BlockedReason.MISSING_ENV);
    expect(h.canRequestCode).toBe(false);
  });

  it("cloud API pronto", () => {
    const h = buildOperationalHealth({
      envHasToken: true,
      envHasWaba: true,
      envHasVerifyToken: true,
      tokenOk: true,
      wabaOk: true,
      businessConfigured: false,
      businessId: null,
      wabaId: "w",
      phone: {
        id: "p1",
        code_verification_status: "VERIFIED",
        platform_type: "CLOUD_API",
      },
      phoneNumbersCount: 1,
      persisted: null,
      persistenceOk: true,
      listOrStatusError: null,
    });
    expect(h.readyToSendMessages).toBe(true);
    expect(h.canRegister).toBe(false);
  });

  it("verify liberado com codeRequestedAt", () => {
    const h = buildOperationalHealth({
      envHasToken: true,
      envHasWaba: true,
      envHasVerifyToken: true,
      tokenOk: true,
      wabaOk: true,
      businessConfigured: true,
      businessId: "b",
      wabaId: "w",
      phone: {
        id: "p1",
        code_verification_status: "NOT_VERIFIED",
        platform_type: "NOT_APPLICABLE",
      },
      phoneNumbersCount: 1,
      persisted: {
        id: "1",
        wabaId: "w",
        phoneNumberId: "p1",
        businessId: "b",
        codeRequestedAt: new Date(),
        codeVerifiedAt: null,
        registeredAt: null,
        lastMetaErrorCode: null,
        lastMetaErrorMessage: null,
        lastOperation: "REQUEST_CODE",
        lastOperationStatus: "SUCCESS",
        lastSuccessAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      persistenceOk: true,
      listOrStatusError: null,
    });
    expect(h.canVerifyCode).toBe(true);
    expect(h.canRegister).toBe(false);
    expect(h.currentStage).toBe(OnboardingCurrentStage.CODE_REQUESTED);
  });
});
