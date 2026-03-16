import type { PrismaClient } from "@prisma/client";

export type UpdateCategoryInput = {
  name?: string;
  color?: string;
};

export async function updateCategory(
  prisma: PrismaClient,
  categoryId: string,
  householdId: string,
  data: UpdateCategoryInput
) {
  const result = await prisma.category.updateMany({
    where: { id: categoryId, householdId },
    data: {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.color !== undefined && { color: data.color.trim() }),
    },
  });
  if (result.count === 0) return null;
  return prisma.category.findUnique({ where: { id: categoryId } });
}
