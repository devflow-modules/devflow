export const RESUME_LIBRARY_EYEBROW = "AF-JOBS-F1b";
export const RESUME_LIBRARY_TITLE = "Currículos";
export const RESUME_LIBRARY_DESCRIPTION =
  "Guarda versões nomeadas do teu perfil neste browser. O Job Match usa só o currículo marcado como Padrão. Não há ranking entre variantes neste recorte.";
export const RESUME_LIBRARY_ADD_LABEL = "Adicionar currículo";
export const RESUME_LIBRARY_DUPLICATE_HINT = "Duplica o padrão com um nome novo. Não altera o Job Match até o definires como padrão.";
export const RESUME_LIBRARY_IMPORT_LABEL = "Importar perfil JSON";
export const RESUME_LIBRARY_DEFAULT_BADGE = "Padrão";
export const RESUME_LIBRARY_SET_DEFAULT_LABEL = "Definir como padrão";
export const RESUME_LIBRARY_RENAME_LABEL = "Renomear";
export const RESUME_LIBRARY_DELETE_LABEL = "Excluir";
export const RESUME_LIBRARY_EVALUATED_WITH_PREFIX = "Avaliado com:";

export function formatResumeUpdatedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
