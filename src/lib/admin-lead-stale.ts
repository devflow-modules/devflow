import type { Prisma } from "@prisma/client";

/**
 * Dias inteiros desde o último contato (0 = hoje). `null` se nunca houver contato.
 */
export function daysSinceLastContactAt(
  lastContactAt: Date | string | null | undefined,
  now: Date = new Date()
): number | null {
  if (lastContactAt == null) return null;
  const t = lastContactAt instanceof Date ? lastContactAt : new Date(lastContactAt);
  if (Number.isNaN(t.getTime())) return null;
  const diff = now.getTime() - t.getTime();
  if (diff < 0) return 0;
  return Math.floor(diff / (24 * 60 * 60 * 1000));
}

/** Filtro: sem contato ou último contato há mais de 3 dias (operacional). */
export function buildStaleLeadWhereInput(now: Date = new Date()): Prisma.LeadWhereInput {
  const threshold = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  return {
    OR: [{ lastContactAt: null }, { lastContactAt: { lt: threshold } }],
  };
}

export type StalePresentKind = "nunca" | "sem_resposta" | "esfriando" | "critico" | "ok";

/**
 * Rótulo e gravidade para badges de acompanhamento (sem resposta / esfriando / crítico).
 */
export function getContactStalePresentation(
  lastContactAt: string | null | undefined,
  daysSince: number | null | undefined
): { kind: StalePresentKind; label: string } {
  if (lastContactAt == null) {
    return { kind: "nunca", label: "Nunca contatado" };
  }
  if (daysSince == null) return { kind: "ok", label: "" };
  if (daysSince > 7) return { kind: "critico", label: "Crítico" };
  if (daysSince > 5) return { kind: "esfriando", label: "Lead esfriando" };
  if (daysSince > 3) return { kind: "sem_resposta", label: `Sem resposta há ${daysSince} dias` };
  return { kind: "ok", label: "" };
}
