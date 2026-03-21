import { loadMetaOnboardingEnv } from "./whatsappOnboarding.env";
import { MetaGraphClient } from "./metaGraphClient";
import { mapMetaError } from "./whatsappOnboarding.errors";
import { onboardingLog } from "./whatsappOnboarding.logger";
import {
  inferDisplayNameNote,
  mapPhoneRow,
  phoneFields,
} from "./whatsappOnboarding.mapper";
import {
  phoneNumbersResponseSchema,
  successBoolSchema,
} from "./whatsappOnboarding.schemas";
import type {
  CodeDeliveryMethod,
  MappedMetaError,
  PhoneNumberListItem,
  PrerequisitesResult,
} from "./whatsappOnboarding.types";
import { buildOperationalHealth } from "./whatsappOnboarding.health.mapper";
import { getOnboardingStateRepository, safePersist } from "./whatsappOnboarding.persistence";
import { LastOperation, LastOperationStatus } from "./whatsappOnboarding.operational.enums";
import {
  isCloudApiRegistered,
  isCodeVerifiedOnMeta,
  isRegisterAlreadySatisfiedError,
} from "./whatsappOnboarding.registration";
import type { OperationalHealthPayload, RegisterResult } from "./whatsappOnboardingState.types";

function clientFromEnv() {
  const env = loadMetaOnboardingEnv();
  const token = env.effectiveAccessToken;
  if (!token) return { client: null as MetaGraphClient | null, env };
  return {
    client: new MetaGraphClient(token, env.META_API_VERSION, {
      timeoutMs: 30_000,
      maxRetries: 2,
    }),
    env,
  };
}

export function resolvePhoneId(
  env: ReturnType<typeof loadMetaOnboardingEnv>,
  override?: string
): string | null {
  return (override?.trim() || env.META_PHONE_NUMBER_ID?.trim()) ?? null;
}

function mappedFromError(e: unknown): MappedMetaError | null {
  if (e instanceof Error && "mapped" in e) {
    return (e as Error & { mapped: MappedMetaError }).mapped;
  }
  return null;
}

async function syncStateFromMetaPhone(
  wabaId: string,
  phoneNumberId: string,
  businessId: string | null | undefined,
  phone: PhoneNumberListItem
) {
  await safePersist(async (repo) => {
    const existing = await repo.findByWabaAndPhone(wabaId, phoneNumberId);
    const updates: Parameters<typeof repo.upsert>[2] = {};
    const bid = businessId ?? existing?.businessId ?? null;
    if (bid !== (existing?.businessId ?? null)) {
      updates.businessId = bid;
    }
    if (isCodeVerifiedOnMeta(phone) && !existing?.codeVerifiedAt) {
      updates.codeVerifiedAt = new Date();
    }
    if (isCloudApiRegistered(phone) && !existing?.registeredAt) {
      updates.registeredAt = new Date();
    }
    if (updates.codeVerifiedAt || updates.registeredAt) {
      updates.lastOperation = LastOperation.STATUS_SYNC;
      updates.lastOperationStatus = LastOperationStatus.SUCCESS;
      updates.lastSuccessAt = new Date();
      updates.lastMetaErrorCode = null;
      updates.lastMetaErrorMessage = null;
    }
    if (Object.keys(updates).length === 0) return;
    await repo.upsert(wabaId, phoneNumberId, updates);
  });
}

