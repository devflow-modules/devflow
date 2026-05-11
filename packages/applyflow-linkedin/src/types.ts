import type { Confidence } from "@devflow/applyflow-core";

export type FieldType =
  | "years_experience"
  | "english"
  | "salary"
  | "location"
  | "yes_no"
  | "cover_letter"
  | "unknown";

export type FieldClassification = {
  type: FieldType;
  skill?: string;
  confidence: Confidence;
};

export type JobContext = {
  title?: string;
  company?: string;
  location?: string;
  rawSnippet?: string;
};
