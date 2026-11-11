/**
 * Provisionamento de membros operacionais do tenant (Client 1).
 * TenantId vem sempre do contexto autenticado — nunca do body do cliente.
 */

import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword, type UserRole } from "@/modules/auth/authService";
import { sendTransactionalEmail } from "@/modules/email/application/sendTransactionalEmail";
import { recordPlatformAudit } from "@/lib/platformAuditLog";

export const USER_ACCOUNT_STATUSES = ["pending", "active", "disabled"] as const;
export type UserAccountStatus = (typeof USER_ACCOUNT_STATUSES)[number];

/** Roles que um manager de tenant pode atribuir ao criar membros. */
export const MANAGER_PROVISIONABLE_ROLES = ["operator", "manager"] as const;
export type ManagerProvisionableRole = (typeof MANAGER_PROVISIONABLE_ROLES)[number];

const ACTIVATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type ProvisionMemberInput = {
  tenantId: string;
  actorUserId: string;
  actorRole: UserRole;
  name: string;
  email: string;
  role: ManagerProvisionableRole;
  /** Base URL da app (sem trailing slash) para montar o link de activação. */
  appBaseUrl: string;
};

export type ProvisionMemberSuccess = {
  ok: true;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: UserAccountStatus;
  };
  /** Presente quando o e-mail não foi enviado — fluxo assistido (manager entrega o link). */
  activationUrl: string | null;
  emailSent: boolean;
};

export type ProvisionMemberFailure = {
  ok: false;
  code:
    | "FORBIDDEN_ROLE"
    | "INVALID_INPUT"
    | "EMAIL_EXISTS_SAME_TENANT"
    | "EMAIL_EXISTS_OTHER_TENANT"
    | "PENDING_EXISTS";
  message: string;
};

export type ProvisionMemberResult = ProvisionMemberSuccess | ProvisionMemberFailure;

export type ActivateMemberInput = {
  rawToken: string;
  newPassword: string;
};

export type ActivateMemberResult =
  | { ok: true; userId: string; email: string }
  | { ok: false; code: "INVALID_TOKEN" | "EXPIRED_TOKEN" | "INVALID_PASSWORD"; message: string };

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashActivationToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

function createActivationToken(): { raw: string; hash: string; expiresAt: Date } {
  const raw = randomBytes(32).toString("hex");
  return {
    raw,
    hash: hashActivationToken(raw),
    expiresAt: new Date(Date.now() + ACTIVATION_TTL_MS),
  };
}

function isProvisionableRole(role: string): role is ManagerProvisionableRole {
  return (MANAGER_PROVISIONABLE_ROLES as readonly string[]).includes(role);
}

