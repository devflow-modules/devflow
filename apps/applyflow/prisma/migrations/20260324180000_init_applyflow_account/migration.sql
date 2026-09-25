-- CreateTable
CREATE TABLE "applyflow_accounts" (
    "id" UUID NOT NULL,
    "auth_provider_sub" TEXT NOT NULL,
    "email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applyflow_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "applyflow_accounts_auth_provider_sub_key" ON "applyflow_accounts"("auth_provider_sub");
