import type { Metadata } from "next";
import { Suspense } from "react";
import { ConversationsHistoryClient } from "@/components/conversations-history/ConversationsHistoryClient";
import { StateLoading } from "@/components/ui/app-states";

export const metadata: Metadata = {
  title: "Histórico de conversas | WhatsApp Platform",
};

export default function ConversationsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center bg-muted/60/80 p-6">
          <StateLoading message="A carregar histórico…" />
        </div>
      }
    >
      <ConversationsHistoryClient />
    </Suspense>
  );
}
