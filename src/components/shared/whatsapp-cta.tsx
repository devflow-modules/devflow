"use client";

import { MessageCircle } from "lucide-react";
import { getWhatsAppOrMailtoUrl, isWhatsAppNumberConfigured } from "@/lib/whatsapp";
import { trackCtaWhatsAppClick } from "@/lib/analytics";
import { cn } from "@/lib/utils";

interface WhatsAppCtaProps {
  text?: string;
  label?: string;
  /** Nome acessível explícito (evita ambiguidade com o ícone). */
  ariaLabel?: string;
  className?: string;
  size?: "sm" | "default" | "lg";
  /** `secondary` quando o bloco já tem um CTA primário (ex.: diagnóstico + WhatsApp). */
  variant?: "primary" | "secondary";
}

const sizeClasses = {
  sm: "min-h-10 rounded-xl px-3 text-sm",
  default: "min-h-10 rounded-2xl px-4 text-sm",
  lg: "min-h-12 rounded-xl px-6 text-base font-semibold",
} as const;

export function WhatsAppCta({
  text,
  label = "Fale conosco",
  ariaLabel,
  className,
  size = "default",
  variant = "primary",
}: WhatsAppCtaProps) {
  const href = getWhatsAppOrMailtoUrl(text);
  const usesMailto = !isWhatsAppNumberConfigured();

  const handleClick = () => {
    trackCtaWhatsAppClick(usesMailto ? `${label}_mailto_fallback` : label);
  };

  const computedAriaLabel =
    ariaLabel ??
    (usesMailto ? `${label}: abrir cliente de e-mail` : `${label}: abrir conversa no WhatsApp`);

  return (
    <a
      href={href}
      target={usesMailto ? undefined : "_blank"}
      rel={usesMailto ? undefined : "noopener noreferrer"}
      onClick={handleClick}
      aria-label={computedAriaLabel}
      className={cn(
        variant === "secondary" ? "df-btn-secondary font-medium" : "df-btn-primary border-transparent font-medium",
        "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        sizeClasses[size],
        className
      )}
    >
      <MessageCircle className="size-[1.125em] shrink-0" aria-hidden="true" />
      {label}
    </a>
  );
}
