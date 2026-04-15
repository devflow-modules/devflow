-- CreateEnum
CREATE TYPE "TenantGtmLifecycle" AS ENUM ('AVALIACAO', 'IMPLANTADO');

-- AlterTable
ALTER TABLE "whatsapp_tenants" ADD COLUMN "gtm_lifecycle" "TenantGtmLifecycle" NOT NULL DEFAULT 'AVALIACAO';
