"use client";

import Link from "next/link";
import type { WhatsappLineSummary } from "./inboxTypes";
import { CopyTextButton } from "@/components/ui/copy-text-button";
import { buttonClassName } from "@/components/ui/button";

function pickLine(lines: WhatsappLineSummary[]): WhatsappLineSummary | null {
  if (!lines.length) return null;
  return lines.find((l) => l.isPrimary) ?? lines[0];
}

export function FirstConversationHint({
  variant,
  lines,
}: {
  variant: "sidebar" | "main";
  lines: WhatsappLineSummary[];
}) {
  const line = pickLine(lines);
  const display =
    line?.displayPhoneNumber?.trim() ||
    line?.label?.trim() ||
    null;
  const copyText = display || line?.phoneNumberId?.trim() || "";

  const numberBlock =
    copyText ? (
      <div className="mt-3 rounded-xl border border-slate-200/90 bg-slate-50/80 px-3 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Número Business</p>
        <p className="mt-1 font-mono text-base font-semibold tracking-tight text-slate-900">{display || line?.phoneNumberId}</p>
        <div className="mt-3">
          <CopyTextButton text={copyText} />
        </div>
      </div>
    ) : (
      <p className="mt-3 text-sm text-slate-600">
        O número aparece em{" "}
        <Link href="/dashboard/whatsapp" className="font-medium text-[var(--df-brand-700)] underline">
          WhatsApp → Estado da ligação
        </Link>
        .
      </p>
    );

  if (variant === "sidebar") {
    return (
      <div className="space-y-3 text-left" data-testid="first-conversation-hint">
        <p className="text-sm leading-relaxed text-slate-600">
          <span className="font-medium text-slate-800">1.</span> Abra o WhatsApp no telemóvel pessoal.
        </p>
        <p className="text-sm leading-relaxed text-slate-600">
          <span className="font-medium text-slate-800">2.</span> Envie qualquer mensagem de texto para o número da sua
          empresa (o mesmo que ligou na Meta).
        </p>
        <p className="text-sm leading-relaxed text-slate-600">
          <span className="font-medium text-slate-800">3.</span> Esta lista atualiza sozinha — a conversa aparece à
          esquerda em segundos.
        </p>
        {numberBlock}
        <p className="text-xs leading-relaxed text-slate-500">
          Se nada surgir em um minuto, confirme o webhook e o URL público na Meta ou em{" "}
          <Link href="/dashboard/whatsapp" className="font-medium text-[var(--df-brand-700)] underline">
            Estado da ligação
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md text-left" data-testid="first-conversation-hint-main">
      <p className="text-sm font-semibold text-slate-900">Primeiro contacto</p>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        A inbox está ligada e a escutar mensagens. O valor aparece quando a primeira conversa entra — use o passo a passo
        ao lado (mobile → mensagem de teste).
      </p>
      {numberBlock}
      <Link
        href="/dashboard/whatsapp"
        className={`${buttonClassName("ghost")} mt-4 inline-flex text-[var(--df-brand-700)]`}
      >
        Rever webhook e ligação →
      </Link>
    </div>
  );
}
