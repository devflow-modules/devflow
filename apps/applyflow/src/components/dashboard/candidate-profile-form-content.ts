import type { ApplyflowSkillKey } from "@devflow/applyflow-core";

export const PROFILE_FORM_CREATE_LABEL = "Cadastrar perfil";
export const PROFILE_FORM_EDIT_LABEL = "Editar perfil";
export const PROFILE_FORM_SAVE_LABEL = "Guardar perfil";
export const PROFILE_FORM_CANCEL_LABEL = "Cancelar";
export const PROFILE_FORM_HINT =
  "Só o nome e o cargo são obrigatórios. Local, inglês, anos e salário podem ficar em branco — a análise trata isso como não informado, sem inventar dados. Preencher depois melhora o match.";
export const PROFILE_FORM_SALARY_SUMMARY = "Pretensões salariais (opcional)";
export const PROFILE_FORM_SKILLS_LEGEND = "Tecnologias que conheces";
export const PROFILE_FORM_SKILLS_HINT = "Marca só o que queres declarar. Anos são opcionais.";
export const PROFILE_FORM_ENGLISH_UNKNOWN = "Não informado";
export const PROFILE_FORM_COMFORT_UNKNOWN = "Não informado";
export const PROFILE_FORM_COMFORT_YES = "Sim";
export const PROFILE_FORM_COMFORT_NO = "Não";
export const PROFILE_FORM_EVIDENCE_SUMMARY = "Experiência e informações adicionais";
export const PROFILE_FORM_EVIDENCE_HINT =
  "Fatos com origem e contexto. Uma declaração do candidato não é auditoria. Storage e Edge Functions ficam desconhecidos até serem gravados à parte.";
export const PROFILE_FORM_EVIDENCE_ADD = "Adicionar fato";
export const PROFILE_FORM_EVIDENCE_REMOVE = "Remover";
export const PROFILE_FORM_EVIDENCE_EMPTY = "Nenhum fato adicional gravado.";
export const PROFILE_FORM_EVIDENCE_ORIGIN_DECLARATION = "Declaração do candidato";
export const PROFILE_FORM_EVIDENCE_ORIGIN_DOCUMENT = "Documento";
export const PROFILE_FORM_EVIDENCE_STANCE_KNOWN = "Conhecido / participação direta";
export const PROFILE_FORM_EVIDENCE_STANCE_ABSENT = "Sem experiência declarada";
export const PROFILE_FORM_EVIDENCE_STANCE_UNKNOWN = "Desconhecido";
export const PROFILE_FORM_EVIDENCE_KIND_COMPONENT = "Componente (ex.: Supabase Database)";
export const PROFILE_FORM_EVIDENCE_KIND_JOINT = "Uso conjunto (ex.: TypeScript no backend)";
export const PROFILE_FORM_EVIDENCE_KIND_PERIOD = "Período documental";
export const PROFILE_FORM_EVIDENCE_KIND_HOURS = "Disponibilidade de horário";
export const PROFILE_FORM_EVIDENCE_JOB_SCOPE_NONE = "Geral — não limitar a uma vaga";

export const PROFILE_SKILL_LABELS: Record<ApplyflowSkillKey, string> = {
  React: "React",
  Nextjs: "Next.js",
  TypeScript: "TypeScript",
  Nodejs: "Node.js",
  Python: "Python",
  PostgreSQL: "PostgreSQL",
  Prisma: "Prisma",
  Docker: "Docker",
  Jest: "Jest",
  Playwright: "Playwright",
  Tailwind: "Tailwind CSS",
  REST: "REST",
  OpenAPI: "OpenAPI / Swagger",
  AWS: "AWS",
  Java: "Java",
  Elixir: "Elixir",
  Ruby: "Ruby",
  WordPress: "WordPress",
  HTML: "HTML",
  CSS: "CSS",
  Git: "Git",
  CI_CD: "CI/CD",
};
