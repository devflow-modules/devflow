import { aiSettingsHref } from "./aiSettingsAnchors";

/**
 * Atalhos do PageHeader em `/settings/ai` (settings-ai F1).
 * Salvar fica à parte (`AiSettingsSaveHeaderButton`); aqui só links — máx. 2.
 */
export const AI_SETTINGS_HEADER_QUICK_LINKS = [
  { href: aiSettingsHref("teste"), label: "Ir para teste" },
  { href: "/admin/whatsapp", label: "Gerenciar canais" },
] as const;

export const AI_SETTINGS_MAX_HEADER_QUICK_LINKS = 2;
