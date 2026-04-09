"use client";

import { useState } from "react";
import Link from "next/link";
import type { WhatsappLineSummary } from "./inboxTypes";
import { CopyTextButton } from "@/components/ui/copy-text-button";
import { buttonClassName } from "@/components/ui/button";
import { useSimpleToast } from "@/components/ui/simple-toast";
import { buildWhatsAppLink, normalizePhoneDigitsForWaMe } from "@/modules/whatsapp/buildWhatsAppLink";
import {
  formatPhoneInternational,
  formatWhatsappLineStatusForUi,
} from "@/modules/whatsapp/formatPhoneInternational";
import {
  DEFAULT_TEST_MESSAGE_COPY,
  DEFAULT_TEST_MESSAGE_PREFILL,
} from "@/modules/ai/firstResponseTemplate";
import { SupportHelpButton } from "@/components/support/SupportHelpButton";

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
  const { showToast, toastAnchor } = useSimpleToast();
  const [waOpened, setWaOpened] = useState(false);
  const line = pickLine(lines);
  const rawDisplay = line?.displayPhoneNumber?.trim() || "";
  const waDigits = rawDisplay ? normalizePhoneDigitsForWaMe(rawDisplay) : "";
  const canOpenWa = waDigits.length >= 10 && waDigits.length <= 15;
  const waHref = canOpenWa
    ? buildWhatsAppLink({ phoneNumber: waDigits, message: DEFAULT_TEST_MESSAGE_PREFILL })
    : null;

  const formatted =
    formatPhoneInternational(rawDisplay) ||
    rawDisplay ||
    line?.label?.trim() ||
    line?.phoneNumberId?.trim() ||
    "";
  const copyNumberDigits = waDigits || normalizePhoneDigitsForWaMe(line?.phoneNumberId || "");
  const statusLine = formatWhatsappLineStatusForUi(line?.status ?? null);

  const numberBlock =
    formatted ? (
      <div className="mt-3 rounded-xl border border-slate-200/90 bg-slate-50/80 px-3 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Número Business</p>
        {statusLine ? (
          <p className="mt-1 text-xs font-medium text-slate-600" data-testid="line-status-inbox-hint">
            {statusLine}
          </p>
        ) : null}
        <p className="mt-1 font-mono text-base font-semibold tracking-tight text-slate-900">{formatted}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {waHref ? (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className={`${buttonClassName("primary")} inline-flex text-center text-sm no-underline`}
              onClick={() => setWaOpened(true)}
            >
              Abrir WhatsApp
            </a>
          ) : null}
          {copyNumberDigits ? (
            <CopyTextButton text={copyNumberDigits} label="Copiar número" onCopied={() => showToast("Número copiado ✔")} />
          ) : null}
          <CopyTextButton
            text={DEFAULT_TEST_MESSAGE_COPY}
            label="Copiar mensagem"
            onCopied={() => showToast("Mensagem copiada ✔")}
          />
        </div>
        {waOpened ? (
          <p className="mt-3 text-xs leading-relaxed text-emerald-800">
            Envie a mensagem no WhatsApp e volte aqui — atualizamos automaticamente.
          </p>
        ) : null}
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
        {toastAnchor}
        <p className="text-sm leading-relaxed text-slate-600">
          <span className="font-medium text-slate-800">1.</span> Use «Abrir WhatsApp» ou copie número e mensagem.
        </p>
        <p className="text-sm leading-relaxed text-slate-600">
          <span className="font-medium text-slate-800">2.</span> Envie do telemóvel pessoal para o número Business.
        </p>
        <p className="text-sm leading-relaxed text-slate-600">
          <span className="font-medium text-slate-800">3.</span> Esta lista atualiza sozinha — a conversa aparece à
          esquerda em segundos.
        </p>
        {numberBlock}
        <p className="text-xs leading-relaxed text-slate-500">
          Se nada surgir em um minuto, confirme o webhook na Meta ou em{" "}
          <Link href="/dashboard/whatsapp" className="font-medium text-[var(--df-brand-700)] underline">
            Estado da ligação
          </Link>
          .
        </p>
        <div className="pt-2">
          <SupportHelpButton variant="compact" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md text-left" data-testid="first-conversation-hint-main">
      {toastAnchor}
      <p className="text-sm font-semibold text-slate-900">Primeiro contacto</p>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        Abra o WhatsApp com um clique, envie o teste e volte — a inbox sincroniza sozinha.
      </p>
      {numberBlock}
      <Link
        href="/dashboard/whatsapp"
        className={`${buttonClassName("ghost")} mt-4 inline-flex text-[var(--df-brand-700)]`}
      >
        Rever webhook e ligação →
      </Link>
      <div className="mt-5 flex justify-start">
        <SupportHelpButton variant="compact" />
      </div>
    </div>
  );
}
