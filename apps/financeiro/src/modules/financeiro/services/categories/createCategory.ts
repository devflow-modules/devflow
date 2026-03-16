import type { PrismaClient } from "@prisma/client";

export type CreateCategoryInput = {
  name: string;
  color?: string;
};

export async function createCategory(
  prisma: PrismaClient,
  householdId: string,
  data: CreateCategoryInput
) {
  return prisma.category.create({
    data: {
      householdId,
      name: data.name.trim(),
      color: data.color?.trim() ?? "#6366f1",
    },
  });
}
