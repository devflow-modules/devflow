import { prisma } from "../lib/prisma.js";

const DEFAULT_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID ?? "";
const DEFAULT_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN ?? "";
const DEFAULT_DISPLAY_PHONE = process.env.WHATSAPP_DISPLAY_PHONE_NUMBER ?? "";

export type ResolvedTenant = {
  id: string;
  name: string | null;
  phoneNumberId: string;
  displayPhoneNumber: string;
  accessToken: string;
  systemPrompt: string | null;
  businessType: string | null;
};

function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

export type ResolveTenantInput = {
  /** Meta WhatsApp phone number ID (from webhook payload) */
  phoneNumberId?: string;
  /** Normalized phone number (e.g. 5511999999999) for lookup by whatsapp_phone */
  phone?: string;
  /** API key from header X-API-Key or Authorization: Bearer <key> */
  apiKey?: string;
  /** Subdomain from Host header (e.g. tenant1.example.com -> tenant1) */
  subdomain?: string;
};

export class TenantService {
  /**
   * Resolve tenant by one of: phone number (phoneNumberId or whatsapp_phone), API key, or subdomain.
   * Tries in order: subdomain (if present) -> apiKey (if present) -> phoneNumberId -> phone.
   */
  async resolveTenant(input: ResolveTenantInput): Promise<ResolvedTenant | null> {
    if (input.subdomain) {
      const bySub = await this.resolveBySubdomain(input.subdomain);
      if (bySub) return bySub;
    }
    if (input.apiKey) {
      const byKey = await this.resolveByApiKey(input.apiKey);
      if (byKey) return byKey;
    }
    if (input.phoneNumberId) {
      const byPhoneId = await this.resolveByPhoneNumberId(input.phoneNumberId);
      if (byPhoneId) return byPhoneId;
    }
    if (input.phone) {
      const byPhone = await this.resolveByPhone(input.phone);
      if (byPhone) return byPhone;
    }
    return null;
  }

  async resolveByPhoneNumberId(phoneNumberId: string): Promise<ResolvedTenant | null> {
    const fromDb = await prisma.tenant.findUnique({
      where: { phoneNumberId },
    });

    if (fromDb) {
      return this.toResolved(fromDb);
    }

    if (phoneNumberId === DEFAULT_PHONE_NUMBER_ID && DEFAULT_ACCESS_TOKEN) {
      const tenant = await prisma.tenant.upsert({
        where: { phoneNumberId: DEFAULT_PHONE_NUMBER_ID },
        create: {
          phoneNumberId: DEFAULT_PHONE_NUMBER_ID,
          displayPhoneNumber: DEFAULT_DISPLAY_PHONE,
          accessToken: DEFAULT_ACCESS_TOKEN,
        },
        update: { accessToken: DEFAULT_ACCESS_TOKEN, updatedAt: new Date() },
      });
      return this.toResolved(tenant);
    }

    return null;
  }

  /** Resolve by normalized phone (whatsapp_phone field). */
  async resolveByPhone(phone: string): Promise<ResolvedTenant | null> {
    const normalized = normalizePhone(phone);
    if (!normalized) return null;
    const tenant = await prisma.tenant.findFirst({
      where: { whatsappPhone: normalized },
    });
    return tenant ? this.toResolved(tenant) : null;
  }

  /** Resolve by API key (X-API-Key header or Authorization: Bearer <key>). */
  async resolveByApiKey(apiKey: string): Promise<ResolvedTenant | null> {
    const key = apiKey.trim();
    if (!key) return null;
    const tenant = await prisma.tenant.findUnique({
      where: { apiKey: key },
    });
    return tenant ? this.toResolved(tenant) : null;
  }

  /** Resolve by subdomain (e.g. tenant1 from Host: tenant1.example.com). */
  async resolveBySubdomain(subdomain: string): Promise<ResolvedTenant | null> {
    const slug = subdomain.trim().toLowerCase();
    if (!slug) return null;
    const tenant = await prisma.tenant.findUnique({
      where: { subdomain: slug },
    });
    return tenant ? this.toResolved(tenant) : null;
  }

  private toResolved(t: {
    id: string;
    name: string | null;
    phoneNumberId: string;
    displayPhoneNumber: string | null;
    accessToken: string;
    systemPrompt: string | null;
    businessType: string | null;
  }): ResolvedTenant {
    return {
      id: t.id,
      name: t.name ?? null,
      phoneNumberId: t.phoneNumberId,
      displayPhoneNumber: t.displayPhoneNumber ?? "",
      accessToken: t.accessToken,
      systemPrompt: t.systemPrompt ?? null,
      businessType: t.businessType ?? null,
    };
  }
}

export const tenantService = new TenantService();
