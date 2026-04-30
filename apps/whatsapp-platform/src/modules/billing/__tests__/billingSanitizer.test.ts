import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { SubscriptionView, UsageDashboard } from "../billingService";
import type { TenantBillingUI } from "../tenantBillingUIService";

describe("billingSanitizer", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("env → isWhiteLabelBillingApi", () => {
    it("WHITE_LABEL", async () => {
      vi.resetModules();
      vi.unstubAllEnvs();
      vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "WHITE_LABEL");
      const { isWhiteLabelBillingApi } = await import("../billingSanitizer");
      expect(isWhiteLabelBillingApi()).toBe(true);
    });

    it("SAAS", async () => {
      vi.resetModules();
      vi.unstubAllEnvs();
      vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "SAAS");
      const { isWhiteLabelBillingApi } = await import("../billingSanitizer");
      expect(isWhiteLabelBillingApi()).toBe(false);
    });
  });

  describe("isBillingFullAccessUser", () => {
    beforeEach(() => {
      vi.resetModules();
      vi.unstubAllEnvs();
      vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "SAAS");
    });

    it("platform_admin tem acesso completo", async () => {
      const { isBillingFullAccessUser } = await import("../billingSanitizer");
      expect(isBillingFullAccessUser({ role: "platform_admin" })).toBe(true);
    });

    it("manager não é admin de billing", async () => {
      const { isBillingFullAccessUser } = await import("../billingSanitizer");
      expect(isBillingFullAccessUser({ role: "manager" })).toBe(false);
    });
  });

  describe("WHITE_LABEL + manager — remove dados sensíveis", () => {
    beforeEach(() => {
      vi.resetModules();
      vi.unstubAllEnvs();
      vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "WHITE_LABEL");
    });

    const manager = { role: "manager" as const };

    it("sanitizeSubscriptionView só mantém status operacional mínimo", async () => {
      const { sanitizeSubscriptionView } = await import("../billingSanitizer");
      const raw: SubscriptionView = {
        plan: "PRO",
        tenantCreatedAt: "2024-01-01",
        status: "active",
        stripeCustomerId: "cus_x",
        stripeSubscriptionId: "sub_x",
        currentPeriodStart: "2024-01-01",
        currentPeriodEnd: "2024-02-01",
        cancelAtPeriodEnd: false,
        activeUntil: null,
        meteredBillingConfigured: true,
        lastInvoiceId: "in_1",
        lastInvoiceStatus: "paid",
        lastInvoiceAmountPaid: 9900,
      };
      const safe = sanitizeSubscriptionView(raw, manager);
      expect(safe).toEqual({ status: "active", cancelAtPeriodEnd: false });
      expect(safe).not.toHaveProperty("plan");
      expect(safe).not.toHaveProperty("stripeCustomerId");
    });

    it("sanitizeUsageDashboard remove preços, limites e metering", async () => {
      const { sanitizeUsageDashboard } = await import("../billingSanitizer");
      const raw: UsageDashboard = {
        period: "2025-03",
        messagesSent: 10,
        aiResponses: 3,
        limits: { messagesPerMonth: 100, aiResponsesPerMonth: 50 },
        unitPricesBrl: { message: 0.05, aiResponse: 0.1 },
        estimatedVariableCostBrl: 1.2,
        withinLimits: { messages: true, ai: true },
        allowsMeteredOverage: true,
        enforceLimits: false,
      };
      const safe = sanitizeUsageDashboard(raw, manager);
      expect(safe).toEqual({
        period: "2025-03",
        withinLimits: { messages: true, ai: true },
        enforceLimits: false,
      });
    });

    it("sanitizeTenantBillingUI retorna objeto vazio", async () => {
      const { sanitizeTenantBillingUI } = await import("../billingSanitizer");
      const raw: TenantBillingUI = {
        plan: "PRO",
        tenantCreatedAt: null,
        status: "active",
        hasStripeCustomer: true,
        messagesUsed: 1,
        messagesLimit: 100,
        aiUsed: 2,
        aiLimit: 50,
        usagePercentageMessages: 1,
        usagePercentageAI: 4,
        overageMessages: 0,
        overageAI: 0,
        estimatedOverageCost: 0,
        messageUnitPriceBrl: 0.05,
        aiUnitPriceBrl: 0.1,
        nextInvoiceDate: null,
        lastInvoiceAmount: null,
        lastInvoiceStatus: null,
        allowsMeteredOverage: true,
        enforceLimits: true,
      };
      expect(sanitizeTenantBillingUI(raw, manager)).toEqual({});
    });

    it("sanitizeAiPlanPayload retorna vazio", async () => {
      const { sanitizeAiPlanPayload } = await import("../billingSanitizer");
      expect(
        sanitizeAiPlanPayload(
          { plan: "PRO", plan_name: "Pro", ai_limit: 100, ai_limit_label: "100/mês" },
          manager
        )
      ).toEqual({});
    });

    it("sanitizeAiUsageStatusPayload mantém só gating operacional", async () => {
      const { sanitizeAiUsageStatusPayload } = await import("../billingSanitizer");
      const safe = sanitizeAiUsageStatusPayload(
        {
          used: 80,
          limit: 100,
          percent_used: 80,
          can_use: true,
          should_fallback_to_legacy: false,
          period: "2025-03",
          plan: "STARTER",
          ai_overage_billed: 2,
          ai_overage_cost_brl: 1.5,
        },
        manager
      );
      expect(safe).toEqual({
        can_use: true,
        should_fallback_to_legacy: false,
        period: "2025-03",
      });
    });

    it("sanitizeBillingData remove chaves no topo e em data", async () => {
      const { sanitizeBillingData } = await import("../billingSanitizer");
      const out = sanitizeBillingData(
        {
          foo: 1,
          plan: "X",
          stripeCustomerId: "cus",
          data: { nested: true, price: 9.99 },
        },
        manager
      );
      expect(out).toEqual({ foo: 1, data: { nested: true } });
    });
  });

  describe("WHITE_LABEL + platform_admin — dados completos", () => {
    beforeEach(() => {
      vi.resetModules();
      vi.unstubAllEnvs();
      vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "WHITE_LABEL");
    });

    const admin = { role: "platform_admin" as const };

    it("subscription inalterada", async () => {
      const { sanitizeSubscriptionView } = await import("../billingSanitizer");
      const raw: SubscriptionView = {
        plan: "PRO",
        tenantCreatedAt: null,
        status: "active",
        stripeCustomerId: "cus_x",
        stripeSubscriptionId: "sub_x",
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        activeUntil: null,
        meteredBillingConfigured: false,
        lastInvoiceId: null,
        lastInvoiceStatus: null,
        lastInvoiceAmountPaid: null,
      };
      expect(sanitizeSubscriptionView(raw, admin)).toBe(raw);
    });

    it("ai-plan inalterado", async () => {
      const { sanitizeAiPlanPayload } = await import("../billingSanitizer");
      const p = { plan: "PRO", plan_name: "Pro", ai_limit: 100, ai_limit_label: "100" };
      expect(sanitizeAiPlanPayload(p, admin)).toBe(p);
    });
  });

  describe("SAAS — sem sanitização", () => {
    beforeEach(() => {
      vi.resetModules();
      vi.unstubAllEnvs();
      vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "SAAS");
    });

    it("manager vê payload completo de ai-usage", async () => {
      const { sanitizeAiUsageStatusPayload } = await import("../billingSanitizer");
      const raw = {
        used: 1,
        limit: 100,
        percent_used: 1,
        can_use: true,
        should_fallback_to_legacy: false,
        period: "2025-03",
        plan: "FREE",
      };
      expect(sanitizeAiUsageStatusPayload(raw, { role: "manager" })).toBe(raw);
    });
  });

  describe("tenant me + feature gate + usage limit (WHITE_LABEL)", () => {
    beforeEach(() => {
      vi.resetModules();
      vi.unstubAllEnvs();
      vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "WHITE_LABEL");
    });

    it("sanitizeTenantMeGetPayload remove plan", async () => {
      const { sanitizeTenantMeGetPayload } = await import("../billingSanitizer");
      const out = sanitizeTenantMeGetPayload(
        { id: "t", name: "X", plan: "PRO", gtmLifecycle: "AVALIACAO" },
        { role: "manager" }
      );
      expect(out).toEqual({ id: "t", name: "X", gtmLifecycle: "AVALIACAO" });
    });

    it("sanitizeAiUsageRouteMetrics remove custo", async () => {
      const { sanitizeAiUsageRouteMetrics } = await import("../billingSanitizer");
      const out = sanitizeAiUsageRouteMetrics(
        {
          messages_total: 1,
          ai_messages_total: 2,
          fallback_total: 0,
          tokens_used_total: 99,
          estimated_cost_usd: 0.5,
        },
        { role: "operator" }
      );
      expect(out).toEqual({ messages_total: 1, ai_messages_total: 2, fallback_total: 0 });
    });

    it("sanitizeUsageLimitErrorPayload remove currentPlan", async () => {
      const { sanitizeUsageLimitErrorPayload } = await import("../billingSanitizer");
      const out = sanitizeUsageLimitErrorPayload(
        {
          message: "upgrade",
          code: "USAGE_LIMIT_EXCEEDED",
          currentPlan: "FREE",
          upgradeRequired: true,
          feature: "ai",
        },
        { role: "manager" }
      );
      expect(out).not.toHaveProperty("currentPlan");
      expect(out).not.toHaveProperty("upgradeRequired");
    });

    it("sanitizeFeatureNotAvailablePayload remove plan keys", async () => {
      const { sanitizeFeatureNotAvailablePayload } = await import("../billingSanitizer");
      const out = sanitizeFeatureNotAvailablePayload(
        {
          success: false,
          code: "FEATURE_NOT_AVAILABLE",
          feature: "QUEUES_TAGS",
          currentPlan: "FREE",
          requiredPlan: "OPERATIONAL_BASE",
          message: "upgrade",
        },
        { role: "manager" }
      );
      expect(out).not.toHaveProperty("currentPlan");
      expect(out).not.toHaveProperty("requiredPlan");
    });
  });
});
