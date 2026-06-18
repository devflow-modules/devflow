import { describe, expect, it } from "vitest";
import { handleLibreChatTransportRequest } from "./boundary";

const validCareerBody = {
  action: "prepare_interview" as const,
  message: "Focus on frontend architecture",
  explicitConsent: true as const,
  context: {
    careerBundle: {
      schemaVersion: "1.0" as const,
      exportedAt: "2026-06-16T12:00:00.000Z",
      sourceProduct: "applyflow" as const,
      applications: [
        {
          id: "app-1",
          company: "Acme",
          role: "Backend Engineer",
          source: "linkedin" as const,
          requiredSkills: ["TypeScript"],
          status: "applied" as const,
        },
      ],
    },
    selectedSignalIds: [],
  },
};

describe("librechat transport boundary", () => {
  it("delivers a valid UI request to the existing career chat boundary", async () => {
    const result = await handleLibreChatTransportRequest(
      {
        body: validCareerBody,
        headers: new Headers(),
        requestedAt: "2026-06-16T12:00:00.000Z",
      },
      { LIBRECHAT_ADAPTER_ENABLED: "true", LIBRECHAT_TRANSPORT_ENABLED: "false" },
    );

    expect(result.httpStatus).toBe(200);
    expect("status" in result.payload && result.payload.status).toBe("completed");
    expect("toolProposals" in result.payload && result.payload.toolProposals.length).toBeGreaterThan(0);
  });

  it("blocks when adapter flag is disabled", async () => {
    const result = await handleLibreChatTransportRequest(
      {
        body: validCareerBody,
        headers: new Headers(),
        requestedAt: "2026-06-16T12:00:00.000Z",
      },
      { LIBRECHAT_ADAPTER_ENABLED: "false", LIBRECHAT_TRANSPORT_ENABLED: "false" },
    );

    expect(result.httpStatus).toBe(403);
  });

  it("blocks client Authorization when transport is disabled", async () => {
    const result = await handleLibreChatTransportRequest(
      {
        body: validCareerBody,
        headers: new Headers({ Authorization: "Bearer secret" }),
        requestedAt: "2026-06-16T12:00:00.000Z",
      },
      { LIBRECHAT_ADAPTER_ENABLED: "true", LIBRECHAT_TRANSPORT_ENABLED: "false" },
    );

    expect(result.httpStatus).toBe(403);
    expect("error" in result.payload && result.payload.error?.code).toBe(
      "client_authorization_rejected",
    );
  });

  it("returns transport envelope for authenticated LibreChat server requests", async () => {
    const result = await handleLibreChatTransportRequest(
      {
        body: validCareerBody,
        headers: new Headers({ Authorization: "Bearer secret" }),
        requestedAt: "2026-06-16T12:00:00.000Z",
      },
      {
        LIBRECHAT_ADAPTER_ENABLED: "true",
        LIBRECHAT_TRANSPORT_ENABLED: "true",
        LIBRECHAT_BASE_URL: "https://librechat.example",
        LIBRECHAT_API_KEY: "secret",
      },
      async () => jsonResponse(200),
    );

    expect(result.httpStatus).toBe(200);
    expect("format" in result.payload && result.payload.format).toBe("career_chat");
    expect("openAi" in result.payload).toBe(false);
    expect("careerChat" in result.payload && result.payload.careerChat.toolProposals.length).toBeGreaterThan(
      0,
    );
  });

  it("blocks unconfigured transport for LibreChat server requests", async () => {
    const result = await handleLibreChatTransportRequest(
      {
        body: validCareerBody,
        headers: new Headers({ Authorization: "Bearer secret" }),
        requestedAt: "2026-06-16T12:00:00.000Z",
      },
      {
        LIBRECHAT_ADAPTER_ENABLED: "true",
        LIBRECHAT_TRANSPORT_ENABLED: "true",
        LIBRECHAT_BASE_URL: "",
        LIBRECHAT_API_KEY: "",
      },
    );

    expect(result.httpStatus).toBe(503);
    expect("error" in result.payload && result.payload.error?.code).toBe("transport_not_configured");
  });

  it("never serializes secrets in transport responses", async () => {
    const result = await handleLibreChatTransportRequest(
      {
        body: validCareerBody,
        headers: new Headers({ Authorization: "Bearer super-secret" }),
        requestedAt: "2026-06-16T12:00:00.000Z",
      },
      {
        LIBRECHAT_ADAPTER_ENABLED: "true",
        LIBRECHAT_TRANSPORT_ENABLED: "true",
        LIBRECHAT_BASE_URL: "https://librechat.example",
        LIBRECHAT_API_KEY: "super-secret",
      },
      async () => jsonResponse(200),
    );

    expect(JSON.stringify(result.payload)).not.toContain("super-secret");
  });
});

function jsonResponse(status: number): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve({}),
  } as unknown as Response;
}
