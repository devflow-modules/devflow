-- CreateTable
CREATE TABLE "whatsapp_affiliates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "commission_rate" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_affiliates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_commissions" (
    "id" TEXT NOT NULL,
    "affiliate_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_commissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_commissions_tenant_id_type_key" ON "whatsapp_commissions"("tenant_id", "type");

-- CreateIndex
CREATE INDEX "whatsapp_commissions_affiliate_id_idx" ON "whatsapp_commissions"("affiliate_id");

-- CreateIndex
CREATE INDEX "whatsapp_commissions_affiliate_id_status_idx" ON "whatsapp_commissions"("affiliate_id", "status");

-- AlterTable
ALTER TABLE "whatsapp_tenants" ADD COLUMN "affiliate_id" TEXT;

-- CreateIndex
CREATE INDEX "whatsapp_tenants_affiliate_id_idx" ON "whatsapp_tenants"("affiliate_id");

-- AddForeignKey
ALTER TABLE "whatsapp_commissions" ADD CONSTRAINT "whatsapp_commissions_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "whatsapp_affiliates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_commissions" ADD CONSTRAINT "whatsapp_commissions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "whatsapp_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_tenants" ADD CONSTRAINT "whatsapp_tenants_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "whatsapp_affiliates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
