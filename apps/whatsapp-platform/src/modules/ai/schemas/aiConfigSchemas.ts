import { z } from "zod";
import type { AiAgentTone } from "@/generated/prisma-whatsapp";

export const RUNTIME_DRIVERS = ["ruleBased", "openAI", "claude"] as const;

export const OPENAI_MODELS = ["gpt-4o-mini", "gpt-4o"] as const;

export const ANTHROPIC_MODELS = [
  "claude-3-5-haiku-20241022",
  "claude-3-5-sonnet-20241022",
] as const;

const TONES = ["FRIENDLY", "SALES", "SUPPORT", "NEUTRAL"] as const satisfies readonly AiAgentTone[];

const MAX = {
  assistantName: 120,
  businessContext: 8000,
  goal: 2000,
  outOfHours: 2000,
  legacyPrompt: 16_000,
  ruleItem: 500,
  topicItem: 200,
  handoffItem: 300,
  listItems: 50,
} as const;

export function sanitizeLines(raw: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const t = item.replace(/\u0000/g, "").trim().slice(0, maxLen);
    if (t) out.push(t);
    if (out.length >= maxItems) break;
  }
  return out;
}

export function clampNumber(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

const toneSchema = z.enum(TONES);

export const aiConfigPutSchema = z.object({
  enabled: z.boolean().optional(),
  systemPrompt: z.string().max(MAX.legacyPrompt).optional(),
  model: z.string().min(1).max(128).optional(),
  tone: toneSchema.optional(),
  maxTokens: z.number().optional(),
  temperature: z.number().optional(),
  fallbackToHuman: z.boolean().optional(),
  driver: z.enum(RUNTIME_DRIVERS).nullable().optional(),

  assistantName: z.string().max(MAX.assistantName).nullable().optional(),
  businessContext: z.string().max(MAX.businessContext).nullable().optional(),
  goal: z.string().max(MAX.goal).nullable().optional(),
  rules: z.array(z.string()).optional(),
  forbiddenTopics: z.array(z.string()).optional(),
  handoffTriggers: z.array(z.string()).optional(),
  autoReply: z.boolean().optional(),
  outOfHoursReply: z.string().max(MAX.outOfHours).nullable().optional(),

  playbookJson: z
    .object({
      lead: z.object({ goal: z.string().max(500).optional(), rules: z.array(z.string().max(400)).max(24).optional() }).optional(),
      qualifying: z
        .object({ goal: z.string().max(500).optional(), rules: z.array(z.string().max(400)).max(24).optional() })
        .optional(),
      negotiating: z
        .object({ goal: z.string().max(500).optional(), rules: z.array(z.string().max(400)).max(24).optional() })
        .optional(),
      support: z.object({ goal: z.string().max(500).optional(), rules: z.array(z.string().max(400)).max(24).optional() }).optional(),
      closed: z.object({ goal: z.string().max(500).optional(), rules: z.array(z.string().max(400)).max(24).optional() }).optional(),
    })
    .partial()
    .nullable()
    .optional(),
});

export type AiConfigPutInput = z.infer<typeof aiConfigPutSchema>;

export function normalizeAiConfigPut(
  data: AiConfigPutInput
): Omit<
  AiConfigPutInput,
  "rules" | "forbiddenTopics" | "handoffTriggers"
> & {
  rules?: string[];
  forbiddenTopics?: string[];
  handoffTriggers?: string[];
} {
  const rules = data.rules !== undefined ? sanitizeLines(data.rules, MAX.listItems, MAX.ruleItem) : undefined;
  const forbiddenTopics =
    data.forbiddenTopics !== undefined
      ? sanitizeLines(data.forbiddenTopics, MAX.listItems, MAX.topicItem)
      : undefined;
  const handoffTriggers =
    data.handoffTriggers !== undefined
      ? sanitizeLines(data.handoffTriggers, MAX.listItems, MAX.handoffItem)
      : undefined;

  return {
    ...data,
    ...(rules !== undefined ? { rules } : {}),
    ...(forbiddenTopics !== undefined ? { forbiddenTopics } : {}),
    ...(handoffTriggers !== undefined ? { handoffTriggers } : {}),
  };
}

export function normalizeAiConfigPartial(
  draft: Partial<AiConfigPutInput>
): Partial<AiConfigPutInput> {
  const out: Partial<AiConfigPutInput> = { ...draft };
  if (draft.rules !== undefined) out.rules = sanitizeLines(draft.rules, MAX.listItems, MAX.ruleItem);
  if (draft.forbiddenTopics !== undefined) {
    out.forbiddenTopics = sanitizeLines(draft.forbiddenTopics, MAX.listItems, MAX.topicItem);
  }
  if (draft.handoffTriggers !== undefined) {
    out.handoffTriggers = sanitizeLines(draft.handoffTriggers, MAX.listItems, MAX.handoffItem);
  }
  return out;
}

export function validateModelForDriver(driver: string | null | undefined, model: string): boolean {
  const m = model.trim();
  if (!m) return false;
  if (driver === "claude") {
    return (ANTHROPIC_MODELS as readonly string[]).includes(m);
  }
  if (driver === "openAI" || driver === null || driver === undefined || driver === "ruleBased") {
    return (OPENAI_MODELS as readonly string[]).includes(m);
  }
  return (OPENAI_MODELS as readonly string[]).includes(m);
}
