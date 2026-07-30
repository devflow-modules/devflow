"use client";

import { Button } from "@/components/ui/button";

/**
 * Submit do formulário `#wf-ai-settings` no PageHeader.
 * Client Component: `Button` (com trackedOnClick) não pode ser montado
 * directamente num Server Component sob Turbopack/RSC.
 */
export function AiSettingsSaveHeaderButton() {
  return (
    <Button
      variant="primary"
      type="submit"
      form="wf-ai-settings"
      className="df-btn-primary inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-semibold"
    >
      Salvar alterações
    </Button>
  );
}
