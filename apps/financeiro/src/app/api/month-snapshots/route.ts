/**
 * GET  /api/month-snapshots          → lista todos os fechamentos do household
 * POST /api/month-snapshots          → cria/substitui fechamento de um mês
 *   Body: { year, month, notes? }
 */

import { NextRequest } from "next/server";
import { prisma } from "@/modules/financeiro/adapters/prisma/prismaFinanceiro";
import { sendError, sendSuccess } from "@/modules/financeiro/lib/api-response";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { z } from "zod";

const closeBodySchema = z.object({
  year:  z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
  notes: z.string().max(1000).optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;
  const { householdId } = auth.context;

  try {
    const snapshots = await prisma.monthSnapshot.findMany({
      where: { householdId },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });
    return sendSuccess(snapshots);
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível listar os fechamentos", 500, error);
  }
}

export async function POST(request: NextRequest) {
  const sameOrigin = assertSameOrigin(request);
  if (sameOrigin) return sameOrigin;

  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;
  const { householdId } = auth.context;

  try {
    const body = await request.json();
    const parse = closeBodySchema.safeParse(body);
    if (!parse.success) return sendError("Dados inválidos", 400, parse.error.format());

    const { year, month, notes } = parse.data;

    const start = new Date(Date.UTC(year, month - 1, 1));
    const end   = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    // Calcula totais reais do período
    const [incomeAgg, expenseAgg, pendingAgg] = await Promise.all([
      prisma.income.aggregate({
        where: { householdId, receivedAt: { gte: start, lte: end }, status: "RECEIVED" },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: { householdId, dueDate: { gte: start, lte: end }, status: "PAID" },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: { householdId, dueDate: { gte: start, lte: end }, status: { in: ["PENDING", "SCHEDULED"] } },
        _sum: { amount: true },
      }),
    ]);

    const totalIncomes    = Number(incomeAgg._sum.amount  ?? 0);
    const totalExpenses   = Number(expenseAgg._sum.amount ?? 0);
    const pendingExpenses = Number(pendingAgg._sum.amount ?? 0);
    const balance         = totalIncomes - totalExpenses;

    const snapshot = await prisma.monthSnapshot.upsert({
      where: { householdId_year_month: { householdId, year, month } },
      create: {
        householdId,
        year,
        month,
        totalIncomes,
        totalExpenses,
        pendingExpenses,
        balance,
        notes: notes ?? null,
        closedAt: new Date(),
      },
      update: {
        totalIncomes,
        totalExpenses,
        pendingExpenses,
        balance,
        notes: notes ?? null,
        closedAt: new Date(),
      },
    });

    return sendSuccess(snapshot, 201);
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível fechar o mês", 500, error);
  }
}
