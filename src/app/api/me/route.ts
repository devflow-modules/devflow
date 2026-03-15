import { NextRequest } from "next/server";
import { createClient } from "@/lib/financeiro/supabase/server";
import { prisma } from "@/lib/financeiro/db";
import { sendError, sendSuccess } from "@/lib/financeiro/api-response";
import { createMarketingEvent } from "@/lib/financeiro/marketing/service";
import { resolveActiveHousehold } from "@/lib/financeiro/auth/activeHousehold";

const ACTIVE_HOUSEHOLD_COOKIE = "active_household_id";
const COOKIE_OPTIONS = {
  path: "/",
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 365,
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return sendError("Não autenticado", 401);
    }

    let user = await prisma.user.findUnique({
      where: { supabaseId: authUser.id },
      include: { memberships: { include: { household: true } } },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          supabaseId: authUser.id,
          email: authUser.email ?? "",
          name: authUser.user_metadata?.name ?? null,
          avatarUrl: authUser.user_metadata?.avatar_url ?? null,
        },
        include: { memberships: { include: { household: true } } },
      });

      const lead = await prisma.marketingLead.findUnique({
        where: { email: user.email },
        select: { id: true },
      });

      await createMarketingEvent(prisma, {
        leadId: lead?.id ?? null,
        userId: user.id,
        event: "signup_completed",
      });
    }

    const memberships = await prisma.householdMembership.findMany({
      where: { userId: user.id },
      include: { household: true },
    });

    const households = memberships.map((m: { household: { id: string; name: string; slug: string }; role: string }) => ({
      id: m.household.id,
      name: m.household.name,
      slug: m.household.slug,
      role: m.role,
    }));

    const cookieHouseholdId = request.cookies.get(ACTIVE_HOUSEHOLD_COOKIE)?.value ?? null;
    const resolved = resolveActiveHousehold({ cookieHouseholdId, memberships });
    const activeHouseholdId = resolved.activeHouseholdId;

    const activeHousehold = activeHouseholdId
      ? households.find((h: { id: string }) => h.id === activeHouseholdId) ?? null
      : null;

    const response = sendSuccess({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      households,
      activeHousehold,
      activeMembershipRole: activeHouseholdId
        ? (memberships.find((m: { householdId: string; role: string }) => m.householdId === activeHouseholdId)?.role ?? null)
        : null,
    });

    if (resolved.action === "delete") {
      response.cookies.delete(ACTIVE_HOUSEHOLD_COOKIE);
    } else if (resolved.action === "set") {
      response.cookies.set(ACTIVE_HOUSEHOLD_COOKIE, resolved.cookieValue, COOKIE_OPTIONS);
    }

    return response;
  } catch (error) {
    console.error(error);
    return sendError("Erro ao carregar perfil", 500, error);
  }
}
