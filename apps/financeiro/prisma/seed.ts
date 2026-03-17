/**
 * Seed: dados reais simulados para homologação do Financeiro.
 *
 * Execução:
 *   cd apps/financeiro
 *   DATABASE_URL=... DIRECT_URL=... npx tsx prisma/seed.ts [--email user@email.com]
 *
 * Flags:
 *   --email <email>   Supabase e-mail do usuário que receberá os dados
 *   --reset           Limpa tudo do household antes de recriar (idempotente)
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── helpers ─────────────────────────────────────────────────────────────────

function d(yyyy: number, mm: number, dd: number) {
  return new Date(Date.UTC(yyyy, mm - 1, dd));
}

function ago(days: number) {
  const dt = new Date();
  dt.setUTCDate(dt.getUTCDate() - days);
  return dt;
}

function inDays(days: number) {
  const dt = new Date();
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt;
}

const now = new Date();
const Y = now.getUTCFullYear();
const M = now.getUTCMonth() + 1; // 1-12

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const emailIdx = args.indexOf("--email");
  const email = emailIdx >= 0 ? args[emailIdx + 1] : null;
  const reset = args.includes("--reset");

  // Localizar usuário
  let user = email ? await prisma.user.findFirst({ where: { email } }) : null;

  if (!user) {
    // Tenta pegar o primeiro usuário cadastrado
    user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  }

  if (!user) {
    console.error("❌ Nenhum usuário encontrado. Faça login no app primeiro e rode o seed novamente.");
    process.exit(1);
  }

  console.log(`\n👤 Usuário: ${user.email} (${user.id})`);

  // ─── Household ─────────────────────────────────────────────────────────────

  let household = await prisma.household.findFirst({
    where: { memberships: { some: { userId: user.id, role: "OWNER" } } },
  });

  if (!household) {
    household = await prisma.household.create({
      data: {
        name: "Casa Principal",
        slug: `casa-${user.id.slice(-6)}`,
        timezone: "America/Sao_Paulo",
        memberships: {
          create: { userId: user.id, role: "OWNER" },
        },
      },
    });
    console.log(`🏠 Household criado: "${household.name}" (${household.id})`);
  } else {
    console.log(`🏠 Household existente: "${household.name}" (${household.id})`);
  }

  if (reset) {
    console.log("🗑  Limpando dados existentes...");
    await prisma.expense.deleteMany({ where: { householdId: household.id } });
    await prisma.income.deleteMany({ where: { householdId: household.id } });
    await prisma.budget.deleteMany({ where: { householdId: household.id } });
    await prisma.category.deleteMany({ where: { householdId: household.id } });
    await prisma.source.deleteMany({ where: { householdId: household.id } });
    await prisma.rule.deleteMany({ where: { householdId: household.id } });
  }

  // ─── Fontes ──────────────────────────────────────────────────────────────────

  console.log("\n📌 Criando fontes de renda...");

  const membership = await prisma.householdMembership.findFirst({
    where: { userId: user.id, householdId: household.id },
  });

  const [srcSalary, srcFreela, srcDevFlow, srcEstudio] = await Promise.all([
    upsertSource(household.id, membership?.id, "Salário CLT", "PF", "Renda mensal fixa empregado"),
    upsertSource(household.id, membership?.id, "Freelas PF", "PF", "Projetos avulsos como pessoa física"),
    upsertSource(household.id, null, "DevFlow Labs", "PJ", "Receitas da empresa"),
    upsertSource(household.id, null, "Estúdio Compartilhado", "PJ", "Receitas do estúdio / sociedade"),
  ]);

  console.log(`  ✓ ${[srcSalary, srcFreela, srcDevFlow, srcEstudio].map((s) => s.name).join(" · ")}`);

  // ─── Categorias ──────────────────────────────────────────────────────────────

  console.log("\n🏷  Criando categorias...");

  const categories = await Promise.all([
    upsertCategory(household.id, "Moradia", "#6366f1"),
    upsertCategory(household.id, "Alimentação", "#f59e0b"),
    upsertCategory(household.id, "Transporte", "#3b82f6"),
    upsertCategory(household.id, "Saúde", "#10b981"),
    upsertCategory(household.id, "Educação", "#8b5cf6"),
    upsertCategory(household.id, "Lazer", "#ec4899"),
    upsertCategory(household.id, "Telecom", "#64748b"),
    upsertCategory(household.id, "Assinaturas", "#f97316"),
    upsertCategory(household.id, "Operacional PJ", "#0ea5e9"),
    upsertCategory(household.id, "Marketing", "#a855f7"),
    upsertCategory(household.id, "Sociedade", "#14b8a6"),
    upsertCategory(household.id, "Outros", "#94a3b8"),
  ]);

  const catMap = Object.fromEntries(categories.map((c) => [c.name, c]));
  console.log(`  ✓ ${categories.length} categorias`);

  // ─── Budgets mensais ─────────────────────────────────────────────────────────

  console.log("\n💰 Criando orçamentos mensais...");

  await Promise.all([
    upsertBudget(household.id, catMap["Moradia"].id, 2500),
    upsertBudget(household.id, catMap["Alimentação"].id, 1200),
    upsertBudget(household.id, catMap["Transporte"].id, 600),
    upsertBudget(household.id, catMap["Saúde"].id, 500),
    upsertBudget(household.id, catMap["Educação"].id, 400),
    upsertBudget(household.id, catMap["Lazer"].id, 300),
    upsertBudget(household.id, catMap["Telecom"].id, 200),
    upsertBudget(household.id, catMap["Assinaturas"].id, 150),
    upsertBudget(household.id, catMap["Operacional PJ"].id, 1500),
    upsertBudget(household.id, catMap["Marketing"].id, 800),
  ]);
  console.log("  ✓ 10 budgets mensais");

  // ─── Receitas ────────────────────────────────────────────────────────────────

  console.log("\n💚 Criando receitas...");

  // Mês atual
  const receivedAt = d(Y, M, 5);

  const incomeDefs = [
    // Pessoal
    { source: srcSalary, amount: 6800, date: d(Y, M, 5), ctx: "PERSONAL", recurring: true },
    { source: srcFreela, amount: 2200, date: d(Y, M, 15), ctx: "PERSONAL", recurring: false },
    // PJ
    { source: srcDevFlow, amount: 12000, date: d(Y, M, 1), ctx: "BUSINESS", recurring: true },
    { source: srcDevFlow, amount: 4500, date: d(Y, M, 20), ctx: "BUSINESS", recurring: false },
    // Estúdio
    { source: srcEstudio, amount: 3200, date: d(Y, M, 10), ctx: "SHARED", recurring: true },
    // Mês passado
    { source: srcSalary, amount: 6800, date: d(Y, M - 1 || 12, 5), ctx: "PERSONAL", recurring: true },
    { source: srcDevFlow, amount: 11500, date: d(Y, M - 1 || 12, 1), ctx: "BUSINESS", recurring: true },
    { source: srcEstudio, amount: 3200, date: d(Y, M - 1 || 12, 10), ctx: "SHARED", recurring: true },
  ] as const;

  for (const inc of incomeDefs) {
    await prisma.income.create({
      data: {
        householdId: household.id,
        sourceId: inc.source.id,
        amount: inc.amount,
        receivedAt: inc.date,
        status: "RECEIVED",
        isRecurring: inc.recurring,
        context: inc.ctx as "PERSONAL" | "BUSINESS" | "SHARED",
      },
    });
  }
  console.log(`  ✓ ${incomeDefs.length} receitas`);

  // ─── Despesas fixas (pagas) ──────────────────────────────────────────────────

  console.log("\n🔴 Criando despesas fixas pagas...");

  const fixedPaid = [
    // PERSONAL — pagas este mês
    { cat: "Moradia", label: "Aluguel", amount: 1800, day: 5, ctx: "PERSONAL", src: srcSalary, recurring: true },
    { cat: "Moradia", label: "Condomínio", amount: 420, day: 10, ctx: "PERSONAL", src: srcSalary, recurring: true },
    { cat: "Telecom", label: "Internet Vivo Fibra", amount: 99.90, day: 8, ctx: "PERSONAL", src: srcSalary, recurring: true },
    { cat: "Telecom", label: "Celular Tim", amount: 69.90, day: 8, ctx: "PERSONAL", src: srcSalary, recurring: true },
    { cat: "Saúde", label: "Plano de Saúde", amount: 380, day: 5, ctx: "PERSONAL", src: srcSalary, recurring: true },
    { cat: "Assinaturas", label: "Netflix", amount: 55.90, day: 3, ctx: "PERSONAL", src: srcSalary, recurring: true },
    { cat: "Assinaturas", label: "Spotify", amount: 21.90, day: 3, ctx: "PERSONAL", src: srcSalary, recurring: true },
    { cat: "Educação", label: "Curso de Inglês", amount: 189, day: 10, ctx: "PERSONAL", src: srcSalary, recurring: true },
    // BUSINESS — pagas
    { cat: "Operacional PJ", label: "Contador Mensal", amount: 350, day: 5, ctx: "BUSINESS", src: srcDevFlow, recurring: true },
    { cat: "Operacional PJ", label: "Servidor AWS", amount: 280, day: 1, ctx: "BUSINESS", src: srcDevFlow, recurring: true },
    { cat: "Operacional PJ", label: "GitHub Team", amount: 89, day: 1, ctx: "BUSINESS", src: srcDevFlow, recurring: true },
    { cat: "Marketing", label: "Google Ads", amount: 600, day: 1, ctx: "BUSINESS", src: srcDevFlow, recurring: false },
    // SHARED
    { cat: "Sociedade", label: "Aluguel Estúdio", amount: 1200, day: 5, ctx: "SHARED", src: srcEstudio, recurring: true },
    { cat: "Operacional PJ", label: "Software Adobe CC", amount: 249, day: 10, ctx: "SHARED", src: srcEstudio, recurring: true },
  ] as const;

  for (const e of fixedPaid) {
    const paidAt = d(Y, M, e.day);
    await prisma.expense.create({
      data: {
        householdId: household.id,
        sourceId: e.src.id,
        categoryId: catMap[e.cat].id,
        category: e.label,
        amount: e.amount,
        dueDate: paidAt,
        paidAt,
        paidAmount: e.amount,
        status: "PAID",
        isRecurring: e.recurring,
        context: e.ctx as "PERSONAL" | "BUSINESS" | "SHARED",
      },
    });
  }
  console.log(`  ✓ ${fixedPaid.length} despesas fixas pagas`);

  // ─── Despesas variáveis (pagas) ───────────────────────────────────────────────

  console.log("🟡 Criando despesas variáveis pagas...");

  const varPaid = [
    { cat: "Alimentação", label: "Mercado Extra", amount: 342.50, daysAgo: 3, ctx: "PERSONAL", src: srcSalary },
    { cat: "Alimentação", label: "iFood - Jantar", amount: 89.80, daysAgo: 5, ctx: "PERSONAL", src: srcSalary },
    { cat: "Alimentação", label: "Padaria Manhã", amount: 18.50, daysAgo: 7, ctx: "PERSONAL", src: srcSalary },
    { cat: "Alimentação", label: "Almoço Restaurante", amount: 52.00, daysAgo: 9, ctx: "PERSONAL", src: srcSalary },
    { cat: "Transporte", label: "Uber - reunião", amount: 32.90, daysAgo: 4, ctx: "PERSONAL", src: srcSalary },
    { cat: "Transporte", label: "Gasolina", amount: 180.00, daysAgo: 6, ctx: "PERSONAL", src: srcSalary },
    { cat: "Saúde", label: "Consulta médica", amount: 280.00, daysAgo: 10, ctx: "PERSONAL", src: srcSalary },
    { cat: "Saúde", label: "Farmácia", amount: 95.40, daysAgo: 8, ctx: "PERSONAL", src: srcSalary },
    { cat: "Lazer", label: "Cinema + pipoca", amount: 78.00, daysAgo: 12, ctx: "PERSONAL", src: srcSalary },
    { cat: "Lazer", label: "Barzinho - happy hour", amount: 120.00, daysAgo: 15, ctx: "PERSONAL", src: srcSalary },
    // PJ
    { cat: "Marketing", label: "Instagram Ads", amount: 450, daysAgo: 5, ctx: "BUSINESS", src: srcDevFlow },
    { cat: "Operacional PJ", label: "Frete entrega equipamento", amount: 85, daysAgo: 8, ctx: "BUSINESS", src: srcDevFlow },
    // Estúdio
    { cat: "Sociedade", label: "Material de escritório", amount: 145, daysAgo: 7, ctx: "SHARED", src: srcEstudio },
    { cat: "Sociedade", label: "Café e copa", amount: 68, daysAgo: 4, ctx: "SHARED", src: srcEstudio },
  ] as const;

  for (const e of varPaid) {
    const dt = ago(e.daysAgo);
    await prisma.expense.create({
      data: {
        householdId: household.id,
        sourceId: e.src.id,
        categoryId: catMap[e.cat].id,
        category: e.label,
        amount: e.amount,
        dueDate: dt,
        paidAt: dt,
        paidAmount: e.amount,
        status: "PAID",
        isRecurring: false,
        context: e.ctx as "PERSONAL" | "BUSINESS" | "SHARED",
      },
    });
  }
  console.log(`  ✓ ${varPaid.length} despesas variáveis pagas`);

  // ─── Despesas pendentes (próximas contas) ─────────────────────────────────────

  console.log("🟠 Criando despesas pendentes e vencidas...");

  const pendingExpenses = [
    // Próximas
    { cat: "Moradia", label: "IPTU (parcela)", amount: 380, daysIn: 5, ctx: "PERSONAL", src: srcSalary },
    { cat: "Saúde", label: "Academia Smart Fit", amount: 89.90, daysIn: 8, ctx: "PERSONAL", src: srcSalary },
    { cat: "Transporte", label: "IPVA (parcela)", amount: 420, daysIn: 12, ctx: "PERSONAL", src: srcSalary },
    { cat: "Operacional PJ", label: "Renovação domínio", amount: 75, daysIn: 15, ctx: "BUSINESS", src: srcDevFlow },
    { cat: "Sociedade", label: "Energia elétrica estúdio", amount: 230, daysIn: 10, ctx: "SHARED", src: srcEstudio },
    // Vencidas (atrasadas)
    { cat: "Alimentação", label: "Mercado (semana passada)", amount: 195, daysIn: -3, ctx: "PERSONAL", src: srcSalary },
    { cat: "Transporte", label: "Estacionamento mensal", amount: 320, daysIn: -5, ctx: "PERSONAL", src: srcSalary },
    { cat: "Operacional PJ", label: "Assinatura Figma", amount: 75, daysIn: -2, ctx: "BUSINESS", src: srcDevFlow },
  ] as const;

  for (const e of pendingExpenses) {
    await prisma.expense.create({
      data: {
        householdId: household.id,
        sourceId: e.src.id,
        categoryId: catMap[e.cat].id,
        category: e.label,
        amount: e.amount,
        dueDate: inDays(e.daysIn),
        status: "PENDING",
        isRecurring: false,
        context: e.ctx as "PERSONAL" | "BUSINESS" | "SHARED",
      },
    });
  }
  console.log(`  ✓ ${pendingExpenses.length} despesas pendentes`);

  // ─── Resumo ─────────────────────────────────────────────────────────────────

  const totalInc = await prisma.income.count({ where: { householdId: household.id } });
  const totalExp = await prisma.expense.count({ where: { householdId: household.id } });
  const totalCat = await prisma.category.count({ where: { householdId: household.id } });
  const totalBud = await prisma.budget.count({ where: { householdId: household.id } });

  console.log(`
✅ Seed concluído!
   Household : ${household.name}
   Receitas  : ${totalInc}
   Despesas  : ${totalExp}
   Categorias: ${totalCat}
   Budgets   : ${totalBud}

🚀 Acesse: http://localhost:3001/ferramentas/financeiro/dashboard
`);
}

// ─── Helpers upsert ────────────────────────────────────────────────────────────

async function upsertSource(
  householdId: string,
  membershipId: string | null | undefined,
  name: string,
  sourceType: "PJ" | "PF",
  description: string
) {
  const existing = await prisma.source.findFirst({ where: { householdId, name } });
  if (existing) return existing;
  return prisma.source.create({
    data: { householdId, membershipId: membershipId ?? null, name, sourceType, description, isActive: true },
  });
}

async function upsertCategory(householdId: string, name: string, color: string) {
  const existing = await prisma.category.findFirst({ where: { householdId, name } });
  if (existing) return existing;
  return prisma.category.create({ data: { householdId, name, color } });
}

async function upsertBudget(householdId: string, categoryId: string, monthlyLimit: number) {
  const existing = await prisma.budget.findFirst({ where: { householdId, categoryId } });
  if (existing) return existing;
  return prisma.budget.create({ data: { householdId, categoryId, monthlyLimit } });
}

// ─── run ──────────────────────────────────────────────────────────────────────

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
