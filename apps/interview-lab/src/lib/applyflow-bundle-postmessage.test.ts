import { createCareerBundle, createCareerBundleHandshakeMessage } from "@devflow/career-core";
import { describe, expect, it } from "vitest";
import {
  APPLYFLOW_POSTMESSAGE_HANDOFF_WAIT_MS,
  APPLYFLOW_POSTMESSAGE_UNCONFIRMED_COPY,
  applyflowPostMessageHandoffStatus,
  evaluateApplyflowBundlePostMessage,
} from "./applyflow-bundle-postmessage";

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
    if (r.action === "accept") {
      expect(r.bundle.schemaVersion).toBe("1.0");
      expect(r.intent).toBe("import");
      expect(r.syncPreview.status).toBe("not_provided");
    }
  });

  it("aceita CareerBundle V1 mesmo com sidecar ApplyFlow V2 irmão", () => {
    const r = evaluateApplyflowBundlePostMessage(
      {
        origin: "http://localhost:3010",
        data: {
          type: "devflow.careerBundle.v1",
          source: "applyflow",
          payload: bundle,
          applyflowV2: { schemaVersion: "applyflow-v2-sidecar" },
        },
      },
      null,
    );
    expect(r.action).toBe("accept");
    if (r.action === "accept") {
      expect(r.bundle.schemaVersion).toBe("1.0");
      expect(r.applyflowV2?.schemaVersion).toBe("applyflow-v2-sidecar");
    }
  });

  it("mostra o fallback existente quando a transferência não é confirmada", () => {
    expect(APPLYFLOW_POSTMESSAGE_HANDOFF_WAIT_MS).toBe(8500);
    expect(applyflowPostMessageHandoffStatus({ received: true, waitExpired: false, practiceIntent: true })).toEqual({
      title: "CareerBundle received from ApplyFlow.",
      detail: "",
    });
    expect(applyflowPostMessageHandoffStatus({ received: false, waitExpired: false, practiceIntent: true }).detail).toBe(
      "Opening practice for selected role…",
    );
    const expired = applyflowPostMessageHandoffStatus({ received: false, waitExpired: true, practiceIntent: true });
    expect(expired.detail).toBe(APPLYFLOW_POSTMESSAGE_UNCONFIRMED_COPY);
    expect(expired.detail).toContain("Import from clipboard");
  });

  it("accepts practice intent with selectedApplicationId", () => {
    const msg = createCareerBundleHandshakeMessage(bundle, {
      intent: "practice",
      selectedApplicationId: "row-1",
    });
    const r = evaluateApplyflowBundlePostMessage({ origin: "http://localhost:3010", data: msg }, null);
    expect(r.action).toBe("accept");
    if (r.action === "accept") {
      expect(r.intent).toBe("practice");
      expect(r.selectedApplicationId).toBe("row-1");
    }
  });
});
