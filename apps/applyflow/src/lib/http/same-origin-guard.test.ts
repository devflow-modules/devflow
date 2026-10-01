import { describe, expect, it } from "vitest";

import { enforceSameOriginMutatingRequest } from "./same-origin-guard";

function requestWithOrigin(origin: string | null): Request {
  const headers = new Headers();
  if (origin != null) headers.set("origin", origin);
  return new Request("http://127.0.0.1:3011/api/applyflow/v2/jobs", {
    method: "POST",
    headers,
  });
}

describe("enforceSameOriginMutatingRequest", () => {
  it("allows configured localhost Origin", async () => {
    const block = enforceSameOriginMutatingRequest(requestWithOrigin("http://127.0.0.1:3011"), {
      env: {
        NEXT_PUBLIC_APPLYFLOW_URL: "http://127.0.0.1:3011",
        NODE_ENV: "development",
      },
    });
    expect(block).toBeNull();
  });

  it("rejects foreign Origin", async () => {
    const block = enforceSameOriginMutatingRequest(requestWithOrigin("https://evil.example"), {
      env: {
        NEXT_PUBLIC_APPLYFLOW_URL: "http://127.0.0.1:3011",
        NODE_ENV: "development",
      },
    });
    expect(block?.status).toBe(403);
    expect(await block?.json()).toEqual({ error: "csrf_rejected" });
  });

  it("rejects missing Origin on hosted preview", async () => {
    const block = enforceSameOriginMutatingRequest(requestWithOrigin(null), {
      env: {
        NEXT_PUBLIC_APPLYFLOW_URL: "https://applyflow.example",
        VERCEL_ENV: "preview",
        VERCEL_URL: "applyflow.example",
      },
    });
    expect(block?.status).toBe(403);
  });

  it("allows missing Origin in local development", () => {
    const block = enforceSameOriginMutatingRequest(requestWithOrigin(null), {
      env: {
        NEXT_PUBLIC_APPLYFLOW_URL: "http://127.0.0.1:3011",
        NODE_ENV: "development",
      },
    });
    expect(block).toBeNull();
  });
});
