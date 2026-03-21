import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { MemoryWhatsappOnboardingStateRepository } from "../whatsappOnboardingState.memory";
import {
  setOnboardingStateRepositoryForTests,
  getOnboardingStateRepository,
} from "../whatsappOnboarding.persistence";
import { whatsappOnboardingService } from "../whatsappOnboarding.service";
import { LastOperation, LastOperationStatus } from "../whatsappOnboarding.operational.enums";

describe("onboarding persistence + fetch", () => {
  const mem = new MemoryWhatsappOnboardingStateRepository();

  beforeEach(() => {
    mem.clear();
    setOnboardingStateRepositoryForTests(mem);
    vi.stubEnv("META_WABA_ID", "waba-test");
    vi.stubEnv("META_PHONE_NUMBER_ID", "phone-test");
    vi.stubEnv("META_SYSTEM_USER_TOKEN", "token-test");
    vi.stubEnv("META_API_VERSION", "v21.0");
  });

  afterEach(() => {
    setOnboardingStateRepositoryForTests(null);
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("request-code persiste codeRequestedAt após sucesso", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/waba-test?")) {
          return Promise.resolve({
            ok: true,
            text: async () => JSON.stringify({ id: "waba-test" }),
          });
        }
        if (url.includes("/phone-test/request_code")) {
          return Promise.resolve({
            ok: true,
            text: async () => JSON.stringify({ success: true }),
          });
        }
        return Promise.resolve({
          ok: false,
          text: async () => "{}",
        });
      })
    );

    await whatsappOnboardingService.requestVerificationCode("SMS", "pt_BR");
    const row = await getOnboardingStateRepository().findByWabaAndPhone(
      "waba-test",
      "phone-test"
    );
    expect(row?.codeRequestedAt).toBeTruthy();
    expect(row?.lastOperation).toBe(LastOperation.REQUEST_CODE);
    expect(row?.lastOperationStatus).toBe(LastOperationStatus.SUCCESS);
  });

  it("erro Meta persiste lastMetaError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/waba-test?")) {
          return Promise.resolve({
            ok: true,
            text: async () => JSON.stringify({ id: "waba-test" }),
          });
        }
        if (url.includes("/request_code")) {
          return Promise.resolve({
            ok: false,
            status: 400,
            text: async () =>
              JSON.stringify({
                error: { message: "fail", code: 136024 },
              }),
          });
        }
        return Promise.resolve({ ok: false, status: 500, text: async () => "{}" });
      })
    );

    await expect(
      whatsappOnboardingService.requestVerificationCode("SMS", "pt_BR")
    ).rejects.toThrow();
    const row = await getOnboardingStateRepository().findByWabaAndPhone(
      "waba-test",
      "phone-test"
    );
    expect(row?.lastMetaErrorCode).toBe(136024);
    expect(row?.lastOperationStatus).toBe(LastOperationStatus.FAILURE);
  });

  it("register idempotente quando Meta retorna already registered", async () => {
    const bodies = [
      {
        id: "phone-test",
        platform_type: "NOT_APPLICABLE",
        code_verification_status: "VERIFIED",
      },
      { error: { message: "This phone number is already been registered" } },
      {
        id: "phone-test",
        platform_type: "NOT_APPLICABLE",
        code_verification_status: "VERIFIED",
      },
    ];
    let n = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => {
        const i = n++;
        const b = bodies[Math.min(i, 2)];
        if (i === 1) {
          return Promise.resolve({
            ok: false,
            status: 400,
            text: async () => JSON.stringify(b),
          });
        }
        return Promise.resolve({
          ok: true,
          text: async () => JSON.stringify(b),
        });
      })
    );

    const r = await whatsappOnboardingService.registerPhoneNumber("123456");
    expect(r.success).toBe(true);
    expect(r.alreadyRegistered).toBe(true);
    expect(r.idempotent).toBe(true);
    const row = await getOnboardingStateRepository().findByWabaAndPhone(
      "waba-test",
      "phone-test"
    );
    expect(row?.registeredAt).toBeTruthy();
    expect(row?.lastOperationStatus).toBe(LastOperationStatus.SKIPPED_IDEMPOTENT);
  });
});
