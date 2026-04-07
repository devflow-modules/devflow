-- Remove legado Prisma: fila e mensagens/conversas paralelas a wa_inbox_*.
DROP TABLE IF EXISTS "whatsapp_conversation_queue";
DROP TABLE IF EXISTS "whatsapp_messages";
DROP TABLE IF EXISTS "whatsapp_conversations";
