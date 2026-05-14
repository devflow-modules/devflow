import { z } from "zod";

export const interviewBriefingTypeSchema = z.enum([
  "async_video",
  "live_coding",
  "behavioral",
  "system_design",
  "recruiter_screen",
]);

export const briefingLanguageSchema = z.enum(["english", "portuguese"]);

export const briefingInputSchema = z.object({
  company: z.string().min(1).max(200),
  role: z.string().min(1).max(200),
  jobDescription: z.string().max(8000).default(""),
  requiredSkills: z.array(z.string().max(80)).max(40).default([]),
  interviewType: interviewBriefingTypeSchema,
  language: briefingLanguageSchema,
  /** Optional link to an imported ApplyFlow row (informational only). */
  sourceApplicationId: z.string().max(120).optional(),
});

export type InterviewBriefingType = z.infer<typeof interviewBriefingTypeSchema>;
export type BriefingLanguage = z.infer<typeof briefingLanguageSchema>;
export type BriefingInput = z.infer<typeof briefingInputSchema>;

export type StarOutline = { title: string; bullets: string[] };
export type ProjectCard = { title: string; bullets: string[] };

export type InterviewBriefingContent = {
  corePitch: string[];
  roleAlignment: string[];
  projectCards: ProjectCard[];
  likelyTechnicalQuestions: string[];
  likelyBehavioralQuestions: string[];
  starOutlines: StarOutline[];
  questionsForInterviewer: string[];
  vocabularyNotes: string[];
  finalChecklist: string[];
};

function sortedSkills(skills: string[]): string[] {
  return [...skills].map((s) => s.trim()).filter(Boolean).sort((a, b) => a.localeCompare(b));
}

function descSnippet(jobDescription: string, max = 400): string {
  return jobDescription.trim().slice(0, max);
}

function typeHintEn(t: InterviewBriefingType): string {
  switch (t) {
    case "async_video":
      return "async video interview";
    case "live_coding":
      return "live coding session";
    case "behavioral":
      return "behavioral interview";
    case "system_design":
      return "system design discussion";
    case "recruiter_screen":
      return "recruiter screen";
    default:
      return "interview";
  }
}

function typeHintPt(t: InterviewBriefingType): string {
  switch (t) {
    case "async_video":
      return "vídeo assíncrono";
    case "live_coding":
      return "live coding";
    case "behavioral":
      return "entrevista comportamental";
    case "system_design":
      return "system design";
    case "recruiter_screen":
      return "triagem com recrutador";
    default:
      return "entrevista";
  }
}

