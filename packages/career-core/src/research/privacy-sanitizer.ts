const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_PATTERN = /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,3}\)?[\s.-]?)?\d{4,5}[\s.-]?\d{4}\b/g;
const CPF_PATTERN = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;
const CNPJ_PATTERN = /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g;
const URL_PATTERN = /\bhttps?:\/\/[^\s]+/gi;
const LINKEDIN_PATTERN = /\blinkedin\.com\/in\/[^\s]+/gi;
const GITHUB_USER_PATTERN = /\bgithub\.com\/[A-Za-z0-9_-]+\b/gi;
const ADDRESS_PATTERN =
  /\b(rua|avenida|av\.|r\.|logradouro|cep\s*:?\s*\d{5}-?\d{3})\b/gi;
const EXPLICIT_NAME_PATTERN = /\b(nome|name)\s*:\s*[A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)+\b/gi;

const RESUME_SECTION_MARKERS =
  /\b(experiência|experiencia|formação|formacao|education|skills|competências|competencias|projects|projetos|currículo|curriculo|resume)\b/gi;

const JOB_SECTION_MARKERS =
  /\b(requisitos|requirements|responsabilidades|responsibilities|salário|salary|benefícios|beneficios|vaga para|job description)\b/gi;

const COMPANY_HINT_PATTERN =
  /\b(trabalhou na|empresa|company|atualmente na|ex-\s*[A-Z][a-z]+)\b/gi;

export const PILOT_CONTENT_MAX_BYTES = 100 * 1024;

export type PrivacySanitizationResult = {
  sanitized: string;
  redactions: string[];
  blocked: boolean;
  blockReason?: string;
};

export type PilotContentSanitizationResult = PrivacySanitizationResult & {
  redactionCount: number;
  unsafeDetected: boolean;
};

function replaceWithToken(
  text: string,
  pattern: RegExp,
  token: string,
  redactions: string[],
): string {
  return text.replace(pattern, (match) => {
    redactions.push(match.slice(0, 12));
    return token;
  });
}

function replaceWithCategory(text: string, pattern: RegExp, category: string, redactions: string[]): string {
  return replaceWithToken(text, pattern, `[${category}]`, redactions);
}

export function sanitizePilotContent(input: string): PilotContentSanitizationResult {
  const redactions: string[] = [];
  let sanitized = input.trim();

  if (!sanitized) {
    return { sanitized: "", redactions, blocked: false, redactionCount: 0, unsafeDetected: false };
  }

  if (Buffer.byteLength(sanitized, "utf8") > PILOT_CONTENT_MAX_BYTES) {
    return {
      sanitized: "",
      redactions: ["INPUT_TOO_LARGE"],
      blocked: true,
      blockReason: "INPUT_REJECTED_TOO_LARGE",
      redactionCount: 1,
      unsafeDetected: true,
    };
  }

  sanitized = replaceWithToken(sanitized, EMAIL_PATTERN, "[EMAIL REDACTED]", redactions);
  sanitized = replaceWithToken(sanitized, PHONE_PATTERN, "[PHONE REDACTED]", redactions);
  sanitized = replaceWithToken(sanitized, CPF_PATTERN, "[PERSONAL DATA REDACTED]", redactions);
  sanitized = replaceWithToken(sanitized, CNPJ_PATTERN, "[PERSONAL DATA REDACTED]", redactions);
  sanitized = replaceWithToken(sanitized, URL_PATTERN, "[URL REDACTED]", redactions);
  sanitized = replaceWithToken(sanitized, LINKEDIN_PATTERN, "[URL REDACTED]", redactions);
  sanitized = replaceWithToken(sanitized, GITHUB_USER_PATTERN, "[URL REDACTED]", redactions);
  sanitized = replaceWithToken(sanitized, ADDRESS_PATTERN, "[PERSONAL DATA REDACTED]", redactions);
  sanitized = replaceWithToken(sanitized, EXPLICIT_NAME_PATTERN, "[PERSONAL DATA REDACTED]", redactions);

  const wordCount = sanitized.split(/\s+/).length;
  if (RESUME_SECTION_MARKERS.test(sanitized) && wordCount > 40) {
    return {
      sanitized: "[RESUME CONTENT REDACTED]",
      redactions: [...redactions, "resume_like_block"],
      blocked: true,
      blockReason: "Input resembles résumé content; record category-level observations only.",
      redactionCount: redactions.length + 1,
      unsafeDetected: true,
    };
  }

  if (JOB_SECTION_MARKERS.test(sanitized) && wordCount > 35) {
    return {
      sanitized: "[JOB CONTENT REDACTED]",
      redactions: [...redactions, "job_like_block"],
      blocked: true,
      blockReason: "Input resembles full job description; record category-level observations only.",
      redactionCount: redactions.length + 1,
      unsafeDetected: true,
    };
  }

  if (COMPANY_HINT_PATTERN.test(sanitized)) {
    sanitized = sanitized.replace(/\b([A-Z][a-zA-Z0-9&.-]{2,})\b/g, (match) => {
      if (["Participante", "Moderador", "Preview", "Production", "Career", "Suite", "GitHub"].includes(match)) {
        return match;
      }
      redactions.push(match);
      return "empresa de tecnologia";
    });
  }

  return {
    sanitized,
    redactions,
    blocked: false,
    redactionCount: redactions.length,
    unsafeDetected: redactions.length > 0,
  };
}

