import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { validateWhatsappCloudCredentials } from "../validateWhatsappCloudCredentials";

describe("validateWhatsappCloudCredentials", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    delete process.env.WHATSAPP_SKIP_CLOUD_CREDENTIAL_VALIDATE;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("retorna ok quando Graph devolve 200 com id coerente", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ id: "123", display_phone_number: "+351 910 000 000" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    const r = await validateWhatsappCloudCredentials("123", "EAABxxx");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.displayPhoneNumber).toContain("910");
  });

  it("retorna PHONE_NOT_FOUND em 404", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "not found" } }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    );
    const r = await validateWhatsappCloudCredentials("999", "tok");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("PHONE_NOT_FOUND");
  });

  it("retorna PERMISSION_DENIED em 401", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "Invalid OAuth", code: 190 } }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    );
    const r = await validateWhatsappCloudCredentials("123", "bad");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("PERMISSION_DENIED");
  });

  it("com WHATSAPP_SKIP_CLOUD_CREDENTIAL_VALIDATE=1 não chama fetch", async () => {
    process.env.WHATSAPP_SKIP_CLOUD_CREDENTIAL_VALIDATE = "1";
    const r = await validateWhatsappCloudCredentials("x", "y");
    expect(r.ok).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("com token __E2E_WHATSAPP_FORCE_INVALID__ falha sem chamar fetch (ambiente de teste)", async () => {
    const r = await validateWhatsappCloudCredentials("1", "__E2E_WHATSAPP_FORCE_INVALID__");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("PERMISSION_DENIED");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("token E2E falha mesmo com skip ativo (prioridade sobre skip)", async () => {
    process.env.WHATSAPP_SKIP_CLOUD_CREDENTIAL_VALIDATE = "1";
    const r = await validateWhatsappCloudCredentials("1", "__E2E_WHATSAPP_FORCE_INVALID__");
    expect(r.ok).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
});
