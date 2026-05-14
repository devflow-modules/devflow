import { z } from "zod";
import { careerApplicationSchema } from "./careerApplication.js";

export const careerBundleSchema = z.object({
  schemaVersion: z.literal("1.0"),
  exportedAt: z.string().min(1),
  sourceProduct: z.literal("applyflow"),
  candidate: z
    .object({
      name: z.string().optional(),
      targetRole: z.string().optional(),
      mainStack: z.array(z.string()).optional(),
    })
    .optional(),
  applications: z.array(careerApplicationSchema),
});

export type CareerBundle = z.infer<typeof careerBundleSchema>;
