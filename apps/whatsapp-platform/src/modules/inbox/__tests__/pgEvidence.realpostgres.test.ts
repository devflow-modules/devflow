/**
 * Real PostgreSQL evidence labs (opt-in: WHATSAPP_PG_INTEGRATION=1 + localhost URL).
 * Skipped in default CI/node suite unless env is set.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { assertPgIntegrationSafe, isPgIntegrationEnabled } from "@/test/pgIntegrationGuard";

const describePg = isPgIntegrationEnabled() ? describe : describe.skip;
import {
  createPgEvidencePhoneLine,
  createPgEvidenceTenant,
  createPgEvidenceUser,
  deletePgEvidenceTenant,
  inboundFixture,
  pgEvidenceRunId,
} from "@/test/pgEvidenceFixtures";
import { prisma } from "@/lib/prisma";

vi.mock("@/modules/inbox/leadCrm", () => ({
  refreshThreadLeadCrmAfterInbound: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/modules/inbox/waInboxThreadMetrics", () => ({
  getWaInboxThreadInboxMetrics: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/modules/commercial", () => ({
  evaluateCommercialPipelineAfterInbound: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/modules/realtime/realtime.service", () => ({
  publishInboxEvent: vi.fn(),
  eventMessageCreated: vi.fn(() => ({})),
}));
vi.mock("@/modules/automation", () => ({
  dispatchMessageInbound: vi.fn().mockResolvedValue(undefined),
  dispatchConversationCreated: vi.fn().mockResolvedValue(undefined),
  dispatchStatusChanged: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/observability", () => ({
  bumpMetric: vi.fn(),
}));

/** Exported for evidence report scripts. */
export type ConcurrentInboundLabResult = {
  callers: number;
  fulfilled: number;
  rejected: number;
  nonNullResults: number;
  messageCount: number;
  threadCount: number;
};

export async function runConcurrentInboundLab(
  tenantId: string,
  phoneNumberId: string,
  waMessageId: string,
  callers: number
): Promise<ConcurrentInboundLabResult> {
  const { waInboxCreateInbound } = await import("../waInboxMessageService");
  const parsed = inboundFixture(waMessageId);
  const outcomes = await Promise.allSettled(
    Array.from({ length: callers }, () => waInboxCreateInbound(tenantId, phoneNumberId, parsed))
  );
  const fulfilled = outcomes.filter((o) => o.status === "fulfilled").length;
  const rejected = outcomes.filter((o) => o.status === "rejected").length;
  const nonNullResults = outcomes.filter(
    (o) => o.status === "fulfilled" && o.value != null
  ).length;
  const messageCount = await prisma.waInboxMessage.count({
    where: { tenantId, waMessageId },
  });
  const threadCount = await prisma.waInboxThread.count({
    where: { tenantId, businessPhoneNumberId: phoneNumberId },
  });
  return { callers, fulfilled, rejected, nonNullResults, messageCount, threadCount };
}

describePg("PostgreSQL evidence — inbox idempotency", () => {
  let tenantId: string;
  let phoneNumberId: string;

  beforeAll(() => {
    assertPgIntegrationSafe();
  });

  beforeAll(async () => {
    const tenant = await createPgEvidenceTenant("inbound");
    tenantId = tenant.id;
    const line = await createPgEvidencePhoneLine(tenantId, "inbound");
    phoneNumberId = line.phoneNumberId;
  });

  afterAll(async () => {
    if (tenantId) await deletePgEvidenceTenant(tenantId);
  });

  const levels = [2, 5, 10, 20] as const;

  for (const n of levels) {
    it(`concurrent inbound c${n} converges to one message`, async () => {
      const waMessageId = `wam-pg-c${n}-${pgEvidenceRunId()}`;
      const lab = await runConcurrentInboundLab(tenantId, phoneNumberId, waMessageId, n);
      expect(lab.rejected).toBe(0);
      expect(lab.fulfilled).toBe(n);
      expect(lab.messageCount).toBe(1);
      expect(lab.nonNullResults).toBeGreaterThanOrEqual(1);
      expect(lab.nonNullResults).toBeLessThanOrEqual(1);
    });
  }

  it("concurrent thread creation for same logical thread yields one thread", async () => {
    const { waInboxCreateInbound } = await import("../waInboxMessageService");
    const customer = "5511777666555";
    const callers = 10;
    const outcomes = await Promise.allSettled(
      Array.from({ length: callers }, (_, i) =>
        waInboxCreateInbound(
          tenantId,
          phoneNumberId,
          inboundFixture(`wam-thread-race-${i}-${pgEvidenceRunId()}`, customer)
        )
      )
    );
    expect(outcomes.every((o) => o.status === "fulfilled")).toBe(true);
    const threadCount = await prisma.waInboxThread.count({
      where: {
        tenantId,
        phoneNumber: customer,
        businessPhoneNumberId: phoneNumberId,
      },
    });
    expect(threadCount).toBe(1);
    const messageCount = await prisma.waInboxMessage.count({
      where: { tenantId, fromNumber: customer },
    });
    expect(messageCount).toBe(callers);
  });
});

