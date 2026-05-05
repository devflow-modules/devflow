-- Multi-number per tenant: index for deterministic ordering (policy + listagens por tenant).
CREATE INDEX "whatsapp_phone_numbers_tenant_id_created_at_idx" ON "whatsapp_phone_numbers" ("tenant_id", "created_at");
