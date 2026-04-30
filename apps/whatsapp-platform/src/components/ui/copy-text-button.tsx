"use client";

import { useState, useCallback } from "react";
import { buttonClassName } from "@/components/ui/button";
import { Button } from "@/components/ui/button";

type Props = {
  text: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
  onCopied?: () => void;
};

export function CopyTextButton({
  text,
  label = "Copiar número",
  copiedLabel = "Copiado",
  className = "",
  onCopied,
}: Props) {
  const [copied, setCopied] = useState(false);

  const onClick = useCallback(async () => {
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text.trim());
      setCopied(true);
      onCopied?.();
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [text, onCopied]);

  return (
    <Button variant="secondary"
      type="button"
      onClick={() => void onClick()}
      className={`${buttonClassName("secondary")} ${className}`.trim()}
    >
      {copied ? copiedLabel : label}
    </Button>
  );
}
