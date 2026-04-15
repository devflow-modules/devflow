import { TenantGtmLifecycle } from "@/generated/prisma-whatsapp";
import type { CommissionSkipReason } from "./implantationCommission";

export const COMMISSION_SKIP_REASON_LABELS: Record<CommissionSkipReason, string> = {
  NO_AFFILIATE: "Sem afiliado vinculado",
  NO_IMPLANTATION_PRICE: "Valor de implantação não definido",
  NOT_IMPLANTADO: "Cliente ainda não implantado",
  AFFILIATE_NOT_FOUND: "Afiliado não encontrado na base",
};

/** Quando tudo está preenchido mas a linha de comissão ainda não existe (ex.: antes do primeiro PATCH). */
export const REASON_AGUARDANDO_SINCRONIZACAO = "AGUARDANDO_SINCRONIZACAO" as const;

export type ImplantationCommissionBlockState =
  | { kind: "pendente"; amount: number }
  | { kind: "pago"; amount: number }
  | {
      kind: "sem_geracao";
      reasonCode: CommissionSkipReason | typeof REASON_AGUARDANDO_SINCRONIZACAO;
      reasonLabel: string;
    };

type TenantSlice = {
  affiliateId: string | null;
  implantationPriceBrl: number | null;
  gtmLifecycle: string;
};

/**
 * Estado explícito da comissão de implantação para UI admin (espelha as regras de `ensureImplantationCommission`).
 */
export function getImplantationCommissionBlockState(
  tenant: TenantSlice,
  affiliateRow: { id: string } | null,
  commission: { amount: number; status: string } | null
): ImplantationCommissionBlockState {
  if (commission) {
    if (commission.status === "pago") return { kind: "pago", amount: commission.amount };
    return { kind: "pendente", amount: commission.amount };
  }

  if (!tenant.affiliateId) {
    return {
      kind: "sem_geracao",
      reasonCode: "NO_AFFILIATE",
      reasonLabel: COMMISSION_SKIP_REASON_LABELS.NO_AFFILIATE,
    };
  }
  if (!affiliateRow) {
    return {
      kind: "sem_geracao",
      reasonCode: "AFFILIATE_NOT_FOUND",
      reasonLabel: COMMISSION_SKIP_REASON_LABELS.AFFILIATE_NOT_FOUND,
    };
  }
  if (tenant.gtmLifecycle !== TenantGtmLifecycle.IMPLANTADO) {
    return {
      kind: "sem_geracao",
      reasonCode: "NOT_IMPLANTADO",
      reasonLabel: COMMISSION_SKIP_REASON_LABELS.NOT_IMPLANTADO,
    };
  }
  if (tenant.implantationPriceBrl == null || tenant.implantationPriceBrl <= 0) {
    return {
      kind: "sem_geracao",
      reasonCode: "NO_IMPLANTATION_PRICE",
      reasonLabel: COMMISSION_SKIP_REASON_LABELS.NO_IMPLANTATION_PRICE,
    };
  }

  return {
    kind: "sem_geracao",
    reasonCode: REASON_AGUARDANDO_SINCRONIZACAO,
    reasonLabel:
      "Ainda não gerada — guarde o valor de implantação ou altere o ciclo GTM para IMPLANTADO para criar a linha.",
  };
}
