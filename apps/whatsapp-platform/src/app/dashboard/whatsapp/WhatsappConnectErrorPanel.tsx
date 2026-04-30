"use client";

import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";
import { useSupport } from "@/components/support/SupportProvider";
import { Button } from "@/components/ui/button";
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
    <div className="df-feedback-error rounded-2xl shadow-sm" role="alert">
      <p className="text-sm font-semibold">{copy.title}</p>
      <p className="mt-1.5 text-sm leading-relaxed opacity-95">{copy.description}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {onRetry ? (
          <Button variant="secondary" type="button" onClick={onRetry} className={buttonClassName("primary")}>
            {retryLabel}
          </Button>
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
          <Button variant="secondary" type="button" onClick={onDismiss} className={buttonClassName("ghost")}>
            Fechar
          </Button>
        ) : null}
      </div>

      <div className="mt-5 rounded-xl border border-border/80 bg-[color-mix(in_srgb,var(--df-bg-elevated)_92%,black)] px-4 py-3">
        <p className="text-sm font-medium text-[var(--df-text-primary)]">Precisa de ajuda para conectar?</p>
        <p className="mt-1 text-xs leading-relaxed text-[var(--df-text-secondary)]">
          Nós podemos te ajudar a configurar seu WhatsApp passo a passo.
        </p>
        <Button
          variant="secondary"
          type="button"
          onClick={() => openSupport()}
          className={`${buttonClassName("secondary")} mt-3 w-full sm:w-auto`}
        >
          Quero ajuda para conectar
        </Button>
      </div>
    </div>
  );
}
