import { z } from "zod";

export const emailSchema = z.string().email().max(255);

export function isValidEmail(value: string): boolean {
  return emailSchema.safeParse(value).success;
}
