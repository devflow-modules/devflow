import { describe, expect, it, vi } from "vitest";
import {
  createCalendarReadOnlyAdapterResult,
  createGmailReadOnlyAdapterResult,
} from "@devflow/career-sync";
import { executeApplyFlowProviderDerivedRuntimeBoundary } from "./provider-derived-runtime-boundary.js";

describe("executeApplyFlowProviderDerivedRuntimeBoundary", () => {
  it("orchestrates injected Gmail and Calendar executors", async () => {
    const executeGmail = vi.fn(async () =>
      createGmailReadOnlyAdapterResult({
        runtime: "nango",
        status: "completed",
        connectionVerified: true,
        processedMessageCount: 2,
      }),
    );
    const executeCalendar = vi.fn(async () =>
      createCalendarReadOnlyAdapterResult({
        runtime: "nango",
        status: "completed",
        connectionVerified: true,
        processedEventCount: 3,
      }),
    );

    const result = await executeApplyFlowProviderDerivedRuntimeBoundary({
      executeGmail,
      executeCalendar,
    });

    expect(result.status).toBe("completed");
    expect(result.processedMessageCount).toBe(2);
    expect(result.processedEventCount).toBe(3);
    expect(executeGmail).toHaveBeenCalledOnce();
    expect(executeCalendar).toHaveBeenCalledOnce();
  });
});
