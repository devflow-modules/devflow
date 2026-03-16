import { getSupabaseServiceClient } from "@/lib/supabase-server";
import type { User } from "@/lib/db/types";

export async function findUserByEmail(email: string): Promise<User | null> {
  const db = getSupabaseServiceClient();
  const { data, error } = await db.from("users").select("*").eq("email", email.toLowerCase().trim()).maybeSingle();
  if (error) throw new Error(`users.findByEmail: ${error.message}`);
  return data as User | null;
}

export async function findUserByCpf(cpf: string): Promise<User | null> {
  const db = getSupabaseServiceClient();
  const digits = cpf.replace(/\D/g, "");
  const { data, error } = await db.from("users").select("*").eq("cpf", digits).maybeSingle();
  if (error) throw new Error(`users.findByCpf: ${error.message}`);
  return data as User | null;
}

export async function findUserByEmailOrCpf(email: string, cpf: string): Promise<User | null> {
  const byEmail = await findUserByEmail(email);
  if (byEmail) return byEmail;
  return findUserByCpf(cpf);
}

export async function createUser(insert: {
  email: string;
  senha_hash: string;
  cpf: string;
  nome: string;
  role?: "cliente" | "operador" | "admin";
}): Promise<User> {
  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .from("users")
    .insert({
      email: insert.email.toLowerCase().trim(),
      senha_hash: insert.senha_hash,
      cpf: insert.cpf.replace(/\D/g, ""),
      nome: insert.nome,
      role: insert.role ?? "cliente",
    })
    .select()
    .single();
  if (error) throw new Error(`users.create: ${error.message}`);
  return data as User;
}

export async function updateUser(id: string, updates: Partial<Pick<User, "nome" | "telefone" | "nascimento" | "cidade" | "uf" | "genero" | "bonus_concedido_at">>): Promise<User> {
  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .from("users")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(`users.update: ${error.message}`);
  return data as User;
}

export async function countUsers(): Promise<number> {
  const db = getSupabaseServiceClient();
  const { count, error } = await db.from("users").select("*", { count: "exact", head: true });
  if (error) throw new Error(`users.count: ${error.message}`);
  return count ?? 0;
}
