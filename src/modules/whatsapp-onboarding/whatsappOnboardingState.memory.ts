import type {
  WhatsappOnboardingStateRepository,
  WhatsappOnboardingStateRow,
} from "./whatsappOnboardingState.types";

export class MemoryWhatsappOnboardingStateRepository
  implements WhatsappOnboardingStateRepository
{
  private store = new Map<string, WhatsappOnboardingStateRow>();

  private key(w: string, p: string) {
    return `${w}:${p}`;
  }

  async upsert(
    wabaId: string,
    phoneNumberId: string,
    patch: Parameters<WhatsappOnboardingStateRepository["upsert"]>[2]
  ): Promise<WhatsappOnboardingStateRow> {
    const k = this.key(wabaId, phoneNumberId);
    const prev = this.store.get(k);
    const now = new Date();
    const row: WhatsappOnboardingStateRow = {
      id: prev?.id ?? `mem-${k}`,
      wabaId,
      phoneNumberId,
      businessId:
        patch.businessId !== undefined ? patch.businessId : prev?.businessId ?? null,
      codeRequestedAt:
        patch.codeRequestedAt !== undefined
          ? patch.codeRequestedAt
          : prev?.codeRequestedAt ?? null,
      codeVerifiedAt:
        patch.codeVerifiedAt !== undefined
          ? patch.codeVerifiedAt
          : prev?.codeVerifiedAt ?? null,
      registeredAt:
        patch.registeredAt !== undefined
          ? patch.registeredAt
          : prev?.registeredAt ?? null,
      lastMetaErrorCode:
        patch.lastMetaErrorCode !== undefined
          ? patch.lastMetaErrorCode
          : prev?.lastMetaErrorCode ?? null,
      lastMetaErrorMessage:
        patch.lastMetaErrorMessage !== undefined
          ? patch.lastMetaErrorMessage
          : prev?.lastMetaErrorMessage ?? null,
      lastOperation: patch.lastOperation ?? prev?.lastOperation ?? "NONE",
      lastOperationStatus:
        patch.lastOperationStatus ?? prev?.lastOperationStatus ?? "UNKNOWN",
      lastSuccessAt:
        patch.lastSuccessAt !== undefined
          ? patch.lastSuccessAt
          : prev?.lastSuccessAt ?? null,
      createdAt: prev?.createdAt ?? now,
      updatedAt: now,
    };
    this.store.set(k, row);
    return row;
  }

  async findByWabaAndPhone(
    wabaId: string,
    phoneNumberId: string
  ): Promise<WhatsappOnboardingStateRow | null> {
    return this.store.get(this.key(wabaId, phoneNumberId)) ?? null;
  }

  clear() {
    this.store.clear();
  }
}
