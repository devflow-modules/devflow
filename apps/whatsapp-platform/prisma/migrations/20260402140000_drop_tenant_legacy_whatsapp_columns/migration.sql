-- Copiar credenciais legadas de whatsapp_tenants → whatsapp_phone_numbers (só se as colunas existirem).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'whatsapp_tenants'
      AND column_name = 'phone_number_id'
  ) THEN
    INSERT INTO "whatsapp_phone_numbers" (
      "id",
      "tenant_id",
      "phone_number_id",
      "display_phone_number",
      "access_token",
      "status",
      "created_at",
      "updated_at"
    )
    SELECT
      'mig_' || lower(substr(md5(random()::text || t.id || t.phone_number_id), 1, 22)),
      t.id,
      btrim(t.phone_number_id),
      t.display_phone_number,
      t.access_token,
      'ACTIVE'::"WhatsappPhoneNumberStatus",
      CURRENT_TIMESTAMP(3),
      CURRENT_TIMESTAMP(3)
    FROM "whatsapp_tenants" t
    WHERE t.phone_number_id IS NOT NULL
      AND btrim(t.phone_number_id) <> ''
      AND t.access_token IS NOT NULL
      AND btrim(t.access_token) <> ''
      AND NOT EXISTS (
        SELECT 1 FROM "whatsapp_phone_numbers" w
        WHERE w.phone_number_id = btrim(t.phone_number_id)
      );
  END IF;
END $$;

DROP INDEX IF EXISTS "whatsapp_tenants_phone_number_id_key";

ALTER TABLE "whatsapp_tenants" DROP COLUMN IF EXISTS "phone_number_id";
ALTER TABLE "whatsapp_tenants" DROP COLUMN IF EXISTS "display_phone_number";
ALTER TABLE "whatsapp_tenants" DROP COLUMN IF EXISTS "access_token";
