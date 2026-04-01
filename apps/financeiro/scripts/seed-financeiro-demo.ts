/**
 * Seed de demonstração comercial: casal/casa, PJ e estúdio compartilhado.
 * Inclui fontes, receitas, despesas, categorias, orçamentos, metas e regras de rateio.
 *
 * Uso (somente ambiente controlado / usuário de demo):
 *   cd apps/financeiro
 *   dotenv -e ../../.env.local -e .env -- npx tsx scripts/seed-financeiro-demo.ts --email seu@email.com
 *   npx tsx scripts/seed-financeiro-demo.ts --email x@y.com --reset-demo
 *
 * UI roteiro demo (opcional): NEXT_PUBLIC_FINANCEIRO_DEMO_BANNER=true
 * Onboarding curto: /ferramentas/financeiro/onboarding?apresentacao=1
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
import { createIncome } from "../src/modules/financeiro/services/incomes";
import { createRule } from "../src/modules/financeiro/services/rules/createRule";
import { createCategory } from "../src/modules/financeiro/services/categories/createCategory";
import { DEMO_ACCOUNT_NAMES } from "../src/modules/financeiro/demo-seed/constants";
import { resetFinanceiroDemoData } from "../src/modules/financeiro/demo-seed/reset";
import { demoCategoryName, logFinanceiroDemo, parseSeedCliArgs, ymd } from "../src/modules/financeiro/demo-seed/helpers";

const prisma = new PrismaClient();

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

async function main() {
  const { email, resetDemo } = parseSeedCliArgs(process.argv.slice(2));

  if (!email) {
    console.error("Uso: npx tsx scripts/seed-financeiro-demo.ts --email usuario@email.com [--reset-demo]");
    process.exit(1);
  }

  logFinanceiroDemo("seed_invoked", { resetDemo, hasEmail: Boolean(email) });

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
    await resetFinanceiroDemoData(prisma, householdId);
    console.log("Artefatos demo anteriores removidos (contas, fontes, regras, categorias · demo, receitas marcadas).");
  }

  const today = new Date();
  const Y = today.getFullYear();
  const M = today.getMonth() + 1;

  const catSuper = await createCategory(prisma, householdId, {
    name: demoCategoryName("Supermercado"),
    color: "#22c55e",
  });
  const catMoradia = await createCategory(prisma, householdId, {
    name: demoCategoryName("Moradia"),
    color: "#3b82f6",
  });
  const catLazer = await createCategory(prisma, householdId, {
    name: demoCategoryName("Lazer"),
    color: "#a855f7",
  });
  const catSaude = await createCategory(prisma, householdId, {
    name: demoCategoryName("Saúde"),
    color: "#ef4444",
  });
  const catSoftware = await createCategory(prisma, householdId, {
    name: demoCategoryName("Software e nuvem"),
    color: "#6366f1",
  });
  const catInfra = await createCategory(prisma, householdId, {
    name: demoCategoryName("Infraestrutura criativa"),
    color: "#f59e0b",
  });

  const budgetRows: { categoryId: string; limit: number }[] = [
    { categoryId: catSuper.id, limit: 2200 },
    { categoryId: catMoradia.id, limit: 3200 },
    { categoryId: catLazer.id, limit: 450 },
    { categoryId: catSaude.id, limit: 550 },
    { categoryId: catSoftware.id, limit: 900 },
    { categoryId: catInfra.id, limit: 6500 },
  ];
  for (const b of budgetRows) {
    await prisma.budget.upsert({
      where: { householdId_categoryId: { householdId, categoryId: b.categoryId } },
      create: { householdId, categoryId: b.categoryId, monthlyLimit: new Decimal(b.limit) },
      update: { monthlyLimit: new Decimal(b.limit) },
    });
  }

  const srcSalarioPJ = await prisma.source.create({
    data: {
      householdId,
      name: "Demo — Salário PJ",
      sourceType: "PJ",
      description: "Folha e pró-labore — separado do bolso pessoal",
      isActive: true,
    },
  });
  const srcClientes = await prisma.source.create({
    data: {
      householdId,
      name: "Demo — Notas e clientes",
      sourceType: "PJ",
      description: "Recebíveis de projetos e NF",
      isActive: true,
    },
  });
  const srcPfCasal = await prisma.source.create({
    data: {
      householdId,
      name: "Demo — Renda PF (casal)",
      sourceType: "PF",
      description: "Entradas da vida pessoal / reserva da casa",
      isActive: true,
    },
  });
  const srcEstudio = await prisma.source.create({
    data: {
      householdId,
      name: "Demo — Caixa estúdio",
      sourceType: "PF",
      description: "Pool compartilhado do negócio criativo",
      isActive: true,
    },
  });

  const tag = "[demo financeiro]";

  await createIncome(
    prisma,
    householdId,
    {
      sourceId: srcSalarioPJ.id,
      amount: 11800,
      receivedAt: ymd(Y, M, 5),
      context: "BUSINESS",
      notes: `${tag} Salário / pró-labore`,
      status: "RECEIVED",
    },
    ctx
  );
  await createIncome(
    prisma,
    householdId,
    {
      sourceId: srcClientes.id,
      amount: 6240,
      receivedAt: ymd(Y, M, 12),
      context: "BUSINESS",
      notes: `${tag} NF e projetos`,
      status: "RECEIVED",
    },
    ctx
  );
  await createIncome(
    prisma,
    householdId,
    {
      sourceId: srcPfCasal.id,
      amount: 4100,
      receivedAt: ymd(Y, M, 8),
      context: "PERSONAL",
      notes: `${tag} Transferências e extras PF`,
      status: "RECEIVED",
    },
    ctx
  );
  await createIncome(
    prisma,
    householdId,
    {
      sourceId: srcEstudio.id,
      amount: 9800,
      receivedAt: ymd(Y, M, 15),
      context: "SHARED",
      notes: `${tag} Receita bruta estúdio`,
      status: "RECEIVED",
    },
    ctx
  );

  await prisma.incomeAllocationGoal.upsert({
    where: { householdId_year_month: { householdId, year: Y, month: M } },
    create: {
      householdId,
      year: Y,
      month: M,
      investmentPercent: new Decimal(12),
      savingsPercent: new Decimal(18),
      observations: `${tag} Meta família — investimento e reserva`,
    },
    update: {
      investmentPercent: new Decimal(12),
      savingsPercent: new Decimal(18),
      observations: `${tag} Meta família — investimento e reserva`,
    },
  });

  const accCasa = await createAccount(prisma, householdId, {
    name: DEMO_ACCOUNT_NAMES[0],
    type: "SHARED",
  });
  const pAna = await addParticipant(prisma, accCasa.id, householdId, {
    name: "Ana",
    defaultShare: 0.52,
  });
  const pBruno = await addParticipant(prisma, accCasa.id, householdId, {
    name: "Bruno",
    defaultShare: 0.48,
  });
  if (!pAna || !pBruno) throw new Error("participantes casa");

  const casaExpenses: {
    categoryId: string;
    amt: number;
    shared: boolean;
    paidBy: typeof pAna;
    day: number;
    status: "PAID" | "PENDING";
  }[] = [
    { categoryId: catSuper.id, amt: 420, shared: true, paidBy: pAna, day: 3, status: "PAID" },
    { categoryId: catSuper.id, amt: 185.5, shared: true, paidBy: pBruno, day: 6, status: "PAID" },
    { categoryId: catMoradia.id, amt: 210, shared: false, paidBy: pAna, day: 4, status: "PAID" },
    { categoryId: catMoradia.id, amt: 120, shared: false, paidBy: pBruno, day: 5, status: "PAID" },
    { categoryId: catMoradia.id, amt: 680, shared: true, paidBy: pAna, day: 20, status: "PENDING" },
    { categoryId: catLazer.id, amt: 55, shared: true, paidBy: pAna, day: 2, status: "PAID" },
    { categoryId: catLazer.id, amt: 159, shared: true, paidBy: pBruno, day: 9, status: "PAID" },
    { categoryId: catSaude.id, amt: 89.9, shared: true, paidBy: pAna, day: 7, status: "PAID" },
  ];

  for (const row of casaExpenses) {
    await createExpense(
      prisma,
      householdId,
      {
        accountId: accCasa.id,
        categoryId: row.categoryId,
        amount: row.amt,
        dueDate: ymd(Y, M, row.day),
        status: row.status,
        paidAmount: row.status === "PAID" ? row.amt : undefined,
        paidAt: row.status === "PAID" ? ymd(Y, M, row.day) : undefined,
        expenseSplitType: row.shared ? "SHARED" : "INDIVIDUAL",
        paidByParticipantId: row.paidBy.id,
        context: "SHARED",
        sourceId: srcPfCasal.id,
      },
      ctx
    );
  }

  await createSettlementsFromBalances(prisma, accCasa.id, householdId);
  const listCasa = await prisma.settlement.findMany({
    where: { accountId: accCasa.id },
    orderBy: { createdAt: "asc" },
    take: 1,
  });
  if (listCasa[0]) {
    await applyPayment(prisma, listCasa[0].id, 52, householdId);
    const pay = await prisma.payment.findFirst({
      where: { settlementId: listCasa[0].id },
      orderBy: { createdAt: "desc" },
    });
    if (pay) await reversePayment(prisma, pay.id, householdId, 18);
  }

  const accPj = await createAccount(prisma, householdId, {
    name: DEMO_ACCOUNT_NAMES[1],
    type: "BUSINESS",
  });
  const pTitular = await addParticipant(prisma, accPj.id, householdId, {
    name: "Titular PJ",
    defaultShare: 1,
  });
  if (!pTitular) throw new Error("titular pj");

  const pjAmounts = [180, 45, 32, 90];
  for (let i = 0; i < pjAmounts.length; i++) {
    await createExpense(
      prisma,
      householdId,
      {
        accountId: accPj.id,
        categoryId: catSoftware.id,
        amount: pjAmounts[i]!,
        dueDate: ymd(Y, M, 5 + i),
        status: "PAID",
        paidAmount: pjAmounts[i],
        paidAt: ymd(Y, M, 5 + i),
        expenseSplitType: "INDIVIDUAL",
        paidByParticipantId: pTitular.id,
        context: "BUSINESS",
        sourceId: srcSalarioPJ.id,
      },
      ctx
    );
  }

  const accStudio = await createAccount(prisma, householdId, {
    name: DEMO_ACCOUNT_NAMES[2],
    type: "SHARED",
  });
  const s1 = await addParticipant(prisma, accStudio.id, householdId, { name: "Ana", defaultShare: 1 / 3 });
  const s2 = await addParticipant(prisma, accStudio.id, householdId, { name: "Carla", defaultShare: 1 / 3 });
  const s3 = await addParticipant(prisma, accStudio.id, householdId, { name: "Diego", defaultShare: 1 / 3 });
  if (!s1 || !s2 || !s3) throw new Error("studio participants");

  const studioExp = [
    { amt: 2400, day: 10 },
    { amt: 890, day: 11 },
    { amt: 199, day: 12 },
    { amt: 450, day: 13 },
    { amt: 200, day: 14 },
  ];
  for (let i = 0; i < studioExp.length; i++) {
    const e = studioExp[i]!;
    await createExpense(
      prisma,
      householdId,
      {
        accountId: accStudio.id,
        categoryId: catInfra.id,
        amount: e.amt,
        dueDate: ymd(Y, M, e.day),
        status: "PAID",
        paidAmount: e.amt,
        paidAt: ymd(Y, M, e.day),
        expenseSplitType: "SHARED",
        paidByParticipantId: s1.id,
        context: "SHARED",
        sourceId: srcEstudio.id,
      },
      ctx
    );
  }

  await createSettlementsFromBalances(prisma, accStudio.id, householdId);
  const manualOk = await createManualSettlement(prisma, accStudio.id, householdId, {
    fromParticipantId: s2.id,
    toParticipantId: s3.id,
    amount: 128,
  });
  if (!manualOk) {
    console.warn("Acerto manual estúdio não criado (sem saldo pendente).");
  }
  await createSettlementsFromBalances(prisma, accStudio.id, householdId);
  const stStudio = await prisma.settlement.findFirst({
    where: { accountId: accStudio.id, status: "PENDING" },
    orderBy: { amount: "desc" },
  });
  if (stStudio) {
    const part = round2(Number(stStudio.amount) * 0.22);
    if (part > 0.01) {
      await applyPayment(prisma, stStudio.id, part, householdId);
      const p = await prisma.payment.findFirst({ where: { settlementId: stStudio.id } });
      if (p && Number(p.amount) > 5) {
        await reversePayment(prisma, p.id, householdId, 5);
      }
    }
  }

  await createRule(
    prisma,
    householdId,
    {
      name: "Demo · Rateio do mercado (PJ + PF)",
      description: "Mostra como a mesma categoria pode ser distribuída entre fontes.",
      ruleType: "CATEGORY_PERCENTAGE",
      percentage: 50,
      referenceCategory: demoCategoryName("Supermercado"),
      sourceIds: [srcSalarioPJ.id, srcPfCasal.id],
    },
    ctx
  );

  await createRule(
    prisma,
    householdId,
    {
      name: "Demo · Aporte fixo planejado",
      description: "Valor fixo mensal dividido entre fontes (previsibilidade).",
      ruleType: "FIXED_PER_MEMBER",
      fixedAmount: 600,
      percentage: 50,
      sourceIds: [srcPfCasal.id, srcSalarioPJ.id],
    },
    ctx
  );

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
      totalIncomes: new Decimal(28900),
      totalExpenses: new Decimal(17450),
      pendingExpenses: new Decimal(920),
      balance: new Decimal(11450),
      notes: `${tag} Fechamento exemplo — mês anterior`,
      closedAt: new Date(),
    },
    update: {
      totalIncomes: new Decimal(28900),
      totalExpenses: new Decimal(17450),
      pendingExpenses: new Decimal(920),
      balance: new Decimal(11450),
      notes: `${tag} Fechamento exemplo — mês anterior`,
      closedAt: new Date(),
    },
  });

  const closeMonthStr = `${Y}-${String(M).padStart(2, "0")}`;
  await closeAccountMonth(prisma, accCasa.id, householdId, closeMonthStr);

  logFinanceiroDemo("seed_completed", {
    householdId,
    accounts: [...DEMO_ACCOUNT_NAMES],
    monthSnapshot: `${snapYear}-${String(snapMonth).padStart(2, "0")}`,
    accountSnapshotMonth: closeMonthStr,
  });

  console.log("\n✅ Seed demo (comercial) concluído.");
  console.log(`   Household: ${householdId}`);
  console.log(`   Contas: ${DEMO_ACCOUNT_NAMES.join(", ")}`);
  console.log(`   Roteiro sugerido: Dashboard → Fontes → Lançamentos → Regras → Upgrade`);
  console.log(`   MonthSnapshot: ${snapYear}-${String(snapMonth).padStart(2, "0")}`);
  console.log(`   AccountSnapshot: ${closeMonthStr} (${DEMO_ACCOUNT_NAMES[0]})\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
