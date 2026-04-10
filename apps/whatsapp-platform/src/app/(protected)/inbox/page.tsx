import { Suspense } from "react";
import { InboxShell } from "@/components/inbox/InboxShell";
import { StateLoading } from "@/components/ui/app-states";

export const metadata = {
  title: "Inbox | WhatsApp Platform",
};

export default function InboxPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center bg-slate-50/80 p-6">
          <StateLoading message="A carregar inbox…" />
        </div>
      }
    >
      <InboxShell />
    </Suspense>
  );
}
