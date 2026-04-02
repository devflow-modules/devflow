import { prisma } from "@/lib/prisma-root";
import type {
  WhatsappOnboardingStateRepository,
  WhatsappOnboardingStateRow,
} from "./whatsappOnboardingState.types";

function toRow(m: {
  id: string;
  wabaId: string;
  phoneNumberId: string;
  businessId: string | null;
  codeRequestedAt: Date | null;
  codeVerifiedAt: Date | null;
  registeredAt: Date | null;
  lastMetaErrorCode: number | null;
  lastMetaErrorMessage: string | null;
  lastOperation: string;
  lastOperationStatus: string;
  lastSuccessAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): WhatsappOnboardingStateRow {
  return { ...m };
}

const MSG_MAX = 1990;

export class PrismaWhatsappOnboardingStateRepository
  implements WhatsappOnboardingStateRepository
{
  async upsert(
    wabaId: string,
    phoneNumberId: string,
    patch: Parameters<WhatsappOnboardingStateRepository["upsert"]>[2]
  ): Promise<WhatsappOnboardingStateRow> {
    const msg =
      patch.lastMetaErrorMessage != null
        ? patch.lastMetaErrorMessage.slice(0, MSG_MAX)
        : undefined;
    const row = await prisma.whatsappOnboardingState.upsert({
      where: {
        wabaId_phoneNumberId: { wabaId, phoneNumberId },
      },
      create: {
        wabaId,
        phoneNumberId,
        businessId: patch.businessId ?? null,
        codeRequestedAt: patch.codeRequestedAt ?? null,
        codeVerifiedAt: patch.codeVerifiedAt ?? null,
        registeredAt: patch.registeredAt ?? null,
        lastMetaErrorCode: patch.lastMetaErrorCode ?? null,
        lastMetaErrorMessage: msg ?? null,
        lastOperation: patch.lastOperation ?? "NONE",
        lastOperationStatus: patch.lastOperationStatus ?? "UNKNOWN",
        lastSuccessAt: patch.lastSuccessAt ?? null,
      },
      update: {
        ...(patch.businessId !== undefined && { businessId: patch.businessId }),
        ...(patch.codeRequestedAt !== undefined && {
          codeRequestedAt: patch.codeRequestedAt,
        }),
        ...(patch.codeVerifiedAt !== undefined && {
          codeVerifiedAt: patch.codeVerifiedAt,
        }),
        ...(patch.registeredAt !== undefined && {
          registeredAt: patch.registeredAt,
        }),
        ...(patch.lastMetaErrorCode !== undefined && {
          lastMetaErrorCode: patch.lastMetaErrorCode,
        }),
        ...(patch.lastMetaErrorMessage !== undefined && {
          lastMetaErrorMessage: msg ?? patch.lastMetaErrorMessage,
        }),
        ...(patch.lastOperation !== undefined && {
          lastOperation: patch.lastOperation,
        }),
        ...(patch.lastOperationStatus !== undefined && {
          lastOperationStatus: patch.lastOperationStatus,
        }),
        ...(patch.lastSuccessAt !== undefined && {
          lastSuccessAt: patch.lastSuccessAt,
        }),
      },
    });
    return toRow(row);
  }

  async findByWabaAndPhone(
    wabaId: string,
    phoneNumberId: string
  ): Promise<WhatsappOnboardingStateRow | null> {
    const row = await prisma.whatsappOnboardingState.findUnique({
      where: { wabaId_phoneNumberId: { wabaId, phoneNumberId } },
    });
    return row ? toRow(row) : null;
  }
}
