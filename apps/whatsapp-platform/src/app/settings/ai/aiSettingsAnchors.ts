/** IDs das secções de `/settings/ai` — usar em âncoras e documentação. */
export const AI_SETTINGS_SECTION_IDS = {
  visaoGeral: "visao-geral",
  comportamento: "comportamento",
  automacao: "automacao",
  limites: "limites",
  teste: "teste",
} as const;

export type AiSettingsSectionKey = keyof typeof AI_SETTINGS_SECTION_IDS;

export function aiSettingsHref(section: AiSettingsSectionKey): string {
  return `/settings/ai#${AI_SETTINGS_SECTION_IDS[section]}`;
}
