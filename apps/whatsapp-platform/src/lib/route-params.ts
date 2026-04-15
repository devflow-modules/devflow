import { z } from "zod";

const cuidSchema = z.string().cuid();

/** IDs de recurso Prisma (cuid). Rejeita formato inválido antes de consultas. */
export function parseCuidParam(value: string): string | null {
  const r = cuidSchema.safeParse(value.trim());
  return r.success ? r.data : null;
}
