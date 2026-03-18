/**
 * Seed de demonstração: 3 contas (Marques Soares, PJ Gustavo TI, Studio),
 * despesas, liquidação parcial, pagamento, estorno e snapshot mensal.
 *
 * Uso:
 *   cd apps/financeiro
 *   dotenv -e ../../.env.local -e .env -- npx tsx scripts/seed-financeiro-demo.ts --email seu@email.com
 *   npx tsx scripts/seed-financeiro-demo.ts --email x@y.com --reset-demo
 */
import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import {
  createAccount,
  addParticipant,
  createSettlementsFromBalances,
  applyPayment,
  reversePayment,
  createManualSettlement,
  closeAccountMonth,
} from "../src/modules/financeiro/services/accounts";
import { createExpense } from "../src/modules/financeiro/services/expenses";

const prisma = new PrismaClient();

const DEMO_NAMES = ["Marques Soares", "PJ Gustavo TI", "Studio"] as const;

function ymd(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

async function main() {
  const args = process.argv.slice(2);
  const emailIdx = args.indexOf("--email");
  const email = emailIdx >= 0 ? args[emailIdx + 1] : null;
  const resetDemo = args.includes("--reset-demo");

  if (!email) {
    console.error("Uso: npx tsx scripts/seed-financeiro-demo.ts --email usuario@email.com [--reset-demo]");
    process.exit(1);
  }

  const user = await prisma.user.findFirst({ where: { email } });
  if (!user) {
    console.error(`Usuário não encontrado: ${email}`);
    process.exit(1);
  }

  const membership = await prisma.householdMembership.findFirst({
    where: { userId: user.id },
    include: { household: true },
  });
  if (!membership) {
    console.error("Nenhum household para este usuário.");
    process.exit(1);
  }

  const householdId = membership.householdId;
  const userId = user.id;
  const ctx = { userId, householdId };

  if (resetDemo) {
    const demoAccs = await prisma.account.findMany({
      where: { householdId, name: { in: [...DEMO_NAMES] } },
      select: { id: true },
    });
    const ids = demoAccs.map((a) => a.id);
    if (ids.length) {
      await prisma.expense.deleteMany({ where: { accountId: { in: ids } } });
      await prisma.account.deleteMany({ where: { id: { in: ids } } });
    }
    console.log("Contas demo anteriores removidas.");
  }

  const today = new Date();
  const Y = today.getFullYear();
  const M = today.getMonth() + 1;

  // ─── Conta 1: Marques Soares ─────────────────────────────────────────────
  const acc1 = await createAccount(prisma, householdId, {
    name: "Marques Soares",
    type: "SHARED",
  });
  const g1 = await addParticipant(prisma, acc1.id, householdId, {
    name: "Gustavo",
    defaultShare: 0.7,
  });
  const a1 = await addParticipant(prisma, acc1.id, householdId, {
    name: "Alexia",
    defaultShare: 0.3,
  });
  if (!g1 || !a1) throw new Error("participantes acc1");

  const expenses1 = [
    { cat: "Supermercado", amt: 420, shared: true as const },
    { cat: "Farmácia", amt: 89.9, shared: true as const },
    { cat: "Netflix", amt: 55, shared: true as const },
    { cat: "Luz (Gustavo)", amt: 210, shared: false as const },
    { cat: "Academia Alexia", amt: 120, shared: false as const },
  ];

  for (let i = 0; i < expenses1.length; i++) {
    const e = expenses1[i]!;
    await createExpense(
      prisma,
      householdId,
      {
        accountId: acc1.id,
        category: e.cat,
        amount: e.amt,
        dueDate: ymd(Y, M, 3 + i),
        status: "PAID",
        paidAmount: e.amt,
        paidAt: ymd(Y, M, 3 + i),
        expenseSplitType: e.shared ? "SHARED" : "INDIVIDUAL",
        paidByParticipantId: e.shared ? g1.id : e.cat.includes("Alexia") ? a1.id : g1.id,
        context: "SHARED",
      },
      ctx
    );
  }

  await createSettlementsFromBalances(prisma, acc1.id, householdId);
  const list1 = await prisma.settlement.findMany({
    where: { accountId: acc1.id },
    orderBy: { createdAt: "asc" },
    take: 1,
  });
  if (list1[0]) {
    await applyPayment(prisma, list1[0].id, 45, householdId);
    const pay = await prisma.payment.findFirst({
      where: { settlementId: list1[0].id },
      orderBy: { createdAt: "desc" },
    });
    if (pay) await reversePayment(prisma, pay.id, householdId, 15);
  }

  // ─── Conta 2: PJ Gustavo TI ────────────────────────────────────────────────
  const acc2 = await createAccount(prisma, householdId, {
    name: "PJ Gustavo TI",
    type: "BUSINESS",
  });
  const g2 = await addParticipant(prisma, acc2.id, householdId, {
    name: "Gustavo",
    defaultShare: 1,
  });
  if (!g2) throw new Error("g2");

  for (let i = 0; i < 4; i++) {
    await createExpense(
      prisma,
      householdId,
      {
        accountId: acc2.id,
        category: ["AWS", "Domínio", "Figma", "Cursor"][i]!,
        amount: [180, 45, 32, 90][i]!,
        dueDate: ymd(Y, M, 5 + i),
        status: "PAID",
        paidAmount: [180, 45, 32, 90][i],
        paidAt: ymd(Y, M, 5 + i),
        expenseSplitType: "INDIVIDUAL",
        paidByParticipantId: g2.id,
        context: "BUSINESS",
      },
      ctx
    );
  }

  // ─── Conta 3: Studio ─────────────────────────────────────────────────────
  const acc3 = await createAccount(prisma, householdId, {
    name: "Studio",
    type: "SHARED",
  });
  const sg = await addParticipant(prisma, acc3.id, householdId, {
    name: "Gustavo",
    defaultShare: 0.4,
  });
  const gale = await addParticipant(prisma, acc3.id, householdId, {
    name: "Galeão",
    defaultShare: 0.3,
  });
  const giri = await addParticipant(prisma, acc3.id, householdId, {
    name: "Giribelo",
    defaultShare: 0.3,
  });
  if (!sg || !gale || !giri) throw new Error("acc3 participants");

  const studioExp = [
    { cat: "Aluguel estúdio", amt: 2400 },
    { cat: "Equipamento", amt: 890 },
    { cat: "Software", amt: 199 },
    { cat: "Marketing", amt: 450 },
    { cat: "Limpeza", amt: 200 },
  ];
  for (let i = 0; i < studioExp.length; i++) {
    const e = studioExp[i]!;
    await createExpense(
      prisma,
      householdId,
      {
        accountId: acc3.id,
        category: e.cat,
        amount: e.amt,
        dueDate: ymd(Y, M, 8 + i),
        status: "PAID",
        paidAmount: e.amt,
        paidAt: ymd(Y, M, 8 + i),
        expenseSplitType: "SHARED",
        paidByParticipantId: sg.id,
        context: "SHARED",
      },
      ctx
    );
  }

  await createSettlementsFromBalances(prisma, acc3.id, householdId);
  const manualOk = await createManualSettlement(prisma, acc3.id, householdId, {
    fromParticipantId: gale.id,
    toParticipantId: giri.id,
    amount: 125.5,
  });
  if (!manualOk) {
    console.warn("Manual Studio Galeão→Giribelo não criado (par em aberto ou bloqueio).");
  }
  await createSettlementsFromBalances(prisma, acc3.id, householdId);
  const st3 = await prisma.settlement.findFirst({
    where: { accountId: acc3.id, status: "PENDING" },
    orderBy: { amount: "desc" },
  });
  if (st3) {
    const part = round2(Number(st3.amount) * 0.25);
    if (part > 0.01) {
      await applyPayment(prisma, st3.id, part, householdId);
      const p = await prisma.payment.findFirst({ where: { settlementId: st3.id } });
      if (p && Number(p.amount) > 5) {
        await reversePayment(prisma, p.id, householdId, 5);
      }
    }
  }

  // Snapshot mensal (household)
  const snapMonth = M === 1 ? 12 : M - 1;
  const snapYear = M === 1 ? Y - 1 : Y;
  await prisma.monthSnapshot.upsert({
    where: {
      householdId_year_month: { householdId, year: snapYear, month: snapMonth },
    },
    create: {
      householdId,
      year: snapYear,
      month: snapMonth,
      totalIncomes: new Decimal(12500),
      totalExpenses: new Decimal(8200),
      pendingExpenses: new Decimal(400),
      balance: new Decimal(4300),
      notes: "Seed demo Financeiro",
      closedAt: new Date(),
    },
    update: {
      totalIncomes: new Decimal(12500),
      totalExpenses: new Decimal(8200),
      pendingExpenses: new Decimal(400),
      balance: new Decimal(4300),
      notes: "Seed demo Financeiro (atualizado)",
      closedAt: new Date(),
    },
  });

  // Account snapshot (conta Marques Soares)
  const closeMonthStr = `${Y}-${String(M).padStart(2, "0")}`;
  await closeAccountMonth(prisma, acc1.id, householdId, closeMonthStr);

  console.log("\n✅ Seed demo concluído.");
  console.log(`   Household: ${householdId}`);
  console.log(`   Contas: ${DEMO_NAMES.join(", ")}`);
  console.log(`   MonthSnapshot: ${snapYear}-${String(snapMonth).padStart(2, "0")}`);
  console.log(`   AccountSnapshot: ${closeMonthStr} (Marques Soares)\n`);
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
