import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/modules/financeiro/lib/supabase/server";
import { prisma } from "@/modules/financeiro/adapters/prisma/prismaFinanceiro";
import { sendError } from "@/modules/financeiro/lib/api-response";
import {
  getActiveHouseholdCookieName,
  getActiveHouseholdFromRequest,
} from "@/modules/financeiro/adapters/cookies/householdCookie";

export type AuthContext = {
  userId: string;
  householdId: string;
  membershipId: string;
  membershipRole: "OWNER" | "MEMBER";
  supabaseId: string;
  email: string;
};

export type RequireAuthResult =
  | { ok: true; context: AuthContext }
  | { ok: false; response: NextResponse };

export async function requireHouseholdMembership(
  request: NextRequest
): Promise<RequireAuthResult> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return {
      ok: false,
      response: sendError("Não autenticado", 401, undefined, "AUTH_REQUIRED"),
    };
  }

  const supabaseId = authUser.id;
  const email = authUser.email ?? "";

  let user = await prisma.user.findUnique({
    where: { supabaseId },
    include: { memberships: { include: { household: true } } },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        supabaseId,
        email,
        name: authUser.user_metadata?.name ?? null,
        avatarUrl: authUser.user_metadata?.avatar_url ?? null,
      },
      include: { memberships: { include: { household: true } } },
    });
  }

  const memberships = await prisma.householdMembership.findMany({
    where: { userId: user.id },
    include: { household: true },
  });
  const cookieStore = getActiveHouseholdFromRequest(request);
  const activeHouseholdId =
    cookieStore && memberships.some((m: { householdId: string }) => m.householdId === cookieStore)
      ? cookieStore
      : memberships[0]?.householdId ?? null;

  if (memberships.length === 0) {
    return {
      ok: false,
      response: sendError(
        "Nenhuma casa vinculada. Complete o onboarding.",
        403,
        undefined,
        "HOUSEHOLD_REQUIRED"
      ),
    };
  }

  if (!activeHouseholdId) {
    return {
      ok: false,
      response: sendError(
        "Casa ativa não definida",
        403,
        undefined,
        "HOUSEHOLD_ACTIVE_REQUIRED"
      ),
    };
  }

  const membership = memberships.find((m: { householdId: string }) => m.householdId === activeHouseholdId);
  if (!membership) {
    return {
      ok: false,
      response: sendError(
        "Acesso negado a esta casa",
        403,
        undefined,
        "FORBIDDEN_HOUSEHOLD"
      ),
    };
  }

  return {
    ok: true,
    context: {
      userId: user.id,
      householdId: activeHouseholdId,
      membershipId: membership.id,
      membershipRole: membership.role,
      supabaseId,
      email,
    },
  };
}

export async function requireSessionOnly(
  request: NextRequest
): Promise<
  | { ok: true; supabaseId: string; email: string; userId: string }
  | { ok: false; response: NextResponse }
> {
  void request;
  const supabase = await createClient();
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return {
      ok: false,
      response: sendError("Não autenticado", 401, undefined, "AUTH_REQUIRED"),
    };
  }

  let user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        supabaseId: authUser.id,
        email: authUser.email ?? "",
        name: authUser.user_metadata?.name ?? null,
        avatarUrl: authUser.user_metadata?.avatar_url ?? null,
      },
    });
  }

  return {
    ok: true,
    supabaseId: authUser.id,
    email: authUser.email ?? "",
    userId: user.id,
  };
}

export { getActiveHouseholdCookieName };
