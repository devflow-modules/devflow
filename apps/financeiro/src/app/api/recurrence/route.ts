/**
 * POST /api/recurrence
 *
 * Gera instâncias mensais de despesas e receitas recorrentes para o mês/ano alvo.
 * É idempotente: se a instância já existe (via recurrenceParentId + mês/ano), não duplica.
 *
 * Body:
 *   { year: number, month: number }   ← mês alvo (1-12)
 */

import { NextRequest } from "next/server";
import { prisma } from "@/modules/financeiro/adapters/prisma/prismaFinanceiro";
import { sendError, sendSuccess } from "@/modules/financeiro/lib/api-response";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { z } from "zod";

const bodySchema = z.object({
  year:  z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
});

export async function POST(request: NextRequest) {
  const sameOrigin = assertSameOrigin(request);
  if (sameOrigin) return sameOrigin;

  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;
  const { householdId } = auth.context;

  try {
    const body = await request.json();
    const parse = bodySchema.safeParse(body);
    if (!parse.success) return sendError("year e month são obrigatórios", 400, parse.error.format());

    const { year, month } = parse.data;

    // Primeiro dia do mês alvo
    const targetMonthStart = new Date(Date.UTC(year, month - 1, 1));
    const targetMonthEnd   = new Date(Date.UTC(year, month, 0)); // último dia do mês

    let expensesCreated = 0;
    let expensesSkipped = 0;
    let incomesCreated  = 0;
    let incomesSkipped  = 0;

    // ── Despesas recorrentes ────────────────────────────────────────────────────

    const recurringExpenses = await prisma.expense.findMany({
      where: {
        householdId,
        isRecurring: true,
        recurrenceParentId: null, // apenas templates (não instâncias geradas)
        status: { not: "PAID" }, // exclui pagas que já podem ter sido desmarcadas
      },
    });

    for (const template of recurringExpenses) {
      // Calcula a dueDate no mês alvo (mesmo dia do template, limitado ao último dia do mês)
      const originalDay = new Date(template.dueDate).getUTCDate();
      const maxDay = targetMonthEnd.getUTCDate();
      const targetDay = Math.min(originalDay, maxDay);
      const targetDueDate = new Date(Date.UTC(year, month - 1, targetDay));

      // Verifica se já existe instância para este template neste mês
      const existing = await prisma.expense.findFirst({
        where: {
          householdId,
          recurrenceParentId: template.id,
          dueDate: { gte: targetMonthStart, lte: targetMonthEnd },
        },
      });

      if (existing) {
        expensesSkipped++;
        continue;
      }

      await prisma.expense.create({
        data: {
          householdId,
          sourceId: template.sourceId,
          categoryId: template.categoryId,
          category: template.category,
          amount: template.amount,
          dueDate: targetDueDate,
          isRecurring: false, // instância não é template
          recurrenceParentId: template.id,
          status: "PENDING",
          note: template.note,
          context: template.context,
        },
      });
      expensesCreated++;
    }

    // ── Receitas recorrentes ────────────────────────────────────────────────────

    const recurringIncomes = await prisma.income.findMany({
      where: {
        householdId,
        isRecurring: true,
        recurrenceParentId: null,
      },
    });

    for (const template of recurringIncomes) {
      const originalDay = new Date(template.receivedAt).getUTCDate();
      const maxDay = targetMonthEnd.getUTCDate();
      const targetDay = Math.min(originalDay, maxDay);
      const targetDate = new Date(Date.UTC(year, month - 1, targetDay));

      const existing = await prisma.income.findFirst({
        where: {
          householdId,
          recurrenceParentId: template.id,
          receivedAt: { gte: targetMonthStart, lte: targetMonthEnd },
        },
      });

      if (existing) {
        incomesSkipped++;
        continue;
      }

      await prisma.income.create({
        data: {
          householdId,
          sourceId: template.sourceId,
          amount: template.amount,
          receivedAt: targetDate,
          isRecurring: false,
          recurrenceParentId: template.id,
          status: "SCHEDULED",
          notes: template.notes,
          context: template.context,
        },
      });
      incomesCreated++;
    }

    return sendSuccess({
      year,
      month,
      expenses: { created: expensesCreated, skipped: expensesSkipped },
      incomes:  { created: incomesCreated,  skipped: incomesSkipped },
    });
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível gerar recorrências", 500, error);
  }
}

/**
 * GET /api/recurrence?year=&month=
 * Retorna quantas instâncias já existem no mês para o household.
 */
export async function GET(request: NextRequest) {
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;
  const { householdId } = auth.context;

  const { searchParams } = new URL(request.url);
  const year  = Number(searchParams.get("year")  ?? new Date().getFullYear());
  const month = Number(searchParams.get("month") ?? (new Date().getMonth() + 1));

  const start = new Date(Date.UTC(year, month - 1, 1));
  const end   = new Date(Date.UTC(year, month, 0));

  const [expenseCount, incomeCount, templateExpenseCount, templateIncomeCount] = await Promise.all([
    prisma.expense.count({ where: { householdId, recurrenceParentId: { not: null }, dueDate: { gte: start, lte: end } } }),
    prisma.income.count({ where: { householdId, recurrenceParentId: { not: null }, receivedAt: { gte: start, lte: end } } }),
    prisma.expense.count({ where: { householdId, isRecurring: true, recurrenceParentId: null } }),
    prisma.income.count({ where: { householdId, isRecurring: true, recurrenceParentId: null } }),
  ]);

  return sendSuccess({
    year, month,
    templates: { expenses: templateExpenseCount, incomes: templateIncomeCount },
    instances: { expenses: expenseCount, incomes: incomeCount },
  });
}
