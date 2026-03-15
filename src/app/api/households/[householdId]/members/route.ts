import { NextRequest } from "next/server";
import { prisma } from "@/lib/financeiro/db";
import { sendError, sendSuccess } from "@/lib/financeiro/api-response";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ householdId: string }> }
) {
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;

  try {
    const { householdId } = await params;
    if (householdId !== auth.context.householdId) {
      return sendError("Troque para esta casa antes de gerenciar membros", 403, undefined, "HOUSEHOLD_MISMATCH");
    }

    const memberships = await prisma.householdMembership.findMany({
      where: { householdId },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    });

    const members = memberships.map((m) => ({
      membershipId: m.id,
      userId: m.userId,
      email: m.user.email,
      name: m.user.name,
      role: m.role,
      createdAt: m.createdAt,
      isMe: m.userId === auth.context.userId,
    }));

    return sendSuccess({
      householdId,
      members,
      canManageMembers: auth.context.membershipRole === "OWNER",
    });
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível carregar membros", 500, error);
  }
}
