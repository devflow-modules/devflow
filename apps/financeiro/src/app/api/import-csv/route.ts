import { NextRequest } from "next/server";
import { prisma } from "@/modules/financeiro/adapters/prisma/prismaFinanceiro";
import { sendError, sendSuccess } from "@/modules/financeiro/lib/api-response";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { dateInputToDate } from "@/lib/dates";
import { z } from "zod";

const importRowSchema = z.object({
  date: z.string().min(1),
  description: z.string().min(1),
  amount: z.number(),
  context: z.enum(["PERSONAL", "BUSINESS", "SHARED"]).optional().default("PERSONAL"),
  sourceId: z.string().cuid().optional(),
  categoryId: z.string().cuid().optional(),
});

const importBodySchema = z.object({
  rows: z.array(importRowSchema).min(1).max(500),
  defaultContext: z.enum(["PERSONAL", "BUSINESS", "SHARED"]).optional().default("PERSONAL"),
  defaultSourceId: z.string().cuid().optional(),
});

const CATEGORY_HEURISTICS: Array<{ keywords: string[]; category: string }> = [
  { keywords: ["aluguel", "aluguel", "rent", "moradia"], category: "Moradia" },
  { keywords: ["mercado", "supermercado", "alimentação", "aliment", "comida", "restaurante", "lanche", "ifood"], category: "Alimentação" },
  { keywords: ["uber", "99", "taxi", "gasolina", "combustível", "pedágio", "onibus", "metrô", "transport"], category: "Transporte" },
  { keywords: ["conta de luz", "energia", "enel", "celpe", "copel", "eletricidade"], category: "Energia" },
  { keywords: ["internet", "claro", "vivo", "tim", "oi ", "net ", "telecom"], category: "Telecom" },
  { keywords: ["farmácia", "remédio", "saúde", "médico", "hospital", "plano"], category: "Saúde" },
  { keywords: ["academia", "gym", "personal", "esporte"], category: "Esporte" },
  { keywords: ["netflix", "spotify", "amazon", "assinatura", "streaming"], category: "Assinaturas" },
  { keywords: ["escola", "faculdade", "curso", "educação", "livro"], category: "Educação" },
  { keywords: ["salão", "barbearia", "manicure", "cabeleireiro"], category: "Beleza" },
  { keywords: ["viagem", "passagem", "hotel", "airbnb", "hospedagem"], category: "Viagem" },
];

function guessCategory(description: string): string {
  const lower = description.toLowerCase();
  for (const { keywords, category } of CATEGORY_HEURISTICS) {
    if (keywords.some((k) => lower.includes(k))) return category;
  }
  return "Outros";
}

export async function POST(request: NextRequest) {
  const sameOrigin = assertSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;
  const { householdId, userId } = auth.context;

  try {
    const body = await request.json();
    const parseResult = importBodySchema.safeParse(body);
    if (!parseResult.success) {
      return sendError("Dados inválidos", 400, parseResult.error.format());
    }

    const { rows, defaultContext, defaultSourceId } = parseResult.data;
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of rows) {
      try {
        const amount = Math.abs(row.amount);
        if (amount <= 0) { skipped++; continue; }

        const categoryName = guessCategory(row.description);
        const context = row.context ?? defaultContext;
        const sourceId = row.sourceId ?? defaultSourceId ?? null;

        await prisma.expense.create({
          data: {
            householdId,
            category: categoryName,
            amount,
            dueDate: dateInputToDate(row.date),
            context,
            isRecurring: false,
            status: "PAID",
            paidAt: dateInputToDate(row.date),
            paidAmount: amount,
            note: row.description,
            ...(sourceId ? { sourceId } : {}),
            ...(row.categoryId ? { categoryId: row.categoryId } : {}),
          },
        });
        created++;
      } catch (err) {
        skipped++;
        errors.push(`Linha "${row.description}": ${String(err)}`);
      }
    }

    await prisma.auditLog.create({
      data: {
        householdId,
        userId,
        action: "CSV_IMPORT",
        entityType: "Expense",
        metadata: { created, skipped, total: rows.length },
      },
    }).catch(() => { /* non-critical */ });

    return sendSuccess({ created, skipped, total: rows.length, errors: errors.slice(0, 10) }, 201);
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível importar o CSV", 500, error);
  }
}
