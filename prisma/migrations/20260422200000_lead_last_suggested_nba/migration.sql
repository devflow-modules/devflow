-- Próxima ação (NBA) — apena logging opcional do operador, sem lógica automática.
ALTER TABLE "outbound_leads" ADD COLUMN "last_suggested_action_type" TEXT;
