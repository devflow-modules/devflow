import type { PhoneNumberListItem } from "./whatsappOnboarding.types";

const PHONE_FIELDS =
  "id,display_phone_number,verified_name,code_verification_status,quality_rating,platform_type,is_official_business_account,throughput";

export function phoneFields(): string {
  return PHONE_FIELDS;
}

export function mapPhoneRow(row: Record<string, unknown>): PhoneNumberListItem {
  const t = row.throughput as { level?: string } | undefined;
  return {
    id: String(row.id ?? ""),
    display_phone_number: row.display_phone_number as string | undefined,
    verified_name: row.verified_name as string | undefined,
    code_verification_status: row.code_verification_status as string | undefined,
    quality_rating: row.quality_rating as string | undefined,
    platform_type: row.platform_type as string | undefined,
    is_official_business_account: row.is_official_business_account as
      | boolean
      | undefined,
    throughput: t ? { level: t.level } : undefined,
  };
}

/**
 * Status de “display name” na API pública: use verified_name + webhooks phone_number_name_update.
 * TODO: se Meta expuser campo explícito de revisão no nó Phone Number, incluir aqui.
 */
export function inferDisplayNameNote(verifiedName?: string): {
  verifiedName?: string;
  reviewNote: string;
} {
  return {
    verifiedName,
    reviewNote:
      "Aprovação de nome de exibição pode ser assíncrona; monitore webhook phone_number_name_update e o Gerenciador de Negócios.",
  };
}
