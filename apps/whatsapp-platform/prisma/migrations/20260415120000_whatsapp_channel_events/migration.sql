-- Eventos de ativação / diagnóstico por canal WhatsApp.
CREATE TABLE IF NOT EXISTS "whatsapp_channel_events" (
    "id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_channel_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "whatsapp_channel_events_channel_id_created_at_idx"
  ON "whatsapp_channel_events"("channel_id", "created_at");

ALTER TABLE "whatsapp_channel_events"
  ADD CONSTRAINT "whatsapp_channel_events_channel_id_fkey"
  FOREIGN KEY ("channel_id") REFERENCES "whatsapp_phone_numbers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
