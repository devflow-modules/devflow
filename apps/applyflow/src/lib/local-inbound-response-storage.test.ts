import { afterEach, describe, expect, it, vi } from "vitest";
import type { ResponseDetection } from "@devflow/applyflow-core";

import {
  APPLYFLOW_INBOUND_RESPONSES_STORAGE_KEY,
  loadDashboardInboundResponses,
  persistDashboardInboundResponses,
} from "./local-inbound-response-storage";

const detection: ResponseDetection = {
  id: "detect-legacy",
  emailId: "11111111111111111111111111111111",
  headline: "Empresa enviou uma mensagem",
  matchStatus: "unmatched",
  matchConfidence: "low",
  matchEvidence: [],
  classification: "unknown",
  classificationConfidence: "low",
  classificationEvidence: [],
  suggestedStatus: null,
  pipelineChange: false,
  state: "pending_review",
  detectedAt: "2026-09-15T18:00:00.000Z",
  receivedAt: "2026-09-15T18:00:00.000Z",
  senderDomain: "jobs.example",
  autoApply: false,
  reviewRequired: true,
};

function stubStorage(initial?: Record<string, string>) {
  const storage: Record<string, string> = { ...initial };
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => (key in storage ? storage[key]! : null),
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
    },
  } as Window & typeof globalThis);
  return storage;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("local inbound response storage identity", () => {
  it("keeps version 1 detections and can stamp legacy account ownership without reclassifying them", () => {
    const storage = stubStorage({
      [APPLYFLOW_INBOUND_RESPONSES_STORAGE_KEY]: JSON.stringify({
        version: 1,
        savedAt: "2026-09-15T18:00:00.000Z",
        detections: [detection],
      }),
    });
    const loaded = loadDashboardInboundResponses();
    expect(loaded.status).toBe("ok");
    expect(loaded.detections).toHaveLength(1);
    expect(loaded.detections[0]?.state).toBe("pending_review");
    expect(loaded.legacyClosedLoopAccountScope).toBeUndefined();

    persistDashboardInboundResponses(loaded.detections, {
      legacyClosedLoopAccountScope: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    });
    const after = loadDashboardInboundResponses();
    expect(after.detections[0]).toEqual(loaded.detections[0]);
    expect(after.legacyClosedLoopAccountScope).toBe("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");

    persistDashboardInboundResponses(after.detections);
    const preserved = JSON.parse(storage[APPLYFLOW_INBOUND_RESPONSES_STORAGE_KEY]!) as {
      version: number;
      detections: ResponseDetection[];
      legacyClosedLoopAccountScope?: string;
    };
    expect(preserved.version).toBe(1);
    expect(preserved.detections[0]?.emailId).toBe(detection.emailId);
    expect(preserved.detections[0]?.state).toBe("pending_review");
    expect(preserved.legacyClosedLoopAccountScope).toBe("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
  });

  it("does not invent a legacy owner when persisting detections from another account", () => {
    stubStorage({
      [APPLYFLOW_INBOUND_RESPONSES_STORAGE_KEY]: JSON.stringify({
        version: 1,
        savedAt: "2026-09-15T18:00:00.000Z",
        detections: [detection],
      }),
    });
    persistDashboardInboundResponses([detection]);
    const loaded = loadDashboardInboundResponses();
    expect(loaded.detections[0]?.emailId).toBe(detection.emailId);
    expect(loaded.detections[0]?.state).toBe("pending_review");
    expect(loaded.legacyClosedLoopAccountScope).toBeUndefined();
  });
});
