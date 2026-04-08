"use client";

import Link from "next/link";
import { CopyTextButton } from "@/components/ui/copy-text-button";
import { buttonClassName } from "@/components/ui/button";

type Props = {
  displayNumber: string | null;
  phoneNumberId: string | null;
};

export function PostActivationGuide({ displayNumber, phoneNumberId }: Props) {
  const copyText = (displayNumber?.trim() || phoneNumberId?.trim() || "").trim();
  const showNumber = Boolean(displayNumber?.trim() || phoneNumberId?.trim());
  const label = displayNumber?.trim() || phoneNumberId?.trim() || "";

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[var(--df-brand-200)]/80 bg-[var(--df-brand-50)]/40 px-5 py-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--df-brand-800)]">Próximo passo</p>
        <p className="mt-2 text-base font-semibold text-slate-900">Ver a primeira mensagem na Inbox</p>
        <ol className="mt-4 list-none space-y-3 text-sm leading-relaxed text-slate-700">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-[var(--df-brand-700)] shadow-sm">
              1
            </span>
            <span>No telemóvel, abra o WhatsApp e envie uma mensagem para o número Business.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-[var(--df-brand-700)] shadow-sm">
              2
            </span>
            <span>Volte à Inbox no computador — a conversa surge na lista sem precisar de atualizar.</span>
          </li>
        </ol>
        {showNumber ? (
          <div className="mt-5 rounded-xl border border-slate-200/80 bg-white px-4 py-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Número para testar</p>
            <p className="mt-1 break-all font-mono text-lg font-semibold text-slate-900">{label}</p>
            {copyText ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <CopyTextButton text={copyText} />
                <Link href="/inbox" className={`${buttonClassName("primary")} inline-flex`}>
                  Abrir Inbox
                </Link>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/dashboard/whatsapp" className={`${buttonClassName("secondary")} inline-flex`}>
              Ver número e webhook
            </Link>
            <Link href="/inbox" className={`${buttonClassName("primary")} inline-flex`}>
              Abrir Inbox
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
