export const JOBS_STORAGE_PARTIAL_TITLE = "Algumas vagas não puderam ser lidas";
export function jobsStoragePartialDescription(ignoredCount: number): string {
  return `${ignoredCount} vaga(s) no inbox não passaram na validação e foram isoladas. As restantes continuam disponíveis. O ficheiro original neste browser não foi alterado.`;
}

export const JOBS_STORAGE_UNREADABLE_TITLE = "Os dados locais das vagas não puderam ser lidos";
export const JOBS_STORAGE_MALFORMED_DESCRIPTION =
  "O JSON guardado neste browser está corrompido. O conteúdo original foi preservado para diagnóstico. O inbox continua disponível.";
export const JOBS_STORAGE_UNKNOWN_VERSION_DESCRIPTION =
  "A versão dos dados locais das vagas não é reconhecida. O conteúdo original foi preservado. O inbox continua disponível.";
export const JOBS_STORAGE_INVALID_ENVELOPE_DESCRIPTION =
  "O armazenamento local das vagas não tem o formato esperado. O conteúdo original foi preservado. O inbox continua disponível.";
export const JOBS_STORAGE_DISCARD_LABEL = "Descartar dados irrecuperáveis das vagas";

export const RESUME_STORAGE_UNREADABLE_TITLE = "Os currículos locais não puderam ser lidos";
export const RESUME_STORAGE_UNREADABLE_DESCRIPTION =
  "Os dados locais de currículos não puderam ser lidos. O conteúdo original foi preservado neste browser. Job Match fica indisponível até importares um currículo válido.";
export const RESUME_STORAGE_DISCARD_LABEL = "Descartar currículos irrecuperáveis";

export const RESUME_LIBRARY_EMPTY_TITLE = "Nenhum currículo configurado";
export const RESUME_LIBRARY_EMPTY_DESCRIPTION =
  "Cadastra o teu perfil para avaliar vagas. JSON continua disponível como opção. Sem um currículo, as vagas não são avaliadas.";

export const INTERVIEW_LAB_INBOX_ONLY_HINT = "Disponível após importar histórico da extensão.";
