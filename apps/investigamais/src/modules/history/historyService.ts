import { listConsultas } from "@/modules/cnpj/consultasRepository";
import type { Consulta } from "@/lib/db/types";

export interface HistoryItem extends Consulta {
  criadoFormatado: string;
}

export interface ListHistoryParams {
  cpf: string;
  page?: number;
  limit?: number;
  status?: string;
  dataInicio?: string;
  dataFim?: string;
  nome?: string;
  cnpj?: string;
}

export async function listHistory(params: ListHistoryParams): Promise<{ rows: HistoryItem[]; total: number }> {
  const { rows, total } = await listConsultas(params);
  const items: HistoryItem[] = rows.map((r) => ({
    ...r,
    criadoFormatado: new Date(r.criado_em).toLocaleString("pt-BR"),
  }));
  return { rows: items, total };
}
