"use client";

import { StateError } from "@/components/ui/app-states";

type Props = {
  title?: string;
  message: string;
  onRetry: () => void;
  testId?: string;
  className?: string;
};

/** Erro localizado a um bloco — retry não recarrega a página inteira. */
export function DashboardAiSurfaceError({
  title = "Não foi possível carregar este bloco",
  message,
  onRetry,
  testId,
  className = "",
}: Props) {
  return (
    <div data-testid={testId} className={className}>
      <StateError
        title={title}
        message={message}
        onRetry={onRetry}
        retryLabel="Tentar novamente"
        className="border df-border-brand bg-[color-mix(in_srgb,var(--df-bg-app)_55%,var(--df-bg-elevated))] py-6 text-left"
      />
    </div>
  );
}
