import { describe, expect, it } from "vitest";
import { GET, POST } from "./route";

function postFeedback(body: unknown) {
  return POST(
    new Request("http://localhost/career-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }) as never,
  );
}

describe("POST /career-feedback", () => {
  it("discards feedback without consent", async () => {
    const res = await postFeedback({ rating: "helpful", category: "resume", consentToStore: false });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("discarded");
    expect(body.persisted).toBe(false);
    expect(body.consentRespected).toBe(true);
    expect(body.reviewRequired).toBe(true);
    expect(body.hasToken).toBe(false);
    expect(res.headers.get("x-career-correlation-id")).toBe(body.correlationId);
  });

  it("rejects an invalid payload with 400", async () => {
    const res = await postFeedback({ rating: "nope" });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.status).toBe("rejected");
    expect(body.errorCode).toBe("invalid_request");
  });

  it("rejects invalid JSON safely", async () => {
    const res = await POST(
      new Request("http://localhost/career-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{not json",
      }) as never,
    );
    expect(res.status).toBe(400);
  });

  it("rejects GET with 405", async () => {
    const res = GET();
    expect(res.status).toBe(405);
  });
});
