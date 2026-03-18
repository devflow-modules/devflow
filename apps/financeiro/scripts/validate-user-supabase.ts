/**
 * Tarefa 4 — validar vínculo User.supabaseId (executar com dotenv + DIRECT_URL).
 * Uso: pnpm exec dotenv -e ../../.env.local -e .env -- tsx scripts/validate-user-supabase.ts
 */
import { PrismaClient } from "@prisma/client";

async function main() {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) {
    console.error("DIRECT_URL ou DATABASE_URL ausente");
    process.exit(1);
  }
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    const total = await prisma.user.count();
    const semSupabase = await prisma.user.count({ where: { supabaseId: null } });
    const comSupabase = total - semSupabase;

    const amostra = await prisma.user.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, supabaseId: true },
    });

    console.log("--- Validação User.supabaseId ---");
    console.log(`Total usuários: ${total}`);
    console.log(`Com supabaseId: ${comSupabase}`);
    console.log(`Sem supabaseId (null): ${semSupabase}`);
    console.log("");
    console.log("Últimos 20 (id, email, supabaseId):");
    for (const u of amostra) {
      const ok = u.supabaseId ? "✓" : "✗ null";
      console.log(`  ${ok} ${u.email} | supabaseId=${u.supabaseId ?? "NULL"}`);
    }

    if (semSupabase > 0 && total > 0) {
      console.log(
        "\n⚠ Há usuários sem supabaseId — conferir se são só seeds ou contas que nunca logaram."
      );
    } else {
      console.log("\n✓ Nenhum usuário com supabaseId nulo (ou base vazia).");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
