-- Multi-linha WhatsApp: flags por tenant + conversa por (tenant, cliente, linha Meta).

ALTER TABLE "whatsapp_phone_numbers" ADD COLUMN IF NOT EXISTS "is_primary" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "whatsapp_phone_numbers" ADD COLUMN IF NOT EXISTS "is_default_outbound" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "whatsapp_phone_numbers" ADD COLUMN IF NOT EXISTS "label" TEXT;

-- Um número primário e um default outbound por tenant (apenas linhas com is_primary / is_default_outbound = true).
CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_phone_numbers_one_primary_per_tenant"
  ON "whatsapp_phone_numbers" ("tenant_id")
  WHERE "is_primary" = true;

CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_phone_numbers_one_default_outbound_per_tenant"
  ON "whatsapp_phone_numbers" ("tenant_id")
  WHERE "is_default_outbound" = true;

-- Marcar primeira linha ACTIVE por tenant como primária e default de envio.
WITH ranked AS (
  SELECT "id",
    ROW_NUMBER() OVER (PARTITION BY "tenant_id" ORDER BY "created_at" ASC) AS rn
  FROM "whatsapp_phone_numbers"
  WHERE "status" = 'ACTIVE'
)
UPDATE "whatsapp_phone_numbers" w
SET "is_primary" = true, "is_default_outbound" = true
FROM ranked r
WHERE w."id" = r."id" AND r.rn = 1;

-- Tenants só com PENDING: mesma lógica sem filtro de status.
WITH ranked AS (
  SELECT "id",
    ROW_NUMBER() OVER (PARTITION BY "tenant_id" ORDER BY "created_at" ASC) AS rn
  FROM "whatsapp_phone_numbers" w2
  WHERE NOT EXISTS (
    SELECT 1 FROM "whatsapp_phone_numbers" x
    WHERE x."tenant_id" = w2."tenant_id" AND x."is_primary" = true
  )
)
UPDATE "whatsapp_phone_numbers" w
SET "is_primary" = true, "is_default_outbound" = true
FROM ranked r
WHERE w."id" = r."id" AND r.rn = 1;

ALTER TABLE "wa_inbox_threads" ADD COLUMN IF NOT EXISTS "business_phone_number_id" TEXT;

UPDATE "wa_inbox_threads" t
SET "business_phone_number_id" = (
  SELECT w."phone_number_id"
  FROM "whatsapp_phone_numbers" w
  WHERE w."tenant_id" = t."tenant_id" AND w."is_primary" = true AND w."status" = 'ACTIVE'
  LIMIT 1
)
WHERE t."business_phone_number_id" IS NULL;

UPDATE "wa_inbox_threads" t
SET "business_phone_number_id" = (
  SELECT w."phone_number_id"
  FROM "whatsapp_phone_numbers" w
  WHERE w."tenant_id" = t."tenant_id" AND w."status" = 'ACTIVE'
  ORDER BY w."updated_at" DESC
  LIMIT 1
)
WHERE t."business_phone_number_id" IS NULL;

-- Fallback extremo: qualquer linha do tenant.
UPDATE "wa_inbox_threads" t
SET "business_phone_number_id" = (
  SELECT w."phone_number_id"
  FROM "whatsapp_phone_numbers" w
  WHERE w."tenant_id" = t."tenant_id"
  ORDER BY w."updated_at" DESC
  LIMIT 1
)
WHERE t."business_phone_number_id" IS NULL;

DELETE FROM "wa_inbox_status_history"
WHERE "message_id" IN (
  SELECT m."id" FROM "wa_inbox_messages" m
  INNER JOIN "wa_inbox_threads" t ON m."thread_id" = t."id"
  WHERE t."business_phone_number_id" IS NULL
);
DELETE FROM "wa_inbox_messages"
WHERE "thread_id" IN (SELECT "id" FROM "wa_inbox_threads" WHERE "business_phone_number_id" IS NULL);
DELETE FROM "wa_inbox_thread_tags"
WHERE "thread_id" IN (SELECT "id" FROM "wa_inbox_threads" WHERE "business_phone_number_id" IS NULL);
DELETE FROM "wa_inbox_threads" WHERE "business_phone_number_id" IS NULL;

DROP INDEX IF EXISTS "wa_inbox_threads_tenant_id_phone_number_key";

ALTER TABLE "wa_inbox_threads" ALTER COLUMN "business_phone_number_id" SET NOT NULL;

CREATE UNIQUE INDEX "wa_inbox_threads_tenant_id_phone_number_business_phone_number_id_key"
  ON "wa_inbox_threads" ("tenant_id", "phone_number", "business_phone_number_id");

ALTER TABLE "wa_inbox_messages" ADD COLUMN IF NOT EXISTS "business_phone_number_id" TEXT;

UPDATE "wa_inbox_messages" m
SET "business_phone_number_id" = t."business_phone_number_id"
FROM "wa_inbox_threads" t
WHERE m."thread_id" = t."id";

DELETE FROM "wa_inbox_status_history"
WHERE "message_id" IN (SELECT "id" FROM "wa_inbox_messages" WHERE "business_phone_number_id" IS NULL);
DELETE FROM "wa_inbox_messages" WHERE "business_phone_number_id" IS NULL;

ALTER TABLE "wa_inbox_messages" ALTER COLUMN "business_phone_number_id" SET NOT NULL;