/** Briefing 100% local e determinístico — sem LLM. */
export function generateInterviewBriefing(input: BriefingInput): InterviewBriefingContent {
  const parsed = briefingInputSchema.parse(input);
  const { company, role, interviewType, language } = parsed;
  const skills = sortedSkills(parsed.requiredSkills);
  const snippet = descSnippet(parsed.jobDescription ?? "");
  const top = skills[0] ?? "your stack";
  const second = skills[1] ?? "testing";
  const roleShort = role.trim() || "this role";

  if (language === "english") {
    const th = typeHintEn(interviewType);
    const corePitch: string[] = [
      `Hi — I'm focused on ${roleShort} at ${company.trim()}, with strength in ${top} and ${second}.`,
      `I'm preparing for a ${th}; I want to show impact, clarity, and how I collaborate under real constraints.`,
    ];

    const roleAlignment: string[] = [
      `Map ${company.trim()}'s needs to two wins you already delivered (metrics + trade-offs).`,
      `Tie ${top} to the job excerpt: "${snippet.slice(0, 160)}${snippet.length > 160 ? "…" : ""}"`,
      `For ${th}, emphasize communication: restate the problem, narrate trade-offs, and close with a crisp summary.`,
    ];

    const projectCards: ProjectCard[] = [
      {
        title: `Project A — ${top}`,
        bullets: [
          `Problem: reduce latency / improve reliability in a ${top}-heavy flow.`,
          `Action: measurable change (before/after) and one key technical decision.`,
          `Result: business outcome in one sentence (users, cost, or speed).`,
        ],
      },
      {
        title: `Project B — collaboration`,
        bullets: [
          `Cross-functional work with product/design; how you resolved disagreement once.`,
          `How you tested and rolled out safely (feature flags, canary, or reviews).`,
        ],
      },
    ];

    const techQ: string[] = [
      `How would you design a feature where ${top} is central for ${roleShort}?`,
      `What are failure modes and monitoring for that system?`,
      interviewType === "system_design"
        ? `Sketch a high-level architecture for a read-heavy service; where would you cache?`
        : `Walk through complexity of your last ${top} solution in plain English.`,
    ];

    const behQ: string[] = [
      `Tell me about a time you missed a deadline — what did you learn?`,
      `Describe a conflict with a teammate and how you aligned.`,
      `When did you change your mind after seeing data?`,
    ];

    const starOutlines: StarOutline[] = [
      {
        title: "STAR — ownership under pressure",
        bullets: [
          `S: tight timeline on ${top} work at ${company.trim()} (or similar).`,
          `T: deliver without breaking production.`,
          `A: scope cut, tests, communication.`,
          `R: outcome with a number or qualitative win.`,
        ],
      },
      {
        title: "STAR — learning / humility",
        bullets: [`S: unfamiliar ${second} area`, `T: get productive fast`, `A: study plan + mentor`, `R: impact`],
      },
    ];

    const askInterviewer: string[] = [
      `What does success look like in the first 90 days for ${roleShort}?`,
      `How does the team balance quality vs delivery today?`,
      `What is the on-call or incident culture like?`,
    ];

    const vocab: string[] = [
      `Practice aloud: "Let me restate the problem…", "Here are two options…", "Trade-off is…".`,
      `Avoid filler; pause instead. For ${th}, keep answers under 90s unless they ask to go deeper.`,
    ];

    const checklist: string[] = [
      `Sleep, water, and a tested mic/camera (if video) — prepared, not hidden assistance.`,
      `Review this briefing out loud once; no second screen during the real interview.`,
      `Prepare 2 questions you genuinely care about; write them in a notebook if allowed.`,
    ];

    return {
      corePitch,
      roleAlignment,
      projectCards,
      likelyTechnicalQuestions: techQ,
      likelyBehavioralQuestions: behQ,
      starOutlines,
      questionsForInterviewer: askInterviewer,
      vocabularyNotes: vocab,
      finalChecklist: checklist,
    };
  }

  const thPt = typeHintPt(interviewType);
  const corePitch: string[] = [
    `Olá — estou a preparar-me para ${roleShort} na ${company.trim()}, com foco em ${top} e ${second}.`,
    `O formato é ${thPt}; quero mostrar impacto, clareza e colaboração em cenários reais.`,
  ];

  const roleAlignment: string[] = [
    `Liga as necessidades da ${company.trim()} a duas vitórias tuas (métricas + trade-offs).`,
    `Relaciona ${top} com o excerto da vaga: "${snippet.slice(0, 160)}${snippet.length > 160 ? "…" : ""}"`,
    `Para ${thPt}, reforça comunicação: reformular o problema, explicar trade-offs e fechar com resumo curto.`,
  ];

  const projectCards: ProjectCard[] = [
    {
      title: `Projeto A — ${top}`,
      bullets: [
        `Problema: latência ou fiabilidade num fluxo com ${top}.`,
        `Acção: mudança mensurável (antes/depois) e uma decisão técnica chave.`,
        `Resultado: impacto numa frase (utilizadores, custo ou velocidade).`,
      ],
    },
    {
      title: `Projeto B — colaboração`,
      bullets: [
        `Trabalho com produto/design; um desacordo e como alinhaste.`,
        `Como testaste e fizeste rollout seguro (flags, canary ou revisões).`,
      ],
    },
  ];

  const techQ: string[] = [
    `Como desenharias uma funcionalidade onde ${top} é central para ${roleShort}?`,
    `Quais modos de falha e monitorização para esse sistema?`,
    interviewType === "system_design"
      ? `Esboça uma arquitectura read-heavy; onde porias cache?`
      : `Explica a complexidade da tua última solução com ${top} em português claro.`,
  ];

  const behQ: string[] = [
    `Conta uma altura em que falhaste um prazo — o que aprendeste?`,
    `Descreve um conflito com um colega e como chegaste a consenso.`,
    `Quando mudaste de opinião com base em dados?`,
  ];

  const starOutlines: StarOutline[] = [
    {
      title: "STAR — responsabilidade sob pressão",
      bullets: [
        `S: prazo apertado com ${top} na ${company.trim()} (ou similar).`,
        `T: entregar sem partir produção.`,
        `A: cortar âmbito, testes, comunicação.`,
        `R: resultado com número ou vitória qualitativa.`,
      ],
    },
    {
      title: "STAR — aprendizagem",
      bullets: [
        `S: área ${second} pouco familiar`,
        `T: ser produtivo rápido`,
        `A: plano de estudo + mentor`,
        `R: impacto`,
      ],
    },
  ];

  const askInterviewer: string[] = [
    `O que é sucesso nos primeiros 90 dias para ${roleShort}?`,
    `Como é que o equilíbrio qualidade vs entrega funciona na equipa?`,
    `Como é a cultura de incidentes / on-call?`,
  ];

  const vocab: string[] = [
    `Ensaia em voz alta: "Deixa-me reformular…", "Tenho duas opções…", "O trade-off é…".`,
    `Evita vícios de linguagem; pausa em vez de preenchimento. Para ${thPt}, respostas curtas salvo que peçam detalhe.`,
  ];

  const checklist: string[] = [
    `Descanso, água e teste de micro/câmara (se vídeo) — preparação honesta, não "cola" oculta.`,
    `Rever este briefing em voz alta uma vez; sem segundo ecrã durante a entrevista real.`,
    `Preparar 2 perguntas genuínas; anotar num caderno se for permitido.`,
  ];

  return {
    corePitch,
    roleAlignment,
    projectCards,
    likelyTechnicalQuestions: techQ,
    likelyBehavioralQuestions: behQ,
    starOutlines,
    questionsForInterviewer: askInterviewer,
    vocabularyNotes: vocab,
    finalChecklist: checklist,
  };
}

