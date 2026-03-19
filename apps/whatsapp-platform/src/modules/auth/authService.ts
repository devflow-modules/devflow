import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { getJwtSecret, JWT_EXPIRY_HOURS } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";

const SALT_ROUNDS = 10;

export type UserRole = "admin" | "agent";

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId: string;
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
  const secret = new TextEncoder().encode(getJwtSecret());
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${JWT_EXPIRY_HOURS}h`)
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
