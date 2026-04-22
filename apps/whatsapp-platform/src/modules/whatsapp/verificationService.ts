import { MetaBusinessVerificationStatus } from "@/generated/prisma-whatsapp";
import { prisma } from "@/lib/prisma";
import { logChannelEvent } from "@/modules/whatsapp/channelEventService";

export type VerificationChecklistItem = {
  id: string;
  label: string;
  done: boolean;
};

export type VerificationChecklist = {
  items: VerificationChecklistItem[];
};

const DEFAULT_CHECKLIST_ITEMS: Omit<VerificationChecklistItem, "done">[] = [
  { id: "business_profile", label: "Perfil comercial e nome legal coerentes no Meta Business Suite" },
  { id: "domain_or_website", label: "Domínio ou site verificável (DNS / ficheiro / Business)" },
  { id: "legal_docs", label: "Documentação da entidade (NIF / contrato social ou equivalente)" },
  { id: "phone_match", label: "Número WABA alinhado com documentação e contacto oficial" },
  { id: "two_factor", label: "Segurança da conta Business (2FA / acesso controlado)" },
];

function defaultChecklist(): VerificationChecklist {
  return {
    items: DEFAULT_CHECKLIST_ITEMS.map((i) => ({ ...i, done: false })),
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Normaliza o JSON guardado: garante todos os itens default com merge de `done`.
 */
export function normalizeVerificationChecklist(raw: unknown): VerificationChecklist {
  const base = defaultChecklist();
  if (!isRecord(raw)) return base;
  const itemsRaw = raw.items;
  if (!Array.isArray(itemsRaw)) return base;

  const byId = new Map<string, boolean>();
  for (const it of itemsRaw) {
    if (!isRecord(it)) continue;
    const id = typeof it.id === "string" ? it.id : "";
    if (!id) continue;
    byId.set(id, Boolean(it.done));
  }

  return {
    items: base.items.map((item) => ({
      ...item,
      done: byId.has(item.id) ? Boolean(byId.get(item.id)) : item.done,
    })),
  };
}

export function computeReadinessScore(checklist: VerificationChecklist): number {
  if (!checklist.items.length) return 0;
  const done = checklist.items.filter((i) => i.done).length;
  return Math.round((done / checklist.items.length) * 100);
}

export type VerificationComputation = {
  readinessScore: number;
  /** Sugestão quando checklist 100% e ainda não marcado pronto. */
  suggestedStatus: MetaBusinessVerificationStatus | null;
};

/**
 * Cálculo puro: score e sugestão de estado (não persiste).
 */
export function computeVerificationStatus(
  checklist: VerificationChecklist,
  current: MetaBusinessVerificationStatus
): VerificationComputation {
  const readinessScore = computeReadinessScore(checklist);
  if (current === MetaBusinessVerificationStatus.NOT_STARTED && readinessScore === 100) {
    return { readinessScore, suggestedStatus: MetaBusinessVerificationStatus.READY_FOR_SUBMISSION };
  }
  return { readinessScore, suggestedStatus: null };
}

export type VerificationReadinessDto = {
  channelId: string;
  status: MetaBusinessVerificationStatus;
  checklist: VerificationChecklist;
  readinessScore: number;
  suggestedStatus: MetaBusinessVerificationStatus | null;
  verificationChecklistUpdatedAt: string | null;
  verificationReadyAt: string | null;
  verificationSubmittedAt: string | null;
  verificationApprovedAt: string | null;
  verificationRejectedAt: string | null;
};

export async function getVerificationReadiness(channelId: string): Promise<VerificationReadinessDto | null> {
  const row = await prisma.whatsappPhoneNumber.findUnique({
    where: { id: channelId },
    select: {
      id: true,
      verificationStatus: true,
      verificationChecklist: true,
      verificationChecklistUpdatedAt: true,
      verificationReadyAt: true,
      verificationSubmittedAt: true,
      verificationApprovedAt: true,
      verificationRejectedAt: true,
    },
  });
  if (!row) return null;

  const checklist = normalizeVerificationChecklist(row.verificationChecklist);
  const { readinessScore, suggestedStatus } = computeVerificationStatus(checklist, row.verificationStatus);

  return {
    channelId: row.id,
    status: row.verificationStatus,
    checklist,
    readinessScore,
    suggestedStatus,
    verificationChecklistUpdatedAt: row.verificationChecklistUpdatedAt?.toISOString() ?? null,
    verificationReadyAt: row.verificationReadyAt?.toISOString() ?? null,
    verificationSubmittedAt: row.verificationSubmittedAt?.toISOString() ?? null,
    verificationApprovedAt: row.verificationApprovedAt?.toISOString() ?? null,
    verificationRejectedAt: row.verificationRejectedAt?.toISOString() ?? null,
  };
}

export async function updateVerificationChecklist(
  channelId: string,
  input: { updates: Record<string, boolean> }
): Promise<VerificationReadinessDto | null> {
  const existing = await prisma.whatsappPhoneNumber.findUnique({
    where: { id: channelId },
    select: { verificationChecklist: true, verificationStatus: true },
  });
  if (!existing) return null;

  const merged = normalizeVerificationChecklist(existing.verificationChecklist);
  const prevScore = computeReadinessScore(merged);
  for (const item of merged.items) {
    if (Object.prototype.hasOwnProperty.call(input.updates, item.id)) {
      item.done = Boolean(input.updates[item.id]);
    }
  }

  const payload = { items: merged.items } as object;

  await prisma.whatsappPhoneNumber.update({
    where: { id: channelId },
    data: {
      verificationChecklist: payload,
      verificationChecklistUpdatedAt: new Date(),
    },
  });

  const { readinessScore } = computeVerificationStatus(merged, existing.verificationStatus);
  await logChannelEvent({
    channelId,
    type: "VERIFICATION_CHECKLIST_UPDATED",
    message: `Checklist de verificação Meta atualizada (prontidão ${readinessScore}%).`,
    metadata: { readinessScore },
  });
  if (prevScore < 100 && readinessScore === 100) {
    await logChannelEvent({
      channelId,
      type: "VERIFICATION_COMPUTED",
      message: "Verificação Meta: checklist 100% — pronto para marcar «Pronto para submissão».",
      metadata: { readinessScore, milestone: "checklist_complete" },
    });
  }

  return getVerificationReadiness(channelId);
}

export type VerificationAdminAction = "mark_ready" | "start" | "approve" | "reject";

function assertTransition(
  from: MetaBusinessVerificationStatus,
  action: VerificationAdminAction
): MetaBusinessVerificationStatus {
  switch (action) {
    case "mark_ready":
      if (
        from !== MetaBusinessVerificationStatus.NOT_STARTED &&
        from !== MetaBusinessVerificationStatus.REJECTED
      ) {
        throw new Error("Só é possível marcar pronto a partir de NOT_STARTED ou REJECTED.");
      }
      return MetaBusinessVerificationStatus.READY_FOR_SUBMISSION;
    case "start":
      if (from !== MetaBusinessVerificationStatus.READY_FOR_SUBMISSION) {
        throw new Error("Iniciar revisão só a partir de READY_FOR_SUBMISSION.");
      }
      return MetaBusinessVerificationStatus.IN_REVIEW;
    case "approve":
      if (from !== MetaBusinessVerificationStatus.IN_REVIEW) {
        throw new Error("Aprovar só no estado IN_REVIEW.");
      }
      return MetaBusinessVerificationStatus.APPROVED;
    case "reject":
      if (from !== MetaBusinessVerificationStatus.IN_REVIEW) {
        throw new Error("Rejeitar só no estado IN_REVIEW.");
      }
      return MetaBusinessVerificationStatus.REJECTED;
    default:
      throw new Error("Ação inválida.");
  }
}

export async function setVerificationStatus(
  channelId: string,
  action: VerificationAdminAction,
  options?: { note?: string }
): Promise<VerificationReadinessDto | null> {
  const row = await prisma.whatsappPhoneNumber.findUnique({
    where: { id: channelId },
    select: { verificationStatus: true, verificationChecklist: true },
  });
  if (!row) return null;

  if (action === "mark_ready") {
    const checklist = normalizeVerificationChecklist(row.verificationChecklist);
    const { readinessScore } = computeVerificationStatus(checklist, row.verificationStatus);
    if (readinessScore < 100) {
      throw new Error("Checklist incompleta: conclua 100% antes de marcar pronto para submissão.");
    }
  }

  const next = assertTransition(row.verificationStatus, action);
  const now = new Date();

  const data: {
    verificationStatus: MetaBusinessVerificationStatus;
    verificationReadyAt?: Date;
    verificationSubmittedAt?: Date;
    verificationApprovedAt?: Date;
    verificationRejectedAt?: Date;
  } = { verificationStatus: next };
  if (action === "mark_ready") data.verificationReadyAt = now;
  if (action === "start") data.verificationSubmittedAt = now;
  if (action === "approve") data.verificationApprovedAt = now;
  if (action === "reject") data.verificationRejectedAt = now;

  await prisma.whatsappPhoneNumber.update({
    where: { id: channelId },
    data,
  });

  const labels: Record<VerificationAdminAction, string> = {
    mark_ready: "Verificação Meta: marcada pronta para submissão.",
    start: "Verificação Meta: revisão / submissão iniciada.",
    approve: "Verificação Meta: aprovada (registo operacional).",
    reject: "Verificação Meta: rejeitada (registo operacional).",
  };

  await logChannelEvent({
    channelId,
    type: "VERIFICATION_STATUS_CHANGED",
    message: labels[action],
    metadata: { action, from: row.verificationStatus, to: next, note: options?.note?.slice(0, 500) ?? null },
  });

  return getVerificationReadiness(channelId);
}