export function briefingInputFromCareerApplication(app: {
  id: string;
  company: string;
  role: string;
  jobDescription?: string;
  requiredSkills: string[];
}): BriefingInput {
  return briefingInputSchema.parse({
    company: app.company,
    role: app.role,
    jobDescription: app.jobDescription ?? "",
    requiredSkills: app.requiredSkills,
    interviewType: "live_coding",
    language: "english",
    sourceApplicationId: app.id,
  });
}

export function exportBriefingMarkdown(
  title: string,
  input: BriefingInput,
  content: InterviewBriefingContent,
): string {
  const lines: string[] = [];
  lines.push(`# Interview Briefing — ${title}`);
  lines.push("");
  lines.push(`- **Company:** ${input.company}`);
  lines.push(`- **Role:** ${input.role}`);
  lines.push(`- **Type:** ${input.interviewType}`);
  lines.push(`- **Language:** ${input.language}`);
  if (input.sourceApplicationId) {
    lines.push(`- **Source application id:** ${input.sourceApplicationId}`);
  }
  lines.push("");
  lines.push("> Generated locally in Interview Lab (deterministic, no external AI).");
  lines.push("");

  const sec = (h: string, body: string[]) => {
    lines.push(`## ${h}`);
    lines.push("");
    for (const b of body) lines.push(`- ${b}`);
    lines.push("");
  };

  sec("Core pitch", content.corePitch);
  sec("Role alignment", content.roleAlignment);

  lines.push("## Project cards");
  lines.push("");
  for (const c of content.projectCards) {
    lines.push(`### ${c.title}`);
    lines.push("");
    for (const b of c.bullets) lines.push(`- ${b}`);
    lines.push("");
  }

  sec("Likely technical questions", content.likelyTechnicalQuestions);
  sec("Likely behavioral questions", content.likelyBehavioralQuestions);

  lines.push("## STAR outlines");
  lines.push("");
  for (const s of content.starOutlines) {
    lines.push(`### ${s.title}`);
    lines.push("");
    for (const b of s.bullets) lines.push(`- ${b}`);
    lines.push("");
  }

  sec("Questions for the interviewer", content.questionsForInterviewer);
  sec("Vocabulary / speaking notes", content.vocabularyNotes);
  sec("Final checklist", content.finalChecklist);

  return lines.join("\n").trimEnd() + "\n";
}
