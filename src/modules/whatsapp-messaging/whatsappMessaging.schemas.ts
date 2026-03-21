import { z } from "zod";

export const sendTextBodySchema = z.object({
  to: z.string().min(8).max(32),
  text: z.string().min(1).max(4096),
  preview_url: z.boolean().optional().default(false),
});

export type SendTextBody = z.infer<typeof sendTextBodySchema>;
