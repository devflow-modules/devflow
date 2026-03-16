import { getSupabaseServiceClient } from "@/lib/supabase-server";
import type { User } from "@/lib/db/types";
import { updateUser } from "./usersRepository";

const PROFILE_FIELDS = ["nome", "telefone", "nascimento", "cidade", "uf", "genero"] as const;

function isFilled(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

export function profileCompletionPercentage(user: User): number {
  let filled = 0;
  for (const key of PROFILE_FIELDS) {
    if (isFilled(user[key])) filled++;
  }
  return Math.round((filled / PROFILE_FIELDS.length) * 100);
}

export function isProfileComplete(user: User): boolean {
  return profileCompletionPercentage(user) === 100;
}

export function formatName(name: string | null): string {
  if (!name?.trim()) return "";
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export interface UpdateProfileInput {
  userId: string;
  nome?: string;
  telefone?: string;
  nascimento?: string;
  cidade?: string;
  uf?: string;
  genero?: string;
}

export interface UpdateProfileResult {
  user: User;
  bonusConcedido: boolean;
}

export async function updateProfile(input: UpdateProfileInput): Promise<UpdateProfileResult> {
  const db = getSupabaseServiceClient();
  const { data: existing, error: fetchError } = await db.from("users").select("*").eq("id", input.userId).single();
  if (fetchError || !existing) throw new Error("Usuário não encontrado");
  const userBefore = existing as User;

  const updates: Partial<User> = {};
  if (input.nome !== undefined) updates.nome = input.nome;
  if (input.telefone !== undefined) updates.telefone = input.telefone;
  if (input.nascimento !== undefined) updates.nascimento = input.nascimento;
  if (input.cidade !== undefined) updates.cidade = input.cidade;
  if (input.uf !== undefined) updates.uf = input.uf;
  if (input.genero !== undefined) updates.genero = input.genero;

  let bonusConcedido = false;
  if (userBefore.bonus_concedido_at == null) {
    const merged = { ...userBefore, ...updates };
    if (isProfileComplete(merged)) {
      updates.bonus_concedido_at = new Date().toISOString();
      bonusConcedido = true;
    }
  }

  const user = await updateUser(input.userId, updates);
  return { user, bonusConcedido };
}

export async function getProfile(userId: string): Promise<User | null> {
  const db = getSupabaseServiceClient();
  const { data, error } = await db.from("users").select("*").eq("id", userId).maybeSingle();
  if (error) throw new Error(`profile.get: ${error.message}`);
  return data as User | null;
}
