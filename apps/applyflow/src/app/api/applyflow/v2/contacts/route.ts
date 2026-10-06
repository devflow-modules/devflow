import { NextResponse } from "next/server";
import type { Contact, ContactInteraction } from "@devflow/applyflow-core";

import { applyFlowPersonalStore } from "@/lib/persistence-v2/personal/prisma-store";
import { personalErrorResponse, withPersonalAccount } from "@/lib/persistence-v2/personal/personal-http";
import { createPersonalContactsService } from "@/lib/persistence-v2/personal/services";

const contacts = createPersonalContactsService(applyFlowPersonalStore);

export async function GET(request: Request) {
  return withPersonalAccount(request, "read", async (account) => {
    return NextResponse.json(await contacts.list(account.id));
  });
}

export async function PUT(request: Request) {
  return withPersonalAccount(request, "write", async (account) => {
    try {
      const body = (await request.json()) as { contact?: Contact; expectedVersion?: number };
      if (!body.contact) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
      const saved = await contacts.saveContact(account.id, body.contact, body.expectedVersion);
      return NextResponse.json(saved);
    } catch (error) {
      return personalErrorResponse(error);
    }
  });
}

export async function POST(request: Request) {
  return withPersonalAccount(request, "write", async (account) => {
    try {
      const body = (await request.json()) as { interaction?: ContactInteraction };
      if (!body.interaction) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
      const saved = await contacts.saveInteraction(account.id, body.interaction);
      return NextResponse.json({ interaction: saved });
    } catch (error) {
      return personalErrorResponse(error);
    }
  });
}
