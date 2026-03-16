import { NextRequest } from "next/server";

const RECEITA_WS_BASE = "https://www.receitaws.com.br/v1/cnpj";

export type CnpjLookupResponse = {
  company_name: string;
  status: string;
  opening_date: string;
  main_activity: string;
  address: string;
};

function normalizeCnpj(cnpj: string): string {
  return cnpj.replace(/\D/g, "");
}

function buildAddress(raw: {
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
}): string {
  const parts = [
    [raw.logradouro, raw.numero].filter(Boolean).join(", "),
    raw.complemento,
    raw.bairro,
    raw.municipio && raw.uf ? `${raw.municipio} - ${raw.uf}` : raw.municipio ?? raw.uf,
    raw.cep,
  ].filter(Boolean);
  return parts.join(", ");
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cnpj: string }> }
) {
  const { cnpj: cnpjParam } = await params;
  const cnpj = normalizeCnpj(cnpjParam ?? "");

  if (cnpj.length !== 14) {
    return Response.json(
      { error: "CNPJ deve conter 14 dígitos" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(`${RECEITA_WS_BASE}/${cnpj}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      return Response.json(
        { error: "Não foi possível consultar o CNPJ" },
        { status: res.status }
      );
    }

    const data = (await res.json()) as {
      status?: string;
      nome?: string;
      fantasia?: string;
      situacao?: string;
      abertura?: string;
      atividade_principal?: Array<{ text?: string }>;
      logradouro?: string;
      numero?: string;
      complemento?: string;
      bairro?: string;
      municipio?: string;
      uf?: string;
      cep?: string;
      message?: string;
    };

    if (data.status === "ERROR" || data.message) {
      return Response.json(
        { error: data.message ?? "CNPJ não encontrado ou indisponível" },
        { status: 404 }
      );
    }

    const company_name = data.fantasia?.trim() || data.nome?.trim() || "";
    const main_activity =
      data.atividade_principal?.[0]?.text?.trim() ?? "";

    const payload: CnpjLookupResponse = {
      company_name,
      status: data.situacao ?? "",
      opening_date: data.abertura ?? "",
      main_activity,
      address: buildAddress({
        logradouro: data.logradouro,
        numero: data.numero,
        complemento: data.complemento,
        bairro: data.bairro,
        municipio: data.municipio,
        uf: data.uf,
        cep: data.cep,
      }),
    };

    return Response.json(payload);
  } catch (err) {
    console.error("[GET /api/tools/cnpj]", err);
    return Response.json(
      { error: "Erro ao consultar ReceitaWS" },
      { status: 502 }
    );
  }
}
