import { prisma } from "@/lib/prisma";
import { WhatsappPhoneNumberStatus } from "@/generated/prisma-whatsapp";
import type { ParsedWaInbound } from "@/modules/inbox/waInboxWebhookParser";

const RUN = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function pgEvidenceRunId(): string {
  return RUN;
}

export async function createPgEvidenceTenant(label: string) {
  return prisma.tenant.create({
    data: { name: `pg-evidence-${label}-${RUN}` },
  });
}

export async function createPgEvidenceUser(tenantId: string, label: string, role = "operator") {
  return prisma.user.create({
    data: {
      tenantId,
      email: `pg-ev-${label}-${RUN}@example.test`,
      passwordHash: "test-hash-not-real",
      name: `PG Evidence ${label}`,
      role,
    },
  });
}

export async function createPgEvidencePhoneLine(tenantId: string, suffix: string) {
  const phoneNumberId = `pg-ev-pnid-${suffix}-${RUN}`;
  return prisma.whatsappPhoneNumber.create({
    data: {
      tenantId,
      phoneNumberId,
      displayPhoneNumber: "+5511999990000",
      status: WhatsappPhoneNumberStatus.ACTIVE,
      isPrimary: true,
    },
  });
}

export function inboundFixture(waMessageId: string, from = "5511888777666"): ParsedWaInbound {
  return {
    waMessageId,
    from,
    type: "text",
    field: "messages",
    timestamp: String(Math.floor(Date.now() / 1000)),
    contactName: "PG Lab",
    displayPhone: "5511999990000",
    raw: { text: { body: "pg evidence inbound" } },
  };
}

export async function deletePgEvidenceTenant(tenantId: string): Promise<void> {
  await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => undefined);
}
