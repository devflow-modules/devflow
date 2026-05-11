import type { FieldClassification } from "@devflow/applyflow-linkedin";
import type { AiTextTask } from "@devflow/applyflow-core";

export function inferPanelAiTask(label: string, classification: FieldClassification): AiTextTask | null {
  if (classification.type === "salary") return null;
  if (
    classification.type === "years_experience" ||
    classification.type === "yes_no" ||
    classification.type === "location"
  ) {
    return null;
  }
  const l = label.toLowerCase();
  if (/lacuna|gap|career\s+change|transi[cç][aã]o|mudan[cç]a\s+de\s+[aá]rea/i.test(l)) {
    return "gap_explanation";
  }
  if (
    /recrutador|recruiter|hiring\s+manager|mensagem\s+(para|à|ao)|message\s+to|note\s+to|reach\s+out/i.test(l)
  ) {
    return "recruiter_message";
  }
  if (classification.type === "cover_letter") return "cover_letter";
  if (classification.type === "unknown") return "open_answer";
  if (classification.type === "english") return "open_answer";
  return null;
}
