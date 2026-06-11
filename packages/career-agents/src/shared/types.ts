export type SkillCategory =
  | "frontend"
  | "backend"
  | "database"
  | "devops"
  | "testing"
  | "ai"
  | "product"
  | "soft-skill"
  | "other";

export type CareerSeniority = "intern" | "junior" | "mid" | "senior" | "lead" | "unknown";

export type CareerSkill = {
  name: string;
  category?: SkillCategory;
  required?: boolean;
};
