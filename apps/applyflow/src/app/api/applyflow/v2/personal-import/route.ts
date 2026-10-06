import { NextResponse } from "next/server";

import { createPersonalImportService, type PersonalImportBundle } from "@/lib/persistence-v2/personal/import-service";
import { applyFlowPersonalStore } from "@/lib/persistence-v2/personal/prisma-store";
import { personalErrorResponse, withPersonalAccount } from "@/lib/persistence-v2/personal/personal-http";
import type { PersonalImportModule } from "@/lib/persistence-v2/personal/store";

const importer = createPersonalImportService(applyFlowPersonalStore);

const MODULES = new Set<PersonalImportModule>(["profile", "contacts", "responses"]);

export async function POST(request: Request) {
  return withPersonalAccount(request, "write", async (account) => {
    try {
      const body = (await request.json()) as PersonalImportBundle & { module?: string };
      if (!body.module || !MODULES.has(body.module as PersonalImportModule)) {
        return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
      }
      const result = await importer.importModule(account.id, body.module as PersonalImportModule, body);
      const status = result.status === "conflict" ? 409 : 200;
      return NextResponse.json({ ...result, accountId: account.id }, { status });
    } catch (error) {
      return personalErrorResponse(error);
    }
  });
}
