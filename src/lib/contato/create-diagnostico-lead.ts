import type { Lead } from "@prisma/client";
import { prisma } from "@/lib/prisma-root";
import {
  buildDiagnosticoLeadNotes,
  DIAGNOSTICO_LEAD_ORIGIN,
  DIAGNOSTICO_LEAD_STATUS,
  normalizeLeadPhone,
  type DiagnosticoLeadInput,
} from "@/lib/contato/diagnostico-lead";

/**
 * Persiste lead do formulário `/contato` no CRM interno.
 * Deduplicação por telefone: não implementada (dívida P1 — ver backlog P0-05).
 */
export async function createDiagnosticoLead(input: DiagnosticoLeadInput): Promise<Lead> {
  const company = input.empresa?.trim();
  return prisma.lead.create({
    data: {
      name: input.nome.trim(),
      company: company ? company : null,
      phone: normalizeLeadPhone(input.whatsapp),
      status: DIAGNOSTICO_LEAD_STATUS,
      origin: DIAGNOSTICO_LEAD_ORIGIN,
      notes: buildDiagnosticoLeadNotes(input),
    },
  });
}
