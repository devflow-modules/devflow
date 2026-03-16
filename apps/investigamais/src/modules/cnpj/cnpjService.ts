import { getReceitaWsBaseUrl } from "@/lib/config";
import { findDadosCnpjByCnpj, upsertDadosCnpj } from "./dadosCnpjRepository";
import { createConsulta, updateConsultaStatus, updateConsultaNome } from "./consultasRepository";
import { hasSupabaseConfig } from "@/lib/supabase-server";
import { trackCnpjQueryRequested, trackCnpjCacheHit, trackCnpjCacheMiss, trackCnpjQueryCompleted } from "@/modules/analytics";
import type { ConsultaStatus } from "@/lib/db/types";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

export interface ConsultaCnpjResult {
  consultado: boolean;
  consulta: { id: string; cpf: string; cnpj: string; status: ConsultaStatus; criado_em: string };
  empresa: Record<string, unknown> | null;
  error?: string;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchReceitaWs(cnpjDigits: string): Promise<{ status: number; data?: Record<string, unknown> }> {
  const base = getReceitaWsBaseUrl().replace(/\/$/, "");
  const url = `${base}/cnpj/${cnpjDigits}`;
  const res = await fetch(url);
  if (res.status === 200) {
    const data = (await res.json()) as Record<string, unknown>;
    return { status: 200, data };
  }
  return { status: res.status };
}

function getCompanyName(data: Record<string, unknown>): string | null {
  const nome = data.nome;
  const fantasia = data.fantasia;
  if (typeof nome === "string" && nome.trim()) return nome.trim();
  if (typeof fantasia === "string" && fantasia.trim()) return fantasia.trim();
  return null;
}

export async function queryCnpj(cnpj: string, userCpf: string): Promise<ConsultaCnpjResult | { error: string; status?: number }> {
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length !== 14) return { error: "CNPJ inválido", status: 400 };
  trackCnpjQueryRequested();

  let consultaId: string | null = null;

  let consultaRecord: { id: string; cpf: string; cnpj: string; status: ConsultaStatus; criado_em: string } | null = null;

  if (hasSupabaseConfig()) {
    const cached = await findDadosCnpjByCnpj(digits);
    if (cached?.dados && typeof (cached.dados as Record<string, unknown>).nome !== "undefined") {
      trackCnpjCacheHit();
      const consulta = await createConsulta({
        cpf: userCpf,
        cnpj: digits,
        nome: getCompanyName(cached.dados as Record<string, unknown>),
        status: "Consultado",
      });
      trackCnpjQueryCompleted();
      return {
        consultado: true,
        consulta: { id: consulta.id, cpf: consulta.cpf, cnpj: consulta.cnpj, status: consulta.status, criado_em: consulta.criado_em },
        empresa: cached.dados as Record<string, unknown>,
      };
    }

    trackCnpjCacheMiss();
    const consulta = await createConsulta({ cpf: userCpf, cnpj: digits, status: "Pendente" });
    consultaId = consulta.id;
    consultaRecord = { id: consulta.id, cpf: consulta.cpf, cnpj: consulta.cnpj, status: consulta.status, criado_em: consulta.criado_em };
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const { status, data } = await fetchReceitaWs(digits);
    if (status === 200 && data && (data.status === "OK" || data.nome)) {
      const nome = getCompanyName(data);
      if (hasSupabaseConfig() && consultaId && consultaRecord) {
        await upsertDadosCnpj(digits, data);
        await updateConsultaStatus(consultaId, "Consultado");
        if (nome) await updateConsultaNome(consultaId, nome);
        trackCnpjQueryCompleted();
        return {
          consultado: true,
          consulta: { ...consultaRecord, status: "Consultado" as ConsultaStatus },
          empresa: data,
        };
      }
      trackCnpjQueryCompleted();
      return {
        consultado: true,
        consulta: { id: consultaId ?? "", cpf: userCpf, cnpj: digits, status: "Consultado", criado_em: new Date().toISOString() },
        empresa: data,
      };
    }
    if (status === 404) {
      if (hasSupabaseConfig() && consultaId) await updateConsultaStatus(consultaId, "Erro");
      return { error: "Ainda não temos informações sobre este CNPJ.", status: 404 };
    }
    if (status === 429) {
      if (hasSupabaseConfig() && consultaId) await updateConsultaStatus(consultaId, "Erro");
      return { error: "Limite de consultas atingido. Tente novamente mais tarde.", status: 429 };
    }
    if (attempt < MAX_RETRIES) await delay(RETRY_DELAY_MS * attempt);
  }

  if (hasSupabaseConfig() && consultaId) await updateConsultaStatus(consultaId, "Erro");
  return { error: "Erro ao consultar CNPJ. Tente novamente.", status: 502 };
}
