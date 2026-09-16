import {
  APPLYFLOW_SKILL_KEYS,
  declaredSkillYears,
  profileEnglishLevel,
  profileLocation,
} from "./profile-schema.js";
import type { CandidateProfile } from "./profile-schema.js";
import type { JobIntelligence } from "./job-intelligence.js";

export type AiTextTask =
  | "cover_letter"
  | "open_answer"
  | "recruiter_message"
  | "fit_summary"
  | "gap_explanation";

export type AiPromptInput = {
  task: AiTextTask;
  candidateProfile: CandidateProfile;
  jobTitle?: string;
  companyName?: string;
  jobMeta?: JobIntelligence;
  questionLabel?: string;
  visibleQuestionText?: string;
  jobTextSlice?: string;
  language: "pt" | "en";
};

const ANTI_PT = `Regras absolutas:
- Não inventar experiência profissional, empregadores, projetos, tecnologias, anos, certificações, salário, idioma nem experiência.
- Usar apenas CandidateFacts conhecidos, NarrativeBank e o perfil. Se um fato estiver ausente, não o complete.
- Para cada skill, usar apenas os anos indicados no perfil ou em CandidateFacts. Se anos = 0 ou unknown, não afirmar domínio nem experiência prática prolongada.
- Não exagerar senioridade nem atribuir certificações ou resultado de entrevistas inexistentes.
- Se não houver evidência suficiente para a pergunta, não inventar: diga de forma breve que o perfil não contém essa informação.
- Priorizar tecnologias e papéis que o candidato realmente declara no perfil.`;

const ANTI_EN = `Absolute rules:
- Do not invent work experience, employers, projects, technologies, years, certifications, salary, language, or experience.
- Use only known CandidateFacts, NarrativeBank, and the profile. If a fact is missing, do not fill it in.
- For each skill, use only the years given in the profile or CandidateFacts. If years = 0 or unknown, do not claim proficiency or long practice.
- Do not exaggerate seniority or claim certifications or interview outcomes that are not in the profile.
- If there is not enough evidence for the question, do not invent: briefly state that the profile does not contain that information.
- Prioritize technologies and roles the candidate actually declares.`;

function antiBlock(lang: "pt" | "en"): string {
  return lang === "pt" ? ANTI_PT : ANTI_EN;
}

function profilePayloadForPrompt(p: CandidateProfile): {
  name: string;
  location?: string;
  englishLevel?: string;
  comfortableInEnglish?: boolean;
  roles: string[];
  skillsYears: Record<string, number>;
  facts: CandidateProfile["facts"];
  narrativeBank: CandidateProfile["answerBank"];
} {
  const skills: Record<string, number> = {};
  for (const k of APPLYFLOW_SKILL_KEYS) {
    const years = declaredSkillYears(p.skills, k);
    if (years !== undefined) skills[k] = years;
  }
  return {
    name: p.name,
    location: profileLocation(p),
    englishLevel: profileEnglishLevel(p),
    comfortableInEnglish: p.comfortableInEnglish,
    roles: p.roles,
    skillsYears: skills,
    facts: p.facts,
    narrativeBank: p.answerBank,
  };
}

function jobMetaBlock(meta?: JobIntelligence): string {
  if (!meta) return "(sem meta heurística da vaga)";
  return JSON.stringify(
    {
      seniority: meta.seniority,
      roleType: meta.roleType,
      workModel: meta.workModel,
      contractType: meta.contractType,
      englishRequired: meta.englishRequired,
      detectedSkills: meta.detectedSkills,
      salaryMentioned: meta.salaryMentioned,
    },
    null,
    0,
  );
}

function sliceBlock(slice?: string, max = 6000): string {
  if (!slice?.trim()) return "";
  const s = slice.trim().slice(0, max);
  return `\nExcerto limitado da descrição da vaga (pode estar incompleto):\n<<<JOB_SLICE>>>\n${s}\n<<<END_SLICE>>>\n`;
}

function taskUserInstructions(task: AiTextTask, lang: "pt" | "en"): string {
  const isPt = lang === "pt";
  const map: Record<AiTextTask, { pt: string; en: string }> = {
    cover_letter: {
      pt: "Gera uma carta de apresentação em 3 a 5 parágrafos curtos, tom profissional e directo, adaptada à vaga usando apenas factos do perfil.",
      en: "Write a cover letter in 3–5 short paragraphs, professional and direct tone, tailored using only facts from the profile.",
    },
    open_answer: {
      pt: "Responde de forma objectiva e completa à pergunta do formulário, sem divagações, usando apenas o perfil e o contexto.",
      en: "Answer the application question objectively and completely, without digressions, using only the profile and context.",
    },
    recruiter_message: {
      pt: "Gera uma mensagem curta (máx. ~120 palavras) para recrutador, cordial e específica à oportunidade.",
      en: "Write a short note (~120 words max) to the recruiter, polite and specific to the role.",
    },
    fit_summary: {
      pt: "Gera um resumo do alinhamento candidato–vaga em bullets (5–8 pontos), honesto sobre lacunas e pontos fortes.",
      en: "Produce a fit summary as 5–8 bullet points, honest about gaps and strengths.",
    },
    gap_explanation: {
      pt: "Explica de forma positiva e honesta como o candidato pode contribuir apesar de lacunas visíveis (transição, stack parcial, etc.). Texto conciso (2–4 parágrafos curtos).",
      en: "Explain positively and honestly how the candidate can contribute despite visible gaps. Concise (2–4 short paragraphs).",
    },
  };
  return isPt ? map[task].pt : map[task].en;
}

export function buildAiPrompt(input: AiPromptInput): { system: string; user: string } {
  const lang = input.language;
  const profileJson = JSON.stringify(profilePayloadForPrompt(input.candidateProfile), null, 2);

  const system =
    lang === "pt"
      ? `És um assistente de redacção para candidaturas. ${antiBlock("pt")}\n\nGera apenas o texto pedido, sem preâmbulos nem markdown de explicação.`
      : `You are a writing assistant for job applications. ${antiBlock("en")}\n\nOutput only the requested text, no preamble or explanatory markdown.`;

  const userParts: string[] = [
    `Tarefa: ${input.task}`,
    taskUserInstructions(input.task, lang),
    `\nPerfil do candidato (JSON — não inventar além disto; skills têm anos de experiência declarados; facts omissos = unknown):\n${profileJson}`,
  ];

  if (input.jobTitle || input.companyName) {
    userParts.push(
      `\nContexto da vaga: título: ${input.jobTitle ?? "—"}, empresa: ${input.companyName ?? "—"}`,
    );
  }
  userParts.push(`\nMeta heurística local (não é verdade absoluta): ${jobMetaBlock(input.jobMeta)}`);
  userParts.push(sliceBlock(input.jobTextSlice));

  if (input.questionLabel?.trim()) {
    userParts.push(`\nRótulo do campo / pergunta:\n${input.questionLabel.trim()}`);
  }
  if (input.visibleQuestionText?.trim()) {
    userParts.push(`\nTexto visível adicional do campo (se houver):\n${input.visibleQuestionText.trim().slice(0, 4000)}`);
  }

  return { system, user: userParts.join("") };
}
