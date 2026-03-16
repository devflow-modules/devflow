import type { PrismaClient } from "@prisma/client";

export async function deleteCategory(
  prisma: PrismaClient,
  categoryId: string,
  householdId: string
) {
  const result = await prisma.category.deleteMany({
    where: { id: categoryId, householdId },
  });
  return result.count > 0;
}