export async function provisionTenantMember(
  input: ProvisionMemberInput
): Promise<ProvisionMemberResult> {
  if (input.actorRole !== "manager" && input.actorRole !== "platform_admin") {
    return {
      ok: false,
      code: "FORBIDDEN_ROLE",
      message: "Apenas gestores podem adicionar membros à equipe.",
    };
  }

  const name = input.name.trim();
  const email = normalizeEmail(input.email);
  if (!name || name.length < 2) {
    return { ok: false, code: "INVALID_INPUT", message: "Nome inválido." };
  }
  if (!email || !email.includes("@")) {
    return { ok: false, code: "INVALID_INPUT", message: "E-mail inválido." };
  }
  if (!isProvisionableRole(input.role)) {
    return {
      ok: false,
      code: "FORBIDDEN_ROLE",
      message: "Papel não permitido. Use operator ou manager.",
    };
  }
  if (input.role === "manager" && input.actorRole !== "manager" && input.actorRole !== "platform_admin") {
    return { ok: false, code: "FORBIDDEN_ROLE", message: "Sem permissão para criar gestores." };
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, tenantId: true, status: true },
  });

  if (existing) {
    if (existing.tenantId !== input.tenantId) {
      return {
        ok: false,
        code: "EMAIL_EXISTS_OTHER_TENANT",
        message: "Este e-mail já está registado noutra organização. Não é possível mover a conta.",
      };
    }
    if (existing.status === "pending") {
      return {
        ok: false,
        code: "PENDING_EXISTS",
        message: "Já existe um convite pendente para este e-mail neste tenant.",
      };
    }
    return {
      ok: false,
      code: "EMAIL_EXISTS_SAME_TENANT",
      message: "Este e-mail já pertence a um membro desta equipe.",
    };
  }

  const activation = createActivationToken();
  // Password placeholder — login blocked until status=active via activation.
  const placeholderHash = await hashPassword(randomBytes(32).toString("hex"));

  const user = await prisma.user.create({
    data: {
      tenantId: input.tenantId,
      email,
      name,
      role: input.role,
      passwordHash: placeholderHash,
      status: "pending",
      activationTokenHash: activation.hash,
      activationExpiresAt: activation.expiresAt,
    },
    select: { id: true, name: true, email: true, role: true, status: true },
  });

  const activationUrl = `${input.appBaseUrl.replace(/\/$/, "")}/activate?token=${encodeURIComponent(activation.raw)}`;
  const loginUrl = `${input.appBaseUrl.replace(/\/$/, "")}/login`;

  const emailResult = await sendTransactionalEmail({
    type: "ACCOUNT_CREATED",
    to: user.email,
    tenantId: input.tenantId,
    userId: user.id,
    payload: {
      userName: user.name,
      email: user.email,
      loginUrl,
      setPasswordUrl: activationUrl,
    },
  });

  const emailSent = emailResult.ok;
  // Assisted pilot: if email is not configured, surface the one-time URL to the manager once.
  const returnUrl = emailSent ? null : activationUrl;

  recordPlatformAudit({
    action: "team_member_provisioned",
    tenantId: input.tenantId,
    userId: input.actorUserId,
    resourceType: "user",
    resourceId: user.id,
    metadata: {
      role: user.role,
      status: user.status,
      emailSent,
      // Never store raw activation token or URL in audit.
    },
  });

  return {
    ok: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status as UserAccountStatus,
    },
    activationUrl: returnUrl,
    emailSent,
  };
}

export async function activateTenantMember(
  input: ActivateMemberInput
): Promise<ActivateMemberResult> {
  const raw = input.rawToken.trim();
  if (!raw) {
    return { ok: false, code: "INVALID_TOKEN", message: "Token de activação inválido." };
  }
  if (!input.newPassword || input.newPassword.length < 8) {
    return {
      ok: false,
      code: "INVALID_PASSWORD",
      message: "A senha deve ter no mínimo 8 caracteres.",
    };
  }

  const tokenHash = hashActivationToken(raw);
  const user = await prisma.user.findFirst({
    where: {
      activationTokenHash: tokenHash,
      status: "pending",
    },
    select: {
      id: true,
      email: true,
      tenantId: true,
      activationExpiresAt: true,
    },
  });

  if (!user) {
    return { ok: false, code: "INVALID_TOKEN", message: "Link de activação inválido ou já utilizado." };
  }

  if (!user.activationExpiresAt || user.activationExpiresAt.getTime() < Date.now()) {
    return {
      ok: false,
      code: "EXPIRED_TOKEN",
      message: "Este link expirou. Peça ao gestor um novo convite.",
    };
  }

  const passwordHash = await hashPassword(input.newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      status: "active",
      activationTokenHash: null,
      activationExpiresAt: null,
    },
  });

  recordPlatformAudit({
    action: "team_member_activated",
    tenantId: user.tenantId,
    userId: user.id,
    resourceType: "user",
    resourceId: user.id,
    metadata: {},
  });

  return { ok: true, userId: user.id, email: user.email };
}

export function isUserAccountActive(status: string | null | undefined): boolean {
  return (status ?? "active") === "active";
}
