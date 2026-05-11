/** Heurísticas locais sobre texto já disponível da vaga — não persistir o texto através desta API. */

export type JobSeniority = "junior" | "mid" | "senior" | "lead" | "unknown";
export type JobRoleType =
  | "frontend"
  | "backend"
  | "fullstack"
  | "mobile"
  | "data"
  | "devops"
  | "unknown";
export type JobWorkModel = "remote" | "hybrid" | "onsite" | "unknown";
export type JobContractType = "clt" | "pj" | "contractor" | "internship" | "unknown";

export type JobIntelligence = {
  seniority: JobSeniority;
  roleType: JobRoleType;
  workModel: JobWorkModel;
  contractType: JobContractType;
  englishRequired: boolean;
  detectedSkills: string[];
  salaryMentioned: boolean;
};

/** Padrões mais específicos primeiro. */
const SKILL_PATTERNS: { pattern: RegExp; canonical: string }[] = [
  { pattern: /\bpostgresql\b/i, canonical: "PostgreSQL" },
  { pattern: /\bmicrosoft\s+sql\s+server\b|\bsql\s*server\b/i, canonical: "SQL Server" },
  { pattern: /\bmysql\b/i, canonical: "MySQL" },
  { pattern: /\btypescript\b/i, canonical: "TypeScript" },
  { pattern: /\bjavascript\b/i, canonical: "JavaScript" },
  { pattern: /\bnext(?:\.|\s)?js\b/i, canonical: "Next.js" },
  { pattern: /\bnode(?:\.|\s)?js\b|\bnodejs\b/i, canonical: "Node.js" },
  { pattern: /\bgraphql\b/i, canonical: "GraphQL" },
  { pattern: /\bnestjs\b|\bnest\s*js\b/i, canonical: "NestJS" },
  { pattern: /\bexpress(?:\.js)?\b/i, canonical: "Express" },
  { pattern: /\bmongodb\b/i, canonical: "MongoDB" },
  { pattern: /\bracebitmq\b/i, canonical: "RabbitMQ" },
  { pattern: /\bkafka\b/i, canonical: "Kafka" },
  { pattern: /\bplaywright\b/i, canonical: "Playwright" },
  { pattern: /\bcypress\b/i, canonical: "Cypress" },
  { pattern: /\bjest\b/i, canonical: "Jest" },
  { pattern: /\bprisma\b/i, canonical: "Prisma" },
  { pattern: /\bdocker\b/i, canonical: "Docker" },
  { pattern: /\bkubernetes\b|\bk8s\b/i, canonical: "Kubernetes" },
  { pattern: /\bredis\b/i, canonical: "Redis" },
  { pattern: /\btailwind(?:\s*css)?\b/i, canonical: "Tailwind" },
  { pattern: /\.net\b|\bdot\s*net\b|\basp\.net\b/i, canonical: ".NET" },
  { pattern: /\bc#\b|\bcsharp\b/i, canonical: "C#" },
  { pattern: /\bjava\b(?![a-z])/i, canonical: "Java" },
  { pattern: /\bpython\b/i, canonical: "Python" },
  { pattern: /\baws\b|\bamazon\s+web\s+services\b/i, canonical: "AWS" },
  { pattern: /\bazure\b|\bmicrosoft\s+azure\b/i, canonical: "Azure" },
  { pattern: /\bgcp\b|\bgoogle\s+cloud\b/i, canonical: "GCP" },
  { pattern: /\brest(?:ful)?(?:\s+api)?\b/i, canonical: "REST" },
  { pattern: /\breact(?:\.js)?\b/i, canonical: "React" },
];

function uniqSkills(map: Map<string, string>): string[] {
  return [...map.values()].sort((a, b) => a.localeCompare(b));
}

/** Normaliza para regex: ascii sem diacríticos, minúsculas, espaços colapsados */
export function normalizeJobTextForIntel(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function extractJobIntelligence(text: string): JobIntelligence {
  const folded = normalizeJobTextForIntel(text);

  let seniority: JobSeniority = "unknown";
  let sr = -1;
  const bumpSen = (label: JobSeniority, rx: RegExp, rank: number) => {
    if (rank > sr && rx.test(folded)) {
      sr = rank;
      seniority = label;
    }
  };
  bumpSen("lead", /\b(?:tech\s+)?team\s+lead\b|\btech\s+lead\b|\bstaff\s+engineer\b|\bprincipal\s+engineer\b/, 42);
  bumpSen("lead", /\blead\s+developer\b|\bengineering\s+lead\b/, 36);
  bumpSen("senior", /\bspecialist\b|\bespecialista\b/, 31);
  bumpSen("senior", /\bsenior\b|\bsnr\b/, 30);
  bumpSen("senior", /(?:^|[\s,(;])sr(?:[.,\s;:)]|$)/, 29);
  bumpSen("mid", /\bpleno\b|\bmid\s*[\-]?\s*level\b|\bmid[\s\-]level\b/, 22);
  bumpSen("mid", /\bsemi[\s\-]?senior\b/, 21);
  bumpSen("junior", /\bjunior\b/, 18);
  bumpSen("junior", /\bjr(?:[.,\s;:)]|$)/, 12);

  let roleType: JobRoleType = "unknown";
  let rr = -1;
  const bumpRole = (label: JobRoleType, rx: RegExp, rank: number) => {
    if (rank > rr && rx.test(folded)) {
      rr = rank;
      roleType = label;
    }
  };
  bumpRole("fullstack", /\bfull\s*[\-]?\s*stack\b/, 38);
  bumpRole("frontend", /\bfront(?:\s*[\-]?end)?\b|\breact(?:\.js)?\b|\bnext(?:\.|\s)?js\b|\bangular\b|\bvue(?:\.js)?\b/, 32);
  bumpRole(
    "backend",
    /\bback(?:\s*[\-]?end)?\b|\bnestjs\b|\bnest\b|\bexpress\b|\bspring\b|\bfastapi\b|\bgraphql\s+api\b|\bmicroservices\b/,
    28,
  );
  bumpRole("backend", /\bapi\s+(?:rest|graphql|first)\b|\bnode\b(?![a-z])/i, 25);
  bumpRole("backend", /\bjava\b(?![a-z])|\bpython\b/, 24);
  bumpRole(
    "mobile",
    /\breact\s+native\b|\bios\b(?![a-z])|\bandroid\b|\bflutter\b|\bswift\b|\bkotlin\b|\bmobile\s+(developer|engineer)\b/,
    29,
  );
  bumpRole(
    "data",
    /\bdata\s+(scientist|engineer|analyst)\b|\bdata\s+science\b|\bml\b|\bmachine\s+learning\b|\bbig\s+data\b|\banalytics\b/,
    23,
  );
  bumpRole(
    "devops",
    /\bdevops\b|\bsre\b|\bterraform\b|\bansible\b|\bjenkins\b|\bci\s*[\/]\s*cd\b|\bkubernetes\b|\bk8s\b/,
    27,
  );

  let workModel: JobWorkModel = "unknown";
  if (/\bhybrid\b|\bhibrido\b|\bhíbrido\b|\bcultura\s+h[ií]brida\b|\bmodelo\s+h[ií]brido\b/i.test(text)) {
    workModel = "hybrid";
  } else if (
    /\b100\s*%?\s*remot/i.test(text) ||
    /\b(remote\s+first|work\s+from\s+home|totalmente\s+remoto|home\s+office|trabalho\s+remoto)\b/i.test(text) ||
    /\b(remoto\b|remota\b)/i.test(text)
  ) {
    workModel = "remote";
  } else if (/\bonsite\b|\bpresencial\b|\bon[\s-]site\b|\b(?:in|em)\s+office\b|\boffice[\s\-]based\b/i.test(text)) {
    workModel = "onsite";
  }

  let contractType: JobContractType = "unknown";
  if (/\bclt\b|\bceletista\b|\bcarteira\s+assinada\b|\bcontrato\s*clt\b/i.test(folded)) {
    contractType = "clt";
  } else if (/\bpj\b|\bpessoa\s+jurid/i.test(folded)) {
    contractType = "pj";
  } else if (/\bcontractor\b|\bcontract\s+(?:staff|based|role|position)|\bconsultancy\b/i.test(folded)) {
    contractType = "contractor";
  } else if (/\bestagio\b|\bintern\b|\binternship\b|\bjovem\s+aprendiz\b/.test(folded)) {
    contractType = "internship";
  }

  const englishRequired =
    /\bingles\b|\benglish\b|\bfluent\s+english\b|\badvanced\s+english\b|\bprofessional\s+english\b|\benglish\s+required\b|\b(required|fluent)\s*,?\s*english\b|\bingles\s+\(obrig|ingles\s+avan|be\s+fluent\s+in\s+english/i.test(
      folded + " " + text.toLowerCase().replace(/\s+/g, " "),
    );

  const salaryMentioned =
    /\bsalary\b|\bsalari\w*\b|\bsalario\b|\bcompensation\b|\bpretens\w*\b|\bpretensao\b|\bbaixa\s+salarial\b|\bfaixa\s+salar|\bbenefits?\s+(?:and\s+)?comp|\bbudget\b|\busd\b|\bbrl\b|\br\s*\$/i.test(
      folded + " " + text.toLowerCase().replace(/\s+/g, " "),
    );

  const skillMap = new Map<string, string>();
  for (const { pattern, canonical } of SKILL_PATTERNS) {
    if (pattern.test(folded)) {
      skillMap.set(canonical.toLowerCase(), canonical);
    }
  }

  const detectedSkills = uniqSkills(skillMap).slice(0, 48);

  return {
    seniority,
    roleType,
    workModel,
    contractType,
    englishRequired,
    detectedSkills,
    salaryMentioned,
  };
}
