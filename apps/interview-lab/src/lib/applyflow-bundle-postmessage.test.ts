import { createCareerBundle } from "@devflow/career-core";
import { describe, expect, it } from "vitest";
import { evaluateApplyflowBundlePostMessage } from "./applyflow-bundle-postmessage";

describe("evaluateApplyflowBundlePostMessage", () => {
  const bundle = createCareerBundle([]);

  it("ignores wrong origin", () => {
    const r = evaluateApplyflowBundlePostMessage(
      { origin: "https://evil.test", data: { type: "devflow.careerBundle.v1", source: "applyflow", payload: bundle } },
      "https://apply.example.com",
    );
    expect(r.action).toBe("ignore");
  });

  it("ignores wrong shape from allowed origin", () => {
    const r = evaluateApplyflowBundlePostMessage(
      { origin: "http://localhost:3010", data: { hello: 1 } },
      null,
    );
    expect(r.action).toBe("ignore");
  });

  it("returns invalid_bundle for bad payload from allowed origin", () => {
    const r = evaluateApplyflowBundlePostMessage(
      { origin: "http://localhost:3010", data: { type: "devflow.careerBundle.v1", source: "applyflow", payload: {} } },
      null,
    );
    expect(r.action).toBe("invalid_bundle");
  });

  it("accepts valid handshake from allowed origin", () => {
    const msg = {
      type: "devflow.careerBundle.v1" as const,
      source: "applyflow" as const,
      payload: bundle,
    };
    const r = evaluateApplyflowBundlePostMessage({ origin: "http://localhost:3010", data: msg }, null);
    expect(r.action).toBe("accept");
    if (r.action === "accept") expect(r.bundle.schemaVersion).toBe("1.0");
  });
});