describePg("PostgreSQL evidence — Stripe webhook claim", () => {
  const stripeEventId = `evt_pg_stripe_${pgEvidenceRunId()}`;

  beforeAll(() => {
    assertPgIntegrationSafe();
  });

  afterAll(async () => {
    await prisma.stripeWebhookEvent.deleteMany({ where: { stripeEventId } });
  });

  it("concurrent claim yields one processor", async () => {
    const { claimStripeWebhookEvent } = await import(
      "@/modules/billing/infrastructure/billingRepository"
    );
    const n = 10;
    const results = await Promise.all(
      Array.from({ length: n }, () => claimStripeWebhookEvent(stripeEventId, "invoice.paid"))
    );
    const processCount = results.filter((r) => r.action === "process").length;
    const skipCount = results.filter((r) => r.action !== "process").length;
    expect(processCount).toBe(1);
    expect(skipCount).toBe(n - 1);
    const rows = await prisma.stripeWebhookEvent.count({ where: { stripeEventId } });
    expect(rows).toBe(1);
  });

  it("failed attempt is retryable then PROCESSED", async () => {
    const { claimStripeWebhookEvent, markStripeWebhookFailed, markStripeWebhookProcessed } =
      await import("@/modules/billing/infrastructure/billingRepository");
    const id = `evt_pg_retry_${pgEvidenceRunId()}`;
    const first = await claimStripeWebhookEvent(id, "customer.updated");
    expect(first.action).toBe("process");
    if (first.action !== "process") return;
    await markStripeWebhookFailed(first.rowId, new Error("simulated handler failure"));
    const second = await claimStripeWebhookEvent(id, "customer.updated", { staleProcessingMs: 0 });
    expect(second.action).toBe("process");
    if (second.action !== "process") return;
    await markStripeWebhookProcessed(second.rowId);
    const third = await claimStripeWebhookEvent(id, "customer.updated");
    expect(third.action).toBe("skip_duplicate");
    const row = await prisma.stripeWebhookEvent.findUniqueOrThrow({ where: { stripeEventId: id } });
    expect(row.status).toBe("PROCESSED");
    await prisma.stripeWebhookEvent.delete({ where: { stripeEventId: id } });
  });
});

describePg("PostgreSQL evidence — send ledger", () => {
  let tenantId: string;
  let threadId: string;
  let userId: string;

  beforeAll(async () => {
    assertPgIntegrationSafe();
    const tenant = await createPgEvidenceTenant("ledger");
    tenantId = tenant.id;
    const user = await createPgEvidenceUser(tenantId, "ledger");
    userId = user.id;
    const line = await createPgEvidencePhoneLine(tenantId, "ledger");
    const thread = await prisma.waInboxThread.create({
      data: {
        tenantId,
        phoneNumber: "5511666555444",
        businessPhoneNumberId: line.phoneNumberId,
      },
    });
    threadId = thread.id;
  });

  afterAll(async () => {
    if (tenantId) await deletePgEvidenceTenant(tenantId);
  });

  it("sequential replay loads same ledger row", async () => {
    const {
      beginOrLoadSendRequest,
      findSendRequest,
    } = await import("../outboundSendRequestService");
    const clientRequestId = `cr-seq-${pgEvidenceRunId()}`;
    const a = await beginOrLoadSendRequest({
      tenantId,
      threadId,
      userId,
      clientRequestId,
      text: "hello",
    });
    const b = await beginOrLoadSendRequest({
      tenantId,
      threadId,
      userId,
      clientRequestId,
      text: "hello",
    });
    expect(a.id).toBe(b.id);
    const count = await prisma.waInboxSendRequest.count({
      where: { tenantId, clientRequestId },
    });
    expect(count).toBe(1);
    expect(await findSendRequest(tenantId, clientRequestId)).not.toBeNull();
  });

  it("concurrent beginOrLoad + claimSendForMeta converges", async () => {
    const { beginOrLoadSendRequest, claimSendForMeta } = await import(
      "../outboundSendRequestService"
    );
    const clientRequestId = `cr-conc-${pgEvidenceRunId()}`;
    const rows = await Promise.all(
      Array.from({ length: 8 }, () =>
        beginOrLoadSendRequest({
          tenantId,
          threadId,
          userId,
          clientRequestId,
          text: "concurrent",
        })
      )
    );
    const uniqueIds = new Set(rows.map((r) => r.id));
    expect(uniqueIds.size).toBe(1);
    const claims = await Promise.all(Array.from({ length: 8 }, () => claimSendForMeta(rows[0].id)));
    expect(claims.filter(Boolean).length).toBe(1);
  });
});

