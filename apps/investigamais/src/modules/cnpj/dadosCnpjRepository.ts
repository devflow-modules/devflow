import { getSupabaseServiceClient } from "@/lib/supabase-server";
import type { DadosCnpj } from "@/lib/db/types";

export async function findDadosCnpjByCnpj(cnpj: string): Promise<DadosCnpj | null> {
  const db = getSupabaseServiceClient();
  const digits = cnpj.replace(/\D/g, "");
  const { data, error } = await db.from("dados_cnpj").select("*").eq("cnpj", digits).maybeSingle();
  if (error) throw new Error(`dados_cnpj.find: ${error.message}`);
  return data as DadosCnpj | null;
}

export async function upsertDadosCnpj(cnpj: string, dados: Record<string, unknown>): Promise<DadosCnpj> {
  const db = getSupabaseServiceClient();
  const digits = cnpj.replace(/\D/g, "");
  const { data, error } = await db
    .from("dados_cnpj")
    .upsert({ cnpj: digits, dados, updated_at: new Date().toISOString() }, { onConflict: "cnpj" })
    .select()
    .single();
  if (error) throw new Error(`dados_cnpj.upsert: ${error.message}`);
  return data as DadosCnpj;
}
