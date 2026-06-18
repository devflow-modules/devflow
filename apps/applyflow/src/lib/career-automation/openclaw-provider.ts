import {
  invokeCareerTool,
  type CareerAutomationAdapter,
  type CareerAutomationAdapterRequest,
  type CareerAutomationAdapterResponse,
} from "@devflow/career-core";

/**
 * Optional, feature-flagged OpenClaw automation adapter (server-side only).
 *
 * This PR ships a STABLE adapter interface and a controlled, single-execution
 * boundary. A real external OpenClaw integration is deferred: this adapter does
 * not open sockets, schedule jobs, retry indefinitely, stream, or invoke external
 * callbacks. It executes exactly one permitted, non-destructive tool via the shared
 * pure tool engine inside an explicit timeout. Secrets stay server-side and never
 * reach the client. `executedExternally` remains false until a real external call
 * is implemented behind this same boundary.
 */
export type OpenClawCareerAutomationAdapterOptions = {
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
};

class OpenClawCareerAutomationAdapter implements CareerAutomationAdapter {
  public readonly provider = "openclaw" as const;

  constructor(private readonly options: OpenClawCareerAutomationAdapterOptions) {}

  async execute(input: CareerAutomationAdapterRequest): Promise<CareerAutomationAdapterResponse> {
    if (this.options.apiKey.length === 0 || this.options.baseUrl.length === 0) {
      return {
        ok: false,
        externalCall: false,
        data: {},
        error: {
          code: "unsupported_automation_provider",
          message: "OpenClaw adapter is not configured.",
        },
      };
    }

    const startedAt = Date.now();
    const toolResult = await withTimeout(
      Promise.resolve(invokeCareerTool(input.toolInvocation, input.requestedAt)),
      this.options.timeoutMs,
    );

    if (!toolResult || toolResult.status !== "completed") {
      return {
        ok: false,
        externalCall: false,
        data: {},
        toolResult: toolResult ?? undefined,
        durationMs: Date.now() - startedAt,
        error: {
          code: "automation_execution_failed",
          message: "OpenClaw single-purpose execution did not complete.",
        },
      };
    }

    return {
      ok: true,
      externalCall: false,
      data: toolResult.data,
      toolResult,
      durationMs: Date.now() - startedAt,
    };
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

export function createOpenClawCareerAutomationAdapter(
  options: OpenClawCareerAutomationAdapterOptions,
): CareerAutomationAdapter {
  return new OpenClawCareerAutomationAdapter(options);
}
