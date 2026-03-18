/**
 * E2E de integração contra PostgreSQL dedicado.
 *
 * Configure:
 *   FINANCEIRO_TEST_DATABASE_URL=postgresql://...
 *
 * Rodar:
 *   pnpm run test:e2e
 *
 * O teste cria household/usuário/conta, executa o fluxo completo e remove tudo ao final.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  createAccount,
  addParticipant,
  createSettlementsFromBalances,
  applyPayment,
  completeSettlement,
  listSettlements,
  getAccount,
  getAccountTimeline,
  getEffectiveBalances,
  closeAccountMonth,
  reopenSettlement,
  finalizeSettlementAfterReopen,
  listAccounts,
  listPayments,
} from "@/modules/financeiro/services/accounts";
import { createExpense } from "@/modules/financeiro/services/expenses";
import { reversePayment } from "@/modules/financeiro/services/accounts/reversePayment";

const testUrl = process.env.FINANCEIRO_TEST_DATABASE_URL;
const run = !!testUrl && testUrl.length > 10;

describe.runIf(run)("E2E Financeiro — fluxo completo (DB real)", () => {
  let prisma: PrismaClient;
  let householdId: string;
  let userId: string;
  let otherHouseholdId: string;
  /** Household só com userB — simula “Usuário B” sem acesso a A */
  let householdBIsolated: string;
  let userBId: string;

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: { db: { url: testUrl! } },
    });
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const user = await prisma.user.create({
      data: {
        email: `e2e-${suffix}@financeiro.test`,
        name: "E2E User",
      },
    });
    userId = user.id;
    const hh = await prisma.household.create({
      data: {
        name: `E2E Household ${suffix}`,
        slug: `e2e-${suffix}`,
        memberships: { create: { userId, role: "OWNER" } },
      },
    });
    householdId = hh.id;

    const other = await prisma.household.create({
      data: {
        name: `E2E Other ${suffix}`,
        slug: `e2e-other-${suffix}`,
        memberships: { create: { userId, role: "OWNER" } },
      },
    });
    otherHouseholdId = other.id;

    const userB = await prisma.user.create({
      data: {
        email: `e2e-b-${suffix}@financeiro.test`,
        name: "E2E User B",
      },
    });
    userBId = userB.id;
    const hhB = await prisma.household.create({
      data: {
        name: `E2E Household B only ${suffix}`,
        slug: `e2e-bonly-${suffix}`,
        memberships: { create: { userId: userBId, role: "OWNER" } },
      },
    });
    householdBIsolated = hhB.id;
  });

  afterAll(async () => {
    if (!prisma) return;
    for (const hid of [householdId, otherHouseholdId, householdBIsolated]) {
      await prisma.expense.deleteMany({ where: { householdId: hid } });
      await prisma.account.deleteMany({ where: { householdId: hid } });
      await prisma.auditLog.deleteMany({ where: { householdId: hid } });
      await prisma.idempotencyRecord.deleteMany({ where: { householdId: hid } });
      await prisma.householdMembership.deleteMany({ where: { householdId: hid } });
      await prisma.household.delete({ where: { id: hid } }).catch(() => {});
    }
    await prisma.user.deleteMany({ where: { id: { in: [userId, userBId] } } });
    await prisma.$disconnect();
  });

  it("1–9: conta → participantes → despesa → settlement → pagamento → estorno → reabrir/finalizar → fechar mês → timeline/saldos", async () => {
    const acc = await createAccount(prisma, householdId, {
      name: "Conta E2E",
      type: "SHARED",
    });
    const accountId = acc.id;

    const alice = await addParticipant(prisma, accountId, householdId, {
      name: "Alice",
      defaultShare: 0.5,
    });
    const bob = await addParticipant(prisma, accountId, householdId, {
      name: "Bob",
      defaultShare: 0.5,
    });
    expect(alice && bob).toBeTruthy();

    await createExpense(
      prisma,
      householdId,
      {
        accountId,
        category: "Supermercado",
        amount: 100,
        dueDate: "2026-03-01",
        status: "PAID",
        paidAmount: 100,
        paidAt: "2026-03-01",
        expenseSplitType: "SHARED",
        paidByParticipantId: alice!.id,
        context: "SHARED",
      },
      { userId, householdId }
    );

    const list1 = await createSettlementsFromBalances(prisma, accountId, householdId);
    expect(list1.length).toBeGreaterThan(0);
    const st = list1.find((s) => s.status === "PENDING" || s.status === "PARTIAL");
    expect(st).toBeDefined();
    const settlementId = st!.id;

    const pay20 = await applyPayment(prisma, settlementId, 20, householdId);
    expect(pay20.ok).toBe(true);

    const payments = await prisma.payment.findMany({
      where: { settlementId },
      orderBy: { createdAt: "desc" },
    });
    const paymentId = payments[0]!.id;

    const rev = await reversePayment(prisma, paymentId, householdId, 5);
    expect(rev.ok).toBe(true);

    const complete = await completeSettlement(prisma, settlementId, householdId);
    expect(complete).not.toBeNull();

    const reopen = await reopenSettlement(prisma, settlementId, householdId);
    expect(reopen.ok).toBe(true);

    const fin = await finalizeSettlementAfterReopen(prisma, settlementId, householdId);
    expect(fin.ok).toBe(true);

    const month = "2026-03";
    const closed = await closeAccountMonth(prisma, accountId, householdId, month);
    expect(closed.ok).toBe(true);
    expect(closed.balances).toBeDefined();

    const timeline = await getAccountTimeline(prisma, accountId, householdId);
    expect(timeline.length).toBeGreaterThan(0);

    const balances = await getEffectiveBalances(prisma, accountId, householdId);
    expect(typeof balances).toBe("object");

    const foreign = await listSettlements(prisma, accountId, otherHouseholdId);
    expect(foreign).toEqual([]);
  });

  it("Cenário Marques Soares: 70/30, R$200 pago por Gustavo → Alexia deve R$60; parcial; quitar; estornar R$30; fechar mês", async () => {
    const acc = await createAccount(prisma, householdId, {
      name: "Marques Soares",
      type: "SHARED",
    });
    const gustavo = await addParticipant(prisma, acc.id, householdId, {
      name: "Gustavo",
      defaultShare: 0.7,
    });
    const alexia = await addParticipant(prisma, acc.id, householdId, {
      name: "Alexia",
      defaultShare: 0.3,
    });
    await createExpense(
      prisma,
      householdId,
      {
        accountId: acc.id,
        category: "Almoço",
        amount: 200,
        dueDate: "2026-04-10",
        status: "PAID",
        paidAmount: 200,
        paidAt: "2026-04-10",
        expenseSplitType: "SHARED",
        paidByParticipantId: gustavo!.id,
        context: "SHARED",
      },
      { userId, householdId }
    );
    const settlements = await createSettlementsFromBalances(prisma, acc.id, householdId);
    const st = settlements.find(
      (s) => s.fromParticipantId === alexia!.id && s.toParticipantId === gustavo!.id
    );
    expect(st).toBeDefined();
    expect(Math.abs(Number(st!.amount) - 60)).toBeLessThan(0.02);

    const pay30a = await applyPayment(prisma, st!.id, 30, householdId);
    expect(pay30a.ok).toBe(true);
    const afterPartial = await prisma.settlement.findUnique({ where: { id: st!.id } });
    expect(afterPartial!.status).toBe("PARTIAL");

    const pay30b = await applyPayment(prisma, st!.id, 30, householdId);
    expect(pay30b.ok).toBe(true);
    const afterPaid = await prisma.settlement.findUnique({ where: { id: st!.id } });
    expect(afterPaid!.status).toBe("COMPLETED");

    const pays = await prisma.payment.findMany({
      where: { settlementId: st!.id },
      orderBy: { createdAt: "asc" },
    });
    expect(pays.length).toBe(2);
    const rev = await reversePayment(prisma, pays[1]!.id, householdId, 30);
    expect(rev.ok).toBe(true);
    const afterRev = await prisma.settlement.findUnique({ where: { id: st!.id } });
    expect(afterRev!.status).toBe("PARTIAL");

    const closed = await closeAccountMonth(prisma, acc.id, householdId, "2026-04");
    expect(closed.ok).toBe(true);
    expect(closed.balances).toBeDefined();

    const timeline = await getAccountTimeline(prisma, acc.id, householdId);
    expect(timeline.length).toBeGreaterThan(3);
  });

  it("Isolamento household B (User B): não vê conta, settlements nem pagamentos de A", async () => {
    const acc = await createAccount(prisma, householdId, {
      name: "Conta exclusiva A",
      type: "SHARED",
    });
    expect(await getAccount(prisma, acc.id, householdBIsolated)).toBeNull();
    const accountsB = await listAccounts(prisma, householdBIsolated);
    expect(accountsB.some((a) => a.id === acc.id)).toBe(false);

    const p1 = await addParticipant(prisma, acc.id, householdId, {
      name: "Membro1",
      defaultShare: 0.5,
    });
    await addParticipant(prisma, acc.id, householdId, {
      name: "Membro2",
      defaultShare: 0.5,
    });
    await createExpense(
      prisma,
      householdId,
      {
        accountId: acc.id,
        category: "X",
        amount: 50,
        dueDate: "2026-05-01",
        status: "PAID",
        paidAmount: 50,
        paidAt: "2026-05-01",
        expenseSplitType: "SHARED",
        paidByParticipantId: p1!.id,
        context: "SHARED",
      },
      { userId, householdId }
    );
    await createSettlementsFromBalances(prisma, acc.id, householdId);
    const listA = await listSettlements(prisma, acc.id, householdId);
    expect(listA.length).toBeGreaterThan(0);

    expect(await listSettlements(prisma, acc.id, householdBIsolated)).toEqual([]);
    expect(await listPayments(prisma, acc.id, householdBIsolated)).toEqual([]);

    const expensesWrongHh = await prisma.expense.count({
      where: { accountId: acc.id, householdId: householdBIsolated },
    });
    expect(expensesWrongHh).toBe(0);
  });

  it("idempotencyKey duplicada: unique no household", async () => {
    const key = `idem-e2e-${Date.now()}-12345678`;
    await prisma.idempotencyRecord.create({
      data: {
        householdId,
        key,
        response: { ok: true },
        statusCode: 200,
      },
    });
    await expect(
      prisma.idempotencyRecord.create({
        data: {
          householdId,
          key,
          response: { dup: true },
          statusCode: 200,
        },
      })
    ).rejects.toThrow();
  });

  it("pagamento acima do restante", async () => {
    const acc = await createAccount(prisma, householdId, {
      name: "Conta Overpay",
      type: "SHARED",
    });
    const p1 = await addParticipant(prisma, acc.id, householdId, { name: "P1", defaultShare: 0.5 });
    await addParticipant(prisma, acc.id, householdId, { name: "P2", defaultShare: 0.5 });
    await createExpense(
      prisma,
      householdId,
      {
        accountId: acc.id,
        category: "X",
        amount: 40,
        dueDate: "2026-03-10",
        status: "PAID",
        paidAmount: 40,
        paidAt: "2026-03-10",
        expenseSplitType: "SHARED",
        paidByParticipantId: p1!.id,
        context: "SHARED",
      },
      { userId, householdId }
    );
    const list = await createSettlementsFromBalances(prisma, acc.id, householdId);
    const sid = list[0]!.id;
    const total = list[0]!.amount;
    const r = await applyPayment(prisma, sid, total + 100, householdId);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("EXCEEDS_REMAINING");
  });

  it("estorno acima do reembolsável", async () => {
    const acc = await createAccount(prisma, householdId, {
      name: "Conta RevLimit",
      type: "SHARED",
    });
    const r1 = await addParticipant(prisma, acc.id, householdId, { name: "R1", defaultShare: 0.5 });
    await addParticipant(prisma, acc.id, householdId, { name: "R2", defaultShare: 0.5 });
    await createExpense(
      prisma,
      householdId,
      {
        accountId: acc.id,
        category: "Z",
        amount: 20,
        dueDate: "2026-03-20",
        status: "PAID",
        paidAmount: 20,
        paidAt: "2026-03-20",
        expenseSplitType: "SHARED",
        paidByParticipantId: r1!.id,
        context: "SHARED",
      },
      { userId, householdId }
    );
    const list = await createSettlementsFromBalances(prisma, acc.id, householdId);
    const sid = list[0]!.id;
    await applyPayment(prisma, sid, 8, householdId);
    const pay = await prisma.payment.findFirst({ where: { settlementId: sid } });
    const r = await reversePayment(prisma, pay!.id, householdId, 9999);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("EXCEEDS_REFUNDABLE");
  });

  it("settlement PARTIAL: nova geração não duplica o mesmo par", async () => {
    const acc = await createAccount(prisma, householdId, {
      name: "Conta PartialDup",
      type: "SHARED",
    });
    const pa = await addParticipant(prisma, acc.id, householdId, { name: "A", defaultShare: 0.5 });
    await addParticipant(prisma, acc.id, householdId, { name: "B", defaultShare: 0.5 });
    await createExpense(
      prisma,
      householdId,
      {
        accountId: acc.id,
        category: "Y",
        amount: 100,
        dueDate: "2026-03-15",
        status: "PAID",
        paidAmount: 100,
        paidAt: "2026-03-15",
        expenseSplitType: "SHARED",
        paidByParticipantId: pa!.id,
        context: "SHARED",
      },
      { userId, householdId }
    );
    await createSettlementsFromBalances(prisma, acc.id, householdId);
    const before = await prisma.settlement.findMany({
      where: { accountId: acc.id },
      select: { id: true, fromParticipantId: true, toParticipantId: true, status: true },
    });
    const first = before[0]!;
    await applyPayment(prisma, first.id, 10, householdId);
    await createSettlementsFromBalances(prisma, acc.id, householdId);
    const pairCount = await prisma.settlement.count({
      where: {
        accountId: acc.id,
        fromParticipantId: first!.fromParticipantId,
        toParticipantId: first!.toParticipantId,
      },
    });
    expect(pairCount).toBe(1);
  });
});
