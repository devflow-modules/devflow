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
}

const sizeClasses = {
  sm: "h-8 gap-2 rounded-xl px-3 text-sm",
  default: "h-10 gap-2 rounded-2xl px-4 text-sm",
  lg: "h-14 gap-2 rounded-xl px-6 text-lg font-semibold",
} as const;

export function WhatsAppCta({
  text,
  label = "Fale conosco",
  ariaLabel,
  className,
  size = "default",
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
        "inline-flex items-center justify-center font-medium border border-transparent",
        "bg-[#25D366] text-white transition-all duration-200 hover:bg-[#20BD5A]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]/50 focus-visible:ring-offset-2",
        sizeClasses[size],
        className
      )}
    >
      <MessageCircle className="size-[1.125em] shrink-0" aria-hidden="true" />
      {label}
    </a>
  );
}
