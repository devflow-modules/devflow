import type { CnpjDemoShape } from "./types";

/** CNPJ fictício exibido na demo ilustrativa do produto (não consulta a Receita nesta tela). */
export const INVESTIGA_DEMO_CNPJ_DISPLAY = "12.345.678/0001-90";

export const INVESTIGA_DEMO_CNPJ_DIGITS = "12345678000190";

/**
 * CNPJ público conhecido para pré-preencher a ferramenta grátis — consulta real costuma responder.
 * (Banco do Brasil S.A.)
 */
export const CONSULTA_PREFILL_DEMO_DISPLAY = "00.000.000/0001-91";

/**
 * Retorno estável e seguro para demo comercial — não chama APIs externas.
 * Texto claramente fictício para apresentações.
 */
export function getInvestigaDemoSample(): CnpjDemoShape {
  return {
    company_name: "TechLogística Exemplo S.A.",
    status: "ATIVA",
    opening_date: "15/03/2018",
    main_activity: "Transporte rodoviário de carga — exceto produtos perigosos e mudanças (49.30-2-01)",
    address: "Av. Brasil, 1500 — Centro, São Paulo - SP · CEP 01010-000",
    isIllustrative: true,
  };
}

export function isValidCnpjLength(digits: string): boolean {
  return digits.replace(/\D/g, "").length === 14;
}
