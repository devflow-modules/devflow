import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { getJwtSecret, getAccessTokenHours } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";

const PASSWORD_RESET_EXPIRY = "1h";

const SALT_ROUNDS = 10;

export type UserRole = "admin" | "agent";

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId: string;
  /** Id da linha `UserSession` — revogação server-side invalida o token. */
  jti: string;
  iat?: number;
  exp?: number;
}

export interface UserSafe {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signToken(payload: Omit<JwtPayload, "iat" | "exp">): Promise<string> {
  if (!payload.jti?.trim()) {
    throw new Error("signToken requires payload.jti (session id)");
  }
  const { jti, ...claims } = payload;
  const secret = new TextEncoder().encode(getJwtSecret());
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setJti(jti)
    .setExpirationTime(`${getAccessTokenHours()}h`)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const secret = new TextEncoder().encode(getJwtSecret());
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

export async function findUserByEmail(email: string): Promise<{ id: string; email: string; name: string; role: string; tenantId: string; passwordHash: string } | null> {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  return user;
}

export interface PasswordResetPayload {
  sub: string;
  email: string;
  purpose: "password_reset";
}

export async function signPasswordResetToken(userId: string, email: string): Promise<string> {
  const secret = new TextEncoder().encode(getJwtSecret());
  return new SignJWT({ sub: userId, email, purpose: "password_reset" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(PASSWORD_RESET_EXPIRY)
    .sign(secret);
}

export async function verifyPasswordResetToken(token: string): Promise<PasswordResetPayload | null> {
  try {
    const secret = new TextEncoder().encode(getJwtSecret());
    const { payload } = await jwtVerify(token, secret);
    const p = payload as unknown as { sub?: string; email?: string; purpose?: string };
    if (p.sub && p.email && p.purpose === "password_reset") {
      return { sub: p.sub, email: p.email, purpose: "password_reset" };
    }
    return null;
  } catch {
    return null;
  }
}

export async function updateUserPassword(userId: string, newPassword: string): Promise<boolean> {
  const hash = await hashPassword(newPassword);
  const result = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: hash },
  });
  return !!result;
}

export async function login(email: string, password: string): Promise<{ user: UserSafe } | { error: string }> {
  const user = await findUserByEmail(email);
  if (!user) return { error: "Credenciais inválidas" };
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return { error: "Credenciais inválidas" };
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      tenantId: user.tenantId,
    },
  };
}
