/**
 * Parser de mensagens recebidas no WhatsApp.
 * Identifica intenção e retorna a chave da resposta correspondente.
 */

import type { MessageKey } from "./messages";

const NORMALIZE = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export function parseMessage(text: string): MessageKey | null {
  const normalized = NORMALIZE(text);

  // Boas-vindas / primeiro contato (saudações comuns)
  const greetings = [
    "oi",
    "ola",
    "olá",
    "bom dia",
    "boa tarde",
    "boa noite",
    "inicio",
    "start",
    "começar",
    "iniciar",
  ];
  if (greetings.includes(normalized)) {
    return "welcome";
  }

  // Menu
  if (["menu", "opcoes", "opções", "ajuda", "help", "0"].includes(normalized)) {
    return "menu";
  }

  // Opção 1 - Como funciona
  if (["1", "um", "como funciona", "funciona", "ver automação"].includes(normalized)) {
    return "option1";
  }

  // Opção 2 - Demo
  if (["2", "dois", "demo", "demonstração", "demonstracao", "testar"].includes(normalized)) {
    return "option2";
  }

  // Opção 3 - Falar com especialista
  if (
    [
      "3",
      "tres",
      "três",
      "especialista",
      "humano",
      "atendente",
      "pessoa",
      "falar com alguém",
    ].includes(normalized)
  ) {
    return "option3";
  }

  return null;
}

/**
 * Verifica se é o primeiro contato do usuário.
 * Em produção, você pode usar um banco/Redis para persistir.
 */
export function isFirstContact(): boolean {
  // Por ora, sempre consideramos primeiro contato.
  // TODO: integrar com sessão/db para rastrear contatos
  return true;
}