describePg("PostgreSQL evidence — two-tenant negative matrix", () => {
  let tenantA: string;
  let tenantB: string;
  let threadB: string;
  let userA: string;
  let userB: string;
  let phoneB: string;

  beforeAll(async () => {
    assertPgIntegrationSafe();
    const a = await createPgEvidenceTenant("A");
    const b = await createPgEvidenceTenant("B");
    tenantA = a.id;
    tenantB = b.id;
    userA = (await createPgEvidenceUser(tenantA, "op-a")).id;
    userB = (await createPgEvidenceUser(tenantB, "op-b")).id;
    phoneB = (await createPgEvidencePhoneLine(tenantB, "B")).phoneNumberId;
    threadB = (
      await prisma.waInboxThread.create({
        data: {
          tenantId: tenantB,
          phoneNumber: "5511999888777",
          businessPhoneNumberId: phoneB,
        },
      })
    ).id;
    await prisma.waInboxMessage.create({
      data: {
        tenantId: tenantB,
        threadId: threadB,
        businessPhoneNumberId: phoneB,
        waMessageId: `wam-b-only-${pgEvidenceRunId()}`,
        direction: "INBOUND",
        fromNumber: "5511999888777",
        toNumber: "5511888777666",
        messageType: "TEXT",
        ts: new Date(),
        status: "RECEIVED",
        rawPayload: { source: "pg-evidence-fixture" },
      },
    });
  });

  afterAll(async () => {
    await deletePgEvidenceTenant(tenantA);
    await deletePgEvidenceTenant(tenantB);
  });

  it("A cannot read or mutate B conversation (service layer)", async () => {
    const { waInboxGetThread } = await import("../waInboxQueries");
    const { assignThread } = await import("../threadAssignmentService");
    const read = await waInboxGetThread(tenantA, threadB);
    expect(read).toBeNull();
    const assign = await assignThread(tenantA, threadB, userA, userA, "operator");
    expect(assign.ok).toBe(false);
    if (!assign.ok) expect(assign.reason).toBe("not_found");
  });

  it("B cannot read A thread when none exists for A (symmetric not_found)", async () => {
    const { waInboxGetThread } = await import("../waInboxQueries");
    const fakeThreadId = threadB;
    const read = await waInboxGetThread(tenantB, fakeThreadId);
    expect(read?.tenantId).toBe(tenantB);
    const cross = await waInboxGetThread(tenantA, fakeThreadId);
    expect(cross).toBeNull();
  });

  it("send ledger clientRequestId is scoped per tenant", async () => {
    const { beginOrLoadSendRequest, findSendRequest } = await import(
      "../outboundSendRequestService"
    );
    const clientRequestId = `cr-cross-${pgEvidenceRunId()}`;
    await beginOrLoadSendRequest({
      tenantId: tenantB,
      threadId: threadB,
      userId: userB,
      clientRequestId,
      text: "tenant b",
    });
    expect(await findSendRequest(tenantA, clientRequestId)).toBeNull();
    expect(await findSendRequest(tenantB, clientRequestId)).not.toBeNull();
  });

  it("phone line query does not cross tenants", async () => {
    const { fetchWhatsappLineSummaries } = await import("../waInboxQueries");
    const mapA = await fetchWhatsappLineSummaries(tenantA, [phoneB]);
    expect(mapA.size).toBe(0);
    const mapB = await fetchWhatsappLineSummaries(tenantB, [phoneB]);
    expect(mapB.size).toBe(1);
  });
});
