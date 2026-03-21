/**
 * POST /api/whatsapp/onboard/callback
 * Recebe code + state do Embedded Signup, troca por token, salva em WhatsappPhoneNumber.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@wa/modules/auth";
import { prisma } from "@/lib/prisma";
import { exchangeCodeAndFetchPhoneNumbers } from "@wa/modules/whatsapp/embeddedSignupService";
import { WhatsappPhoneNumberStatus } from "@/generated/prisma-whatsapp";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
  }

  const userTenantId = auth.payload.tenantId;
  if (!userTenantId) {
    return NextResponse.json(
      { success: false, error: "Tenant não identificado" },
      { status: 400 }
    );
  }

  let body: { code?: string; state?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Body JSON inválido" },
      { status: 400 }
    );
  }

  const { code, state } = body;
  if (!code || typeof code !== "string" || !state || typeof state !== "string") {
    return NextResponse.json(
      { success: false, error: "code e state são obrigatórios" },
      { status: 400 }
    );
  }

  if (state !== userTenantId) {
    console.warn(
      `[WHATSAPP][onboard/callback] state mismatch: state=${state} userTenant=${userTenantId}`
    );
    return NextResponse.json(
      { success: false, error: "State inválido — não é permitido conectar número a outro tenant" },
      { status: 403 }
    );
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: userTenantId },
    select: { id: true },
  });

  if (!tenant) {
    return NextResponse.json(
      { success: false, error: "Tenant não encontrado" },
      { status: 404 }
    );
  }

  try {
    const phoneNumbers = await exchangeCodeAndFetchPhoneNumbers(code);
    const created: string[] = [];

    for (const pn of phoneNumbers) {
      const existing = await prisma.whatsappPhoneNumber.findUnique({
        where: { phoneNumberId: pn.phoneNumberId },
      });

      if (existing) {
        if (existing.tenantId !== userTenantId) {
          console.warn(
            `[WHATSAPP][onboard/callback] phone_number_id ${pn.phoneNumberId} já pertence ao tenant ${existing.tenantId}`
          );
          continue;
        }
        await prisma.whatsappPhoneNumber.update({
          where: { id: existing.id },
          data: {
            accessToken: pn.accessToken,
            displayPhoneNumber: pn.displayPhoneNumber,
            wabaId: pn.wabaId,
            businessId: pn.businessId,
            status: WhatsappPhoneNumberStatus.ACTIVE,
          },
        });
        created.push(pn.phoneNumberId);
      } else {
        await prisma.whatsappPhoneNumber.create({
          data: {
            tenantId: userTenantId,
            phoneNumberId: pn.phoneNumberId,
            displayPhoneNumber: pn.displayPhoneNumber,
            wabaId: pn.wabaId,
            accessToken: pn.accessToken,
            businessId: pn.businessId,
            status: WhatsappPhoneNumberStatus.ACTIVE,
          },
        });
        created.push(pn.phoneNumberId);
      }
    }

    for (const pid of created) {
      console.info(`[WHATSAPP] onboard success tenant=${userTenantId} phone_number_id=${pid}`);
    }
    return NextResponse.json({
      success: true,
      data: {
        phoneNumbers: created,
        message: `${created.length} número(s) conectado(s) com sucesso.`,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao processar callback";
    console.error("[WHATSAPP][ERROR] onboard callback:", e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
