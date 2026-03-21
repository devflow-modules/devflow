import { z } from "zod";

export const webhookVerificationQuerySchema = z.object({
  "hub.mode": z.string().optional(),
  "hub.verify_token": z.string().optional(),
  "hub.challenge": z.string().optional(),
});

const looseRecord = z.record(z.string(), z.unknown()).optional();

export const metaWebhookBodySchema = z
  .object({
    object: z.string().optional(),
    entry: z
      .array(
        z
          .object({
            id: z.string().optional(),
            changes: z
              .array(
                z
                  .object({
                    field: z.string().optional(),
                    value: z
                      .object({
                        messaging_product: z.string().optional(),
                        metadata: looseRecord,
                        contacts: z.array(z.unknown()).optional(),
                        messages: z.array(z.unknown()).optional(),
                        statuses: z.array(z.unknown()).optional(),
                        errors: z.array(z.unknown()).optional(),
                      })
                      .passthrough()
                      .optional(),
                  })
                  .passthrough()
              )
              .optional(),
          })
          .passthrough()
      )
      .optional(),
  })
  .passthrough();

export type MetaWebhookBodyInput = z.infer<typeof metaWebhookBodySchema>;
