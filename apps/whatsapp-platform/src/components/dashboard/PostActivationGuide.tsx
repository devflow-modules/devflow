"use client";

import { useState } from "react";
import Link from "next/link";
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

type Props = {
  displayNumber: string | null;
  phoneNumberId: string | null;
  lineStatus: string | null;
};

export function PostActivationGuide({ displayNumber, phoneNumberId, lineStatus }: Props) {
  const { showToast, toastAnchor } = useSimpleToast();
  const [waOpened, setWaOpened] = useState(false);

  const rawDisplay = displayNumber?.trim() || "";
  const waDigits = rawDisplay ? normalizePhoneDigitsForWaMe(rawDisplay) : "";
  const canOpenWa = waDigits.length >= 10 && waDigits.length <= 15;
  const waHref = canOpenWa
    ? buildWhatsAppLink({ phoneNumber: waDigits, message: DEFAULT_TEST_MESSAGE_PREFILL })
    : null;

  const formattedLine =
    formatPhoneInternational(rawDisplay) || (rawDisplay ? rawDisplay : phoneNumberId?.trim() || "");
  const copyNumberDigits = waDigits || normalizePhoneDigitsForWaMe(phoneNumberId || "");
  const showNumber = Boolean(formattedLine);
  const statusLine = formatWhatsappLineStatusForUi(lineStatus);

  return (
    <div className="space-y-5">
      {toastAnchor}
      <div className="rounded-2xl border border-[var(--df-brand-200)]/80 bg-[var(--df-brand-50)]/40 px-5 py-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--df-brand-800)]">Próximo passo</p>
        <p className="mt-2 text-base font-semibold text-[var(--df-text-primary)]">Ver a primeira mensagem na Inbox</p>
        {statusLine ? (
          <p className="mt-2 text-sm font-medium text-[var(--df-text-secondary)]" data-testid="line-status-dashboard">
            {statusLine}
          </p>
        ) : null}
        <ol className="mt-4 list-none space-y-3 text-sm leading-relaxed text-[var(--df-text-secondary)]">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--df-bg-elevated)] text-xs font-bold text-[var(--df-brand-700)] shadow-sm">
              1
            </span>
            <span>Toque em «Abrir WhatsApp» (ou copie o número) e envie a mensagem de teste.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--df-bg-elevated)] text-xs font-bold text-[var(--df-brand-700)] shadow-sm">
              2
            </span>
            <span>Volte à Inbox — a conversa surge na lista; esta página atualiza sozinha.</span>
          </li>
        </ol>
        {showNumber ? (
          <div className="mt-5 rounded-xl border df-border-brand bg-[var(--df-bg-elevated)] px-4 py-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--df-text-muted)]">Número para testar</p>
            <p className="mt-1 break-all font-mono text-lg font-semibold text-[var(--df-text-primary)]">{formattedLine}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {waHref ? (
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${buttonClassName("primary")} inline-flex no-underline`}
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
              <Link href="/inbox" className={`${buttonClassName("secondary")} inline-flex`}>
                Abrir Inbox
              </Link>
            </div>
            {waOpened ? (
              <p className="mt-3 text-xs leading-relaxed text-emerald-800">
                Envie a mensagem no WhatsApp e volte aqui — atualizamos automaticamente.
              </p>
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