export function sanitizePilotText(input: string): PrivacySanitizationResult {
  const trimmed = input.trim();
  if (/^\[[A-Z0-9 .-]+REDACTED\]$/i.test(trimmed) || trimmed === "[trecho de currículo removido]" || trimmed === "[trecho de vaga removido]") {
    return { sanitized: trimmed, redactions: [], blocked: false };
  }

  const result = sanitizePilotContent(input);
  if (result.blocked && result.blockReason === "INPUT_REJECTED_TOO_LARGE") {
    return {
      sanitized: "",
      redactions: result.redactions,
      blocked: true,
      blockReason: "Input exceeds safe length for pilot notes; summarize without full résumé or job text.",
    };
  }

  if (result.sanitized === "[RESUME CONTENT REDACTED]") {
    return {
      sanitized: "[trecho de currículo removido]",
      redactions: result.redactions,
      blocked: true,
      blockReason: result.blockReason,
    };
  }

  if (result.sanitized === "[JOB CONTENT REDACTED]") {
    return {
      sanitized: "[trecho de vaga removido]",
      redactions: result.redactions,
      blocked: true,
      blockReason: result.blockReason,
    };
  }

  return {
    sanitized: result.sanitized,
    redactions: result.redactions,
    blocked: result.blocked,
    blockReason: result.blockReason,
  };
}

export function sanitizePilotTextList(inputs: string[]): {
  sanitized: string[];
  warnings: string[];
} {
  const sanitized: string[] = [];
  const warnings: string[] = [];

  for (const input of inputs) {
    const result = sanitizePilotText(input);
    if (result.blocked) {
      warnings.push(result.blockReason ?? "Blocked potentially sensitive content.");
      sanitized.push(result.sanitized);
      continue;
    }
    sanitized.push(result.sanitized);
  }

  return { sanitized, warnings };
}

export function sanitizeGithubCommentDraft(draft: string): string {
  const lines = draft.split(/\r?\n/);
  const sanitizedLines = lines.map((line) => {
    if (line.trim().startsWith("<!--") || line.trim().startsWith("#")) {
      return line;
    }
    const result = sanitizePilotContent(line);
    if (result.blocked && result.blockReason === "INPUT_REJECTED_TOO_LARGE") {
      return "[CONTENT REDACTED]";
    }
    if (
      result.blocked &&
      (result.sanitized === "[RESUME CONTENT REDACTED]" || result.sanitized === "[JOB CONTENT REDACTED]")
    ) {
      return result.sanitized;
    }
    return result.sanitized;
  });
  return sanitizedLines.join("\n");
}
