"use client";

import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";
import { useSupport } from "@/components/support/SupportProvider";
import {
  getWhatsappSupportHref,
  ONBOARDING_ERROR_COPY,
  type OnboardingErrorKind,
} from "./whatsappConnectUx";

type WhatsappConnectErrorPanelProps = {
  kind: OnboardingErrorKind;
  onDismiss?: () => void;
  onRetry?: () => void;
  retryLabel?: string;
};

export function WhatsappConnectErrorPanel({
  kind,
  onDismiss,
  onRetry,
  retryLabel = "Tentar novamente",
}: WhatsappConnectErrorPanelProps) {
  const { openSupport } = useSupport();
  const copy = ONBOARDING_ERROR_COPY[kind];
  const supportHref = getWhatsappSupportHref();

  return (
    <div
      className="rounded-2xl border border-rose-200/90 bg-rose-50/90 px-4 py-4 shadow-sm"
      role="alert"
    >
      <p className="text-sm font-semibold text-rose-950">{copy.title}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-rose-900/90">{copy.description}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {onRetry ? (
          <button type="button" onClick={onRetry} className={buttonClassName("primary")}>
            {retryLabel}
          </button>
        ) : null}
        <Link
          href={supportHref}
          className={buttonClassName("secondary")}
          target={supportHref.startsWith("mailto:") ? undefined : "_blank"}
          rel={supportHref.startsWith("mailto:") ? undefined : "noopener noreferrer"}
        >
          Falar com suporte
        </Link>
        {onDismiss ? (
          <button type="button" onClick={onDismiss} className={buttonClassName("ghost")}>
            Fechar
          </button>
        ) : null}
      </div>

      <div className="mt-5 rounded-xl border border-rose-100 bg-white/80 px-4 py-3">
        <p className="text-sm font-medium text-slate-800">Precisa de ajuda para conectar?</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">
          Nós podemos te ajudar a configurar seu WhatsApp passo a passo.
        </p>
        <button
          type="button"
          onClick={() => openSupport()}
          className={`${buttonClassName("secondary")} mt-3 w-full sm:w-auto`}
        >
          Quero ajuda para conectar
        </button>
      </div>
    </div>
  );
}
