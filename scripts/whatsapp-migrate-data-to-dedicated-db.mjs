#!/usr/bin/env node
/**
 * Migração de dados WhatsApp: banco compartilhado → banco dedicado.
 * Ordem respeitando FKs: tenants → users → conversations → messages → faqs → conversation_queue → agent_status → message_feedback.
 *
 * Uso:
 *   SOURCE_DATABASE_URL="postgresql://..." WHATSAPP_DATABASE_URL="postgresql://..." node scripts/whatsapp-migrate-data-to-dedicated-db.mjs
 *
 * Pré-requisito: schema já aplicado no destino (prisma migrate deploy no whatsapp-webhook-api com WHATSAPP_*).
 * Instalar pg se necessário: pnpm add -D pg
 */

const TABLES_IN_ORDER = [
  "whatsapp_tenants",
  "whatsapp_users",
  "whatsapp_conversations",
  "whatsapp_messages",
  "whatsapp_faqs",
  "whatsapp_conversation_queue",
  "whatsapp_agent_status",
  "whatsapp_message_feedback",
];

async function main() {
  const pg = await import("pg");
  const sourceUrl = process.env.SOURCE_DATABASE_URL;
  const targetUrl = process.env.WHATSAPP_DATABASE_URL;

  if (!sourceUrl || !targetUrl) {
    console.error("Defina SOURCE_DATABASE_URL e WHATSAPP_DATABASE_URL.");
    process.exit(1);
  }

  const sourceClient = new pg.default.Client({ connectionString: sourceUrl });
  const targetClient = new pg.default.Client({ connectionString: targetUrl });

  try {
    await sourceClient.connect();
    await targetClient.connect();
  } catch (err) {
    console.error("Erro ao conectar:", err.message);
    process.exit(1);
  }

  for (const table of TABLES_IN_ORDER) {
    try {
      const countRes = await sourceClient.query(
        `SELECT COUNT(*)::int AS c FROM "${table}"`
      );
      const count = countRes.rows[0]?.c ?? 0;
      if (count === 0) {
        console.log(`[${table}] 0 rows (skip).`);
        continue;
      }

      const colsRes = await sourceClient.query({
        text: `SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
        values: [table],
      });
      const columns = colsRes.rows.map((r) => r.column_name);
      const colsList = columns.map((c) => `"${c}"`).join(", ");
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
      const insertSql = `INSERT INTO "${table}" (${colsList}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`;

      const selectRes = await sourceClient.query(`SELECT * FROM "${table}"`);
      let inserted = 0;
      for (const row of selectRes.rows) {
        const values = columns.map((col) => row[col]);
        const res = await targetClient.query({
          text: insertSql,
          values,
        });
        if (res.rowCount > 0) inserted += res.rowCount;
      }
      console.log(`[${table}] source=${count} copied=${inserted}.`);
    } catch (err) {
      console.error(`[${table}] erro:`, err.message);
      await sourceClient.end();
      await targetClient.end();
      process.exit(1);
    }
  }

  await sourceClient.end();
  await targetClient.end();
  console.log("Migração de dados concluída. Rode a validação (contagens e FKs) no doc Block 2.");
}

main();
