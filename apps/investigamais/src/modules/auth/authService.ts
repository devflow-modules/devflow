import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { getJwtSecret, JWT_EXPIRY_HOURS } from "@/lib/config";
import { findUserByEmail } from "@/modules/users/usersRepository";
import type { UserRole } from "@/lib/db/types";
import type { UserSafe } from "@/lib/db/types";

const SALT_ROUNDS = 10;

export interface JwtPayload {
  sub: string;
  email: string;
  cpf: string;
  nome: string | null;
  role: UserRole;
  iat?: number;
  exp?: number;
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

export async function login(email: string, password: string): Promise<{ user: UserSafe } | { error: string }> {
  const user = await findUserByEmail(email);
  if (!user) return { error: "Credenciais inválidas" };
  const ok = await verifyPassword(password, user.senha_hash);
  if (!ok) return { error: "Credenciais inválidas" };
  const safe: UserSafe = { id: user.id, email: user.email, cpf: user.cpf, nome: user.nome, role: user.role };
  return { user: safe };
}

export function userToSafe(user: { id: string; email: string; cpf: string; nome: string | null; role: UserRole }): UserSafe {
  return { id: user.id, email: user.email, cpf: user.cpf, nome: user.nome, role: user.role };
}

export type { UserRole };
