"use client";

import { Button } from "@/components/ui/button";

type AiTestReplyButtonProps = {
  loading: boolean;
  onClick: () => void;
};

/**
 * CTA de simulação em `/settings/ai` — sempre variante primary;
 * disabled só durante o loading da simulação (settings-ai F0).
 */
export function AiTestReplyButton({ loading, onClick }: AiTestReplyButtonProps) {
  return (
    <Button variant="primary" type="button" disabled={loading} onClick={onClick}>
      {loading ? "A gerar…" : "Testar resposta"}
    </Button>
  );
}
