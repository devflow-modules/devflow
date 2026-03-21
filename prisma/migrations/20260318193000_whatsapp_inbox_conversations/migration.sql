-- WhatsApp Inbox: conversas + mensagens + histórico de status

CREATE TYPE "WhatsappConversationStatus" AS ENUM ('OPEN', 'CLOSED', 'PENDING');
CREATE TYPE "WhatsappInboxDirection" AS ENUM ('INBOUND', 'OUTBOUND');
CREATE TYPE "WhatsappInboxMessageType" AS ENUM ('TEXT', 'IMAGE', 'AUDIO', 'DOCUMENT', 'UNKNOWN');
CREATE TYPE "WhatsappInboxDeliveryStatus" AS ENUM ('RECEIVED', 'SENT', 'DELIVERED', 'READ', 'FAILED');

CREATE TABLE "WhatsappConversation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "phoneNumber" TEXT NOT NULL,
    "contactName" TEXT,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "lastMessagePreview" VARCHAR(512),
    "status" "WhatsappConversationStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsappConversation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WhatsappConversation_phoneNumber_key" ON "WhatsappConversation"("phoneNumber");
CREATE INDEX "WhatsappConversation_lastMessageAt_idx" ON "WhatsappConversation"("lastMessageAt" DESC);

CREATE TABLE "WhatsappInboxMessage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "conversationId" UUID NOT NULL,
    "waMessageId" TEXT NOT NULL,
    "direction" "WhatsappInboxDirection" NOT NULL,
    "fromNumber" TEXT NOT NULL,
    "toNumber" TEXT NOT NULL,
    "messageType" "WhatsappInboxMessageType" NOT NULL,
    "contentText" TEXT,
    "contentJson" JSONB,
    "ts" TIMESTAMP(3) NOT NULL,
    "status" "WhatsappInboxDeliveryStatus" NOT NULL,
    "errorCode" TEXT,
    "errorMessage" VARCHAR(2000),
    "rawPayload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsappInboxMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WhatsappInboxMessage_waMessageId_key" ON "WhatsappInboxMessage"("waMessageId");
CREATE INDEX "WhatsappInboxMessage_conversationId_ts_idx" ON "WhatsappInboxMessage"("conversationId", "ts" ASC);

ALTER TABLE "WhatsappInboxMessage"
ADD CONSTRAINT "WhatsappInboxMessage_conversationId_fkey"
FOREIGN KEY ("conversationId") REFERENCES "WhatsappConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "WhatsappMessageStatusHistory" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "messageId" UUID NOT NULL,
    "status" "WhatsappInboxDeliveryStatus" NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawPayload" JSONB,

    CONSTRAINT "WhatsappMessageStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WhatsappMessageStatusHistory_messageId_ts_idx" ON "WhatsappMessageStatusHistory"("messageId", "ts" ASC);

ALTER TABLE "WhatsappMessageStatusHistory"
ADD CONSTRAINT "WhatsappMessageStatusHistory_messageId_fkey"
FOREIGN KEY ("messageId") REFERENCES "WhatsappInboxMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