export const whatsappOnboardingService = {
  validatePrerequisites(): PrerequisitesResult {
    const env = loadMetaOnboardingEnv();
    const blockers: string[] = [];
    const hasToken = !!env.effectiveAccessToken;
    const hasWaba = !!env.META_WABA_ID?.trim();
    const hasPhone = !!env.META_PHONE_NUMBER_ID?.trim();

    if (!hasToken)
      blockers.push(
        "Defina META_SYSTEM_USER_TOKEN ou WHATSAPP_ACCESS_TOKEN com whatsapp_business_management."
      );
    if (!hasWaba) blockers.push("Defina META_WABA_ID (WhatsApp Business Account ID).");

    return {
      env: {
        hasToken,
        hasWabaId: hasWaba,
        hasPhoneNumberId: hasPhone,
        apiVersion: env.META_API_VERSION,
        tokenSource: env.META_SYSTEM_USER_TOKEN
          ? "META_SYSTEM_USER_TOKEN"
          : env.WHATSAPP_ACCESS_TOKEN
            ? "WHATSAPP_ACCESS_TOKEN"
            : "none",
      },
      graphReachable: false,
      wabaAccessible: false,
      businessIdConfigured: !!env.META_BUSINESS_ID?.trim(),
      blockers,
    };
  },

  async validatePrerequisitesLive(): Promise<PrerequisitesResult> {
    const base = this.validatePrerequisites();
    const { client, env } = clientFromEnv();
    if (!client || !env.META_WABA_ID) return base;

    let graphReachable = false;
    let wabaAccessible = false;
    try {
      await client.get<{ id?: string; name?: string }>(env.META_WABA_ID, {
        fields: "id,name",
      });
      graphReachable = true;
      wabaAccessible = true;
    } catch {
      base.blockers.push(
        "Não foi possível ler o WABA com o token atual (ID ou permissões)."
      );
    }
    return { ...base, graphReachable, wabaAccessible };
  },

  async getBusinessPhoneNumbers(): Promise<{
    ok: true;
    wabaId: string;
    data: PhoneNumberListItem[];
  }> {
    const { client, env } = clientFromEnv();
    if (!client || !env.META_WABA_ID) {
      throw Object.assign(new Error("WABA ou token ausente"), {
        mapped: mapMetaError(400, {}),
      });
    }
    onboardingLog.event("info", "list_phone_numbers", { wabaId: env.META_WABA_ID });
    const raw = await client.get<unknown>(`${env.META_WABA_ID}/phone_numbers`, {
      fields: phoneFields(),
    });
    const parsed = phoneNumbersResponseSchema.safeParse(raw);
    const rows = parsed.success ? parsed.data.data ?? [] : [];
    const data = rows.map((r) => mapPhoneRow(r as Record<string, unknown>));
    onboardingLog.event("info", "list_phone_numbers_done", {
      wabaId: env.META_WABA_ID,
      count: data.length,
    });
    return { ok: true, wabaId: env.META_WABA_ID, data };
  },

  async getPhoneNumberStatus(phoneNumberId?: string): Promise<{
    phone: PhoneNumberListItem;
    displayName: ReturnType<typeof inferDisplayNameNote>;
  }> {
    const { client, env } = clientFromEnv();
    const id = resolvePhoneId(env, phoneNumberId);
    if (!client || !id) {
      throw Object.assign(new Error("phoneNumberId ausente"), {
        mapped: mapMetaError(400, {}),
      });
    }
    onboardingLog.event("info", "get_phone_status", { phoneNumberId: id });
    const raw = await client.get<Record<string, unknown>>(id, {
      fields: phoneFields(),
    });
    const phone = mapPhoneRow(raw);
    if (env.META_WABA_ID) {
      await syncStateFromMetaPhone(
        env.META_WABA_ID,
        id,
        env.META_BUSINESS_ID ?? null,
        phone
      );
    }
    return {
      phone,
      displayName: inferDisplayNameNote(phone.verified_name),
    };
  },

  async requestVerificationCode(
    codeMethod: CodeDeliveryMethod,
    language: string,
    phoneNumberId?: string
  ): Promise<{ success: boolean }> {
    const { client, env } = clientFromEnv();
    const id = resolvePhoneId(env, phoneNumberId);
    const waba = env.META_WABA_ID?.trim();
    if (!client || !id || !waba) {
      throw Object.assign(new Error("phoneNumberId ou WABA ausente"), {
        mapped: mapMetaError(400, {}),
      });
    }
    onboardingLog.event("info", "request_code_start", {
      phoneNumberId: id,
      codeMethod,
      language,
    });
    try {
      const raw = await client.postQuery<unknown>(`${id}/request_code`, {
        code_method: codeMethod,
        language,
      });
      const ok = successBoolSchema.safeParse(raw).data?.success ?? true;
      await safePersist(async (repo) => {
        await repo.upsert(waba, id, {
          businessId: env.META_BUSINESS_ID ?? null,
          codeRequestedAt: new Date(),
          lastOperation: LastOperation.REQUEST_CODE,
          lastOperationStatus: LastOperationStatus.SUCCESS,
          lastSuccessAt: new Date(),
          lastMetaErrorCode: null,
          lastMetaErrorMessage: null,
        });
      });
      onboardingLog.event("info", "request_code_done", { phoneNumberId: id, success: ok });
      return { success: ok };
    } catch (e) {
      const m = mappedFromError(e);
      await safePersist(async (repo) => {
        await repo.upsert(waba, id, {
          businessId: env.META_BUSINESS_ID ?? null,
          lastOperation: LastOperation.REQUEST_CODE,
          lastOperationStatus: LastOperationStatus.FAILURE,
          lastMetaErrorCode: m?.metaCode ?? null,
          lastMetaErrorMessage: m?.message ?? (e instanceof Error ? e.message : String(e)),
        });
      });
      throw e;
    }
  },

  async verifyCode(code: string, phoneNumberId?: string): Promise<{ success: boolean }> {
    const { client, env } = clientFromEnv();
    const id = resolvePhoneId(env, phoneNumberId);
    const waba = env.META_WABA_ID?.trim();
    if (!client || !id || !waba) {
      throw Object.assign(new Error("phoneNumberId ou WABA ausente"), {
        mapped: mapMetaError(400, {}),
      });
    }
    onboardingLog.event("info", "verify_code_start", { phoneNumberId: id, code: "***" });
    try {
      const raw = await client.postQuery<unknown>(`${id}/verify_code`, {
        code: code.trim(),
      });
      const ok = successBoolSchema.safeParse(raw).data?.success ?? true;
      await safePersist(async (repo) => {
        await repo.upsert(waba, id, {
          businessId: env.META_BUSINESS_ID ?? null,
          codeVerifiedAt: new Date(),
          lastOperation: LastOperation.VERIFY_CODE,
          lastOperationStatus: LastOperationStatus.SUCCESS,
          lastSuccessAt: new Date(),
          lastMetaErrorCode: null,
          lastMetaErrorMessage: null,
        });
      });
      onboardingLog.event("info", "verify_code_done", { phoneNumberId: id, success: ok });
      return { success: ok };
    } catch (e) {
      const m = mappedFromError(e);
      await safePersist(async (repo) => {
        await repo.upsert(waba, id, {
          businessId: env.META_BUSINESS_ID ?? null,
          lastOperation: LastOperation.VERIFY_CODE,
          lastOperationStatus: LastOperationStatus.FAILURE,
          lastMetaErrorCode: m?.metaCode ?? null,
          lastMetaErrorMessage: m?.message ?? (e instanceof Error ? e.message : String(e)),
        });
      });
      throw e;
    }
  },

  async registerPhoneNumber(
    pin: string,
    phoneNumberId?: string
  ): Promise<RegisterResult> {
    const { client, env } = clientFromEnv();
    const id = resolvePhoneId(env, phoneNumberId);
    const waba = env.META_WABA_ID?.trim();
    if (!client || !id || !waba) {
      throw Object.assign(new Error("phoneNumberId ou WABA ausente"), {
        mapped: mapMetaError(400, {}),
      });
    }

    const rawPhone = await client.get<Record<string, unknown>>(id, {
      fields: phoneFields(),
    });
    let phone = mapPhoneRow(rawPhone);

    if (isCloudApiRegistered(phone)) {
      await safePersist(async (repo) => {
        const ex = await repo.findByWabaAndPhone(waba, id);
        await repo.upsert(waba, id, {
          businessId: env.META_BUSINESS_ID ?? null,
          registeredAt: new Date(),
          ...(isCodeVerifiedOnMeta(phone) && !ex?.codeVerifiedAt
            ? { codeVerifiedAt: new Date() }
            : {}),
          lastOperation: LastOperation.REGISTER,
          lastOperationStatus: LastOperationStatus.SKIPPED_IDEMPOTENT,
          lastSuccessAt: new Date(),
          lastMetaErrorCode: null,
          lastMetaErrorMessage: null,
        });
      });
      onboardingLog.event("info", "register_skipped_cloud_api", { phoneNumberId: id });
      return {
        success: true,
        alreadyRegistered: true,
        idempotent: true,
        message: "Phone number already on Cloud API (platform_type=CLOUD_API).",
      };
    }

    onboardingLog.event("info", "register_start", { phoneNumberId: id, pin: "******" });
    try {
      const raw = await client.postJson<unknown>(`${id}/register`, {
        messaging_product: "whatsapp",
        pin: pin.trim(),
      });
      const ok = successBoolSchema.safeParse(raw).data?.success ?? true;
      await safePersist(async (repo) => {
        await repo.upsert(waba, id, {
          businessId: env.META_BUSINESS_ID ?? null,
          registeredAt: new Date(),
          lastOperation: LastOperation.REGISTER,
          lastOperationStatus: LastOperationStatus.SUCCESS,
          lastSuccessAt: new Date(),
          lastMetaErrorCode: null,
          lastMetaErrorMessage: null,
        });
      });
      onboardingLog.event("info", "register_done", { phoneNumberId: id, success: ok });
      return {
        success: true,
        alreadyRegistered: false,
        idempotent: false,
        message: "Registration completed.",
      };
    } catch (e) {
      const m = mappedFromError(e);
      const raw2 = await client.get<Record<string, unknown>>(id, {
        fields: phoneFields(),
      });
      phone = mapPhoneRow(raw2);
      if (isCloudApiRegistered(phone)) {
        await safePersist(async (repo) => {
          await repo.upsert(waba, id, {
            businessId: env.META_BUSINESS_ID ?? null,
            registeredAt: new Date(),
            lastOperation: LastOperation.REGISTER,
            lastOperationStatus: LastOperationStatus.SKIPPED_IDEMPOTENT,
            lastSuccessAt: new Date(),
            lastMetaErrorCode: null,
            lastMetaErrorMessage: null,
          });
        });
        onboardingLog.event("info", "register_idempotent_after_error", {
          phoneNumberId: id,
        });
        return {
          success: true,
          alreadyRegistered: true,
          idempotent: true,
          message:
            "Número já registrado na Cloud API (confirmado após resposta Meta).",
        };
      }
      if (isRegisterAlreadySatisfiedError(e, m ?? undefined)) {
        await safePersist(async (repo) => {
          await repo.upsert(waba, id, {
            businessId: env.META_BUSINESS_ID ?? null,
            registeredAt: new Date(),
            lastOperation: LastOperation.REGISTER,
            lastOperationStatus: LastOperationStatus.SKIPPED_IDEMPOTENT,
            lastSuccessAt: new Date(),
            lastMetaErrorCode: null,
            lastMetaErrorMessage: null,
          });
        });
        return {
          success: true,
          alreadyRegistered: true,
          idempotent: true,
          message:
            "Meta indicou número já registrado — estado atualizado como concluído.",
        };
      }
      await safePersist(async (repo) => {
        await repo.upsert(waba, id, {
          businessId: env.META_BUSINESS_ID ?? null,
          lastOperation: LastOperation.REGISTER,
          lastOperationStatus: LastOperationStatus.FAILURE,
          lastMetaErrorCode: m?.metaCode ?? null,
          lastMetaErrorMessage: m?.message ?? (e instanceof Error ? e.message : String(e)),
        });
      });
      throw e;
    }
  },

  getDisplayNameReviewStatus(phoneNumberId?: string) {
    const env = loadMetaOnboardingEnv();
    const id = resolvePhoneId(env, phoneNumberId);
    return {
      phoneNumberId: id,
      ...inferDisplayNameNote(undefined),
      note:
        "Use GET /status com o mesmo phoneNumberId para verified_name atual; revisão de nome via BM + webhook.",
    };
  },

  /**
   * @param phoneNumberIdOverride — opcional: força health para esse ID (deve existir em phone_numbers do WABA).
   */
  async getOperationalHealth(
    phoneNumberIdOverride?: string | null
  ): Promise<OperationalHealthPayload> {
    const env = loadMetaOnboardingEnv();
    const envHasToken = !!env.effectiveAccessToken;
    const envHasWaba = !!env.META_WABA_ID?.trim();
    const envHasVerify = !!env.WHATSAPP_VERIFY_TOKEN?.trim();
    const wabaId = env.META_WABA_ID?.trim() ?? null;
    const businessId = env.META_BUSINESS_ID?.trim() ?? null;

    let tokenOk = false;
    let wabaOk = false;
    let phone: PhoneNumberListItem | null = null;
    let phoneNumbersCount = 0;
    let listOrStatusError: string | null = null;
    let persisted = null as Awaited<
      ReturnType<ReturnType<typeof getOnboardingStateRepository>["findByWabaAndPhone"]>
    >;
    let persistenceOk = true;

    const { client } = clientFromEnv();
    if (!envHasToken || !envHasWaba || !client || !wabaId) {
      return buildOperationalHealth({
        envHasToken,
        envHasWaba,
        envHasVerifyToken: envHasVerify,
        tokenOk: false,
        wabaOk: false,
        businessConfigured: !!businessId,
        businessId,
        wabaId,
        phone: null,
        phoneNumbersCount: 0,
        persisted: null,
        persistenceOk: true,
        listOrStatusError: null,
      });
    }

    try {
      await client.get(wabaId, { fields: "id" });
      tokenOk = true;
      wabaOk = true;
    } catch {
      return buildOperationalHealth({
        envHasToken,
        envHasWaba,
        envHasVerifyToken: envHasVerify,
        tokenOk: false,
        wabaOk: false,
        businessConfigured: !!businessId,
        businessId,
        wabaId,
        phone: null,
        phoneNumbersCount: 0,
        persisted: null,
        persistenceOk: true,
        listOrStatusError: null,
      });
    }

    try {
      const list = await this.getBusinessPhoneNumbers();
      phoneNumbersCount = list.data.length;
      const explicit = phoneNumberIdOverride?.trim();
      if (explicit) {
        phone = list.data.find((x) => x.id === explicit) ?? null;
        if (!phone) {
          listOrStatusError = `phoneNumberId não encontrado na lista deste WABA: ${explicit}`;
        }
      } else {
        const targetId = env.META_PHONE_NUMBER_ID?.trim();
        phone =
          (targetId ? list.data.find((x) => x.id === targetId) : null) ??
          list.data[0] ??
          null;
      }
      if (phone && wabaId) {
        await syncStateFromMetaPhone(wabaId, phone.id, businessId, phone);
      }
    } catch (e) {
      listOrStatusError =
        mappedFromError(e)?.message ?? (e instanceof Error ? e.message : String(e));
    }

    if (phone && wabaId) {
      try {
        persisted = await getOnboardingStateRepository().findByWabaAndPhone(
          wabaId,
          phone.id
        );
      } catch {
        persistenceOk = false;
      }
    }

    if (phone && wabaId && persistenceOk) {
      try {
        persisted = await getOnboardingStateRepository().findByWabaAndPhone(
          wabaId,
          phone.id
        );
      } catch {
        persistenceOk = false;
      }
    }

    return buildOperationalHealth({
      envHasToken,
      envHasWaba,
      envHasVerifyToken: envHasVerify,
      tokenOk,
      wabaOk,
      businessConfigured: !!businessId,
      businessId,
      wabaId,
      phone,
      phoneNumbersCount,
      persisted,
      persistenceOk,
      listOrStatusError,
    });
  },
};
