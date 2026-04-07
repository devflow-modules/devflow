-- CreateTable
CREATE TABLE "whatsapp_user_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "whatsapp_user_sessions_user_id_idx" ON "whatsapp_user_sessions"("user_id");

-- CreateIndex
CREATE INDEX "whatsapp_user_sessions_user_id_revoked_at_idx" ON "whatsapp_user_sessions"("user_id", "revoked_at");

-- AddForeignKey
ALTER TABLE "whatsapp_user_sessions" ADD CONSTRAINT "whatsapp_user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "whatsapp_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
