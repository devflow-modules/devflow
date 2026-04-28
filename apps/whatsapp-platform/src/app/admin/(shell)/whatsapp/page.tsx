import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireJwtAdminPage } from "@/lib/admin-page-guard";
import { AdminWhatsappClient } from "./AdminWhatsappClient";

export const metadata: Metadata = {
  title: "WhatsApp — Activation Control Center | Admin",
  description: "Métricas, fila de ativação e gestão de canais WhatsApp.",
  robots: "noindex, nofollow",
};

export default async function AdminWhatsappPage() {
  await requireJwtAdminPage("/admin/whatsapp");
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="df-eyebrow text-[var(--df-text-muted)]">Ferramentas internas</p>
          <h1 className="df-text-page-title text-[var(--df-text-primary)]">Activation Control Center</h1>
          <p className="df-text-page-description mt-1 max-w-2xl">
            Métricas, fila de pendentes, provisionamento e ativação — operação gerida na UI (fallback: curl/scripts).
          </p>
        </div>
        <Link href="/dashboard" className="text-sm font-medium text-[var(--df-text-secondary)] underline-offset-4 hover:underline">
          Voltar ao painel
        </Link>
      </div>
      <Suspense
        fallback={
          <div className="rounded-xl border df-border-brand bg-[var(--df-bg-elevated)] p-8 text-sm text-[var(--df-text-muted)]">A carregar…</div>
        }
      >
        <AdminWhatsappClient />
      </Suspense>
    </div>
  );
}
