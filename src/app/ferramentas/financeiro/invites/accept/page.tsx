import { Suspense } from "react";
import { InviteAcceptClient } from "./InviteAcceptClient";

export default function InviteAcceptPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center px-4 py-10">
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      }
    >
      <InviteAcceptClient />
    </Suspense>
  );
}
