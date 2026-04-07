/**
 * Repositório de tenants — Supabase (conversas / admin legado).
 */

import { getSupabaseServiceClient } from "@/lib/supabase-server";
import type { Tenant } from "@/lib/db/types";

export async function getTenantById(id: string): Promise<Tenant | null> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.from("tenants").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`tenants.getById: ${error.message}`);
  return data as Tenant | null;
}

export async function listTenants(): Promise<Tenant[]> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.from("tenants").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(`tenants.list: ${error.message}`);
  return (data ?? []) as Tenant[];
}

export async function countTenants(): Promise<number> {
  const supabase = getSupabaseServiceClient();
  const { count, error } = await supabase.from("tenants").select("*", { count: "exact", head: true });
  if (error) throw new Error(`tenants.count: ${error.message}`);
  return count ?? 0;
}
