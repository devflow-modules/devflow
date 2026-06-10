import type { Lead } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma-root";
import { getWhatsappCrmPrisma } from "@/lib/whatsapp-crm-db";

export const CONVERTED_TO_TYPE_WHATSAPP_PLATFORM = "whatsapp_platform" as const;

export const convertLeadToPilotSchema = z.object({
  tenantId: z.string().trim().min(1, "Informe o tenant da WhatsApp Platform.").max(128),
  confirm: z.literal(true, {
    errorMap: () => ({ message: "Confirmação obrigatória para converter o lead." }),
  }),
  internalOwner: z.string().trim().max(200).optional(),
});

export type ConvertLeadToPilotInput = z.infer<typeof convertLeadToPilotSchema>;

export type WhatsappPilotTenantSummary = {
  id: string;
  name: string | null;
  gtmLifecycle: string;
  whatsappPhone: string | null;
  channels: Array<{
    displayPhoneNumber: string | null;
    wabaId: string | null;
    phoneNumberId: string;
    status: string;
  }>;
};

export class LeadPilotConversionError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "LeadPilotConversionError";
  }
}

function appendLeadNotes(existing: string | null | undefined, block: string): string {
  const base = existing?.trim();
  const merged = base ? `${base}\n\n${block}` : block;
  return merged.length > 10_000 ? `${merged.slice(0, 9_997)}...` : merged;
}

export function buildPilotConversionNote(input: {
  leadId: string;
  tenant: WhatsappPilotTenantSummary;
  internalOwner?: string;
  convertedAt: Date;
}): string {
  const channelLines =
    input.tenant.channels.length > 0
      ? input.tenant.channels.map(
          (c, i) =>
            `  ${i + 1}. número: ${c.displayPhoneNumber ?? "—"} | WABA ID: ${c.wabaId ?? "—"} | Phone Number ID: ${c.phoneNumberId} | status: ${c.status}`
        )
      : ["  (nenhum canal provisionado ainda — ver /admin/whatsapp no app WhatsApp Platform)"];

  const lines = [
    "[Piloto WhatsApp Platform — conversão CRM]",
    `Data: ${input.convertedAt.toISOString()}`,
    `Lead ID: ${input.leadId}`,
    `Tenant ID: ${input.tenant.id}`,
    `Tenant nome: ${input.tenant.name ?? "—"}`,
    `Status piloto (GTM): ${input.tenant.gtmLifecycle}`,
    `WhatsApp tenant (legado): ${input.tenant.whatsappPhone ?? "—"}`,
    `Responsável interno: ${input.internalOwner?.trim() || "—"}`,
    "Canais registrados (IDs públicos Meta — sem tokens):",
    ...channelLines,
    "Próximo passo: docs/whatsapp-platform/PILOT-RUNBOOK.md e LEAD-TO-TENANT-PILOT.md",
  ];
  return lines.join("\n");
}

function isWhatsappDbUnavailableError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes("WHATSAPP_DATABASE_URL") &&
    error.message.includes("necessário")
  );
}

function mapTenantRow(tenant: {
  id: string;
  name: string | null;
  gtmLifecycle: string;
  whatsappPhone: string | null;
  whatsappPhoneNumbers: Array<{
    displayPhoneNumber: string | null;
    wabaId: string | null;
    phoneNumberId: string;
    status: string;
    accessToken: string | null;
  }>;
}): WhatsappPilotTenantSummary {
  return {
    id: tenant.id,
    name: tenant.name,
    gtmLifecycle: tenant.gtmLifecycle,
    whatsappPhone: tenant.whatsappPhone,
    channels: tenant.whatsappPhoneNumbers.map((row) => {
      const { accessToken, ...channel } = row;
      void accessToken;
      return channel;
    }),
  };
}

export type WhatsappPilotTenantLookup =
  | { kind: "found"; tenant: WhatsappPilotTenantSummary }
  | { kind: "not_found" }
  | { kind: "db_unavailable" };

export async function loadWhatsappPilotTenantSummary(
  tenantId: string
): Promise<WhatsappPilotTenantLookup> {
  try {
    const wa = getWhatsappCrmPrisma();
    const tenant = await wa.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        gtmLifecycle: true,
        whatsappPhone: true,
        whatsappPhoneNumbers: {
          select: {
            displayPhoneNumber: true,
            wabaId: true,
            phoneNumberId: true,
            status: true,
            accessToken: true,
          },
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
          take: 5,
        },
      },
    });
    if (!tenant) return { kind: "not_found" };
    return { kind: "found", tenant: mapTenantRow(tenant) };
  } catch (error) {
    if (isWhatsappDbUnavailableError(error)) return { kind: "db_unavailable" };
    throw error;
  }
}

export async function listWhatsappPilotTenantsForAdmin(): Promise<
  Array<{ id: string; name: string | null; gtmLifecycle: string; whatsappPhone: string | null }>
> {
  const wa = getWhatsappCrmPrisma();
  return wa.tenant.findMany({
    select: {
      id: true,
      name: true,
      gtmLifecycle: true,
      whatsappPhone: true,
    },
    orderBy: [{ name: "asc" }, { id: "asc" }],
  });
}

function fallbackTenantSummary(tenantId: string): WhatsappPilotTenantSummary {
  return {
    id: tenantId,
    name: null,
    gtmLifecycle: "AVALIACAO",
    whatsappPhone: null,
    channels: [],
  };
}

export async function convertLeadToWhatsappPilot(
  leadId: string,
  input: ConvertLeadToPilotInput
): Promise<Lead> {
  const current = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!current) {
    throw new LeadPilotConversionError("NOT_FOUND", 404, "Lead não encontrado.");
  }
  if (current.convertedAt != null) {
    throw new LeadPilotConversionError("ALREADY_CONVERTED", 409, "Lead já convertido.");
  }

  const lookup = await loadWhatsappPilotTenantSummary(input.tenantId);
  let tenantForNote: WhatsappPilotTenantSummary;

  if (lookup.kind === "found") {
    tenantForNote = lookup.tenant;
  } else if (lookup.kind === "db_unavailable") {
    if (process.env.NODE_ENV !== "development") {
      throw new LeadPilotConversionError(
        "WHATSAPP_DB_UNAVAILABLE",
        503,
        "Base WhatsApp Platform indisponível. Configure WHATSAPP_DATABASE_URL."
      );
    }
    tenantForNote = fallbackTenantSummary(input.tenantId);
  } else {
    throw new LeadPilotConversionError(
      "TENANT_NOT_FOUND",
      404,
      "Tenant não encontrado na WhatsApp Platform."
    );
  }

  const now = new Date();
  const pilotNote = buildPilotConversionNote({
    leadId,
    tenant: tenantForNote,
    internalOwner: input.internalOwner,
    convertedAt: now,
  });

  return prisma.lead.update({
    where: { id: leadId },
    data: {
      convertedAt: now,
      convertedToType: CONVERTED_TO_TYPE_WHATSAPP_PLATFORM,
      convertedToRef: input.tenantId,
      status: "fechado",
      lastContactAt: now,
      notes: appendLeadNotes(current.notes, pilotNote),
    },
  });
}
