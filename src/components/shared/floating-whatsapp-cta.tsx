"use client";

import { MessageCircle } from "lucide-react";
import { getWhatsAppOrMailtoUrl, isWhatsAppNumberConfigured } from "@/lib/whatsapp";
import { trackCtaWhatsAppClick } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const DEFAULT_MESSAGE = "Quero ver como organizar meu WhatsApp com a DevFlow.";

export function FloatingWhatsAppCta() {
  const href = getWhatsAppOrMailtoUrl(DEFAULT_MESSAGE);
  const usesMailto = !isWhatsAppNumberConfigured();

  const handleClick = () => {
    trackCtaWhatsAppClick(usesMailto ? "floating_mailto_fallback" : "floating");
  };

  return (
    <a
      href={href}
      target={usesMailto ? undefined : "_blank"}
      rel={usesMailto ? undefined : "noopener noreferrer"}
      onClick={handleClick}
      className={cn(
        "fixed z-40 flex size-11 items-center justify-center rounded-full",
        "bottom-[max(1rem,env(safe-area-inset-bottom,0px))] right-[max(1rem,env(safe-area-inset-right,0px))]",
        "bg-[var(--df-v2-whatsapp,#25D366)] text-white",
        "shadow-[0_8px_24px_rgba(15,23,42,0.16)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--df-v2-brand)] focus-visible:ring-offset-2"
      )}
      aria-label={usesMailto ? "Enviar email para contato" : "Quero ver como organizar meu WhatsApp"}
    >
      <MessageCircle className="size-5 shrink-0" aria-hidden />
      <span className="sr-only">{usesMailto ? "Falar por email" : "WhatsApp"}</span>
    </a>
  );
}
