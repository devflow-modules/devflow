import { getSupabaseServiceClient } from "@/lib/supabase-server";
import type { Consulta, ConsultaStatus } from "@/lib/db/types";

export async function createConsulta(input: { cpf: string; cnpj: string; nome?: string | null; status?: ConsultaStatus }): Promise<Consulta> {
  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .from("consultas")
    .insert({
      cpf: input.cpf.replace(/\D/g, ""),
      cnpj: input.cnpj.replace(/\D/g, ""),
      nome: input.nome ?? null,
      status: input.status ?? "Pendente",
    })
    .select()
    .single();
  if (error) throw new Error(`consultas.create: ${error.message}`);
  return data as Consulta;
}

export async function updateConsultaStatus(id: string, status: ConsultaStatus): Promise<void> {
  const db = getSupabaseServiceClient();
  const { error } = await db.from("consultas").update({ status }).eq("id", id);
  if (error) throw new Error(`consultas.updateStatus: ${error.message}`);
}

export async function updateConsultaNome(id: string, nome: string): Promise<void> {
  const db = getSupabaseServiceClient();
  const { error } = await db.from("consultas").update({ nome }).eq("id", id);
  if (error) throw new Error(`consultas.updateNome: ${error.message}`);
}

export async function listConsultas(params: {
  cpf: string;
  page?: number;
  limit?: number;
  status?: string;
  dataInicio?: string;
  dataFim?: string;
  nome?: string;
  cnpj?: string;
}): Promise<{ rows: Consulta[]; total: number }> {
  const db = getSupabaseServiceClient();
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(50, Math.max(1, params.limit ?? 5));
  const offset = (page - 1) * limit;
  const cpfDigits = params.cpf.replace(/\D/g, "");

  let q = db.from("consultas").select("*", { count: "exact" }).eq("cpf", cpfDigits);

  if (params.status?.trim()) {
    q = q.ilike("status", params.status.trim());
  }
  if (params.dataInicio) {
    q = q.gte("criado_em", `${params.dataInicio}T00:00:00.000Z`);
  }
  if (params.dataFim) {
    q = q.lte("criado_em", `${params.dataFim}T23:59:59.999Z`);
  }
  if (params.nome?.trim()) {
    q = q.ilike("nome", `%${params.nome.trim()}%`);
  }
  if (params.cnpj?.trim()) {
    q = q.eq("cnpj", params.cnpj.replace(/\D/g, ""));
  }

  q = q.order("criado_em", { ascending: false }).range(offset, offset + limit - 1);
  const { data, count, error } = await q;
  if (error) throw new Error(`consultas.list: ${error.message}`);
  return { rows: (data ?? []) as Consulta[], total: count ?? 0 };
}

export async function countConsultas(): Promise<number> {
  const db = getSupabaseServiceClient();
  const { count, error } = await db.from("consultas").select("*", { count: "exact", head: true });
  if (error) throw new Error(`consultas.count: ${error.message}`);
  return count ?? 0;
}
