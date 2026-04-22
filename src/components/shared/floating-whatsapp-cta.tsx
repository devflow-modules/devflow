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
        "fixed z-40 flex items-center gap-2 rounded-full px-4 py-3 shadow-lg",
        "bottom-[max(1rem,env(safe-area-inset-bottom,0px))] right-[max(1rem,env(safe-area-inset-right,0px))]",
        "bg-[#25D366] text-white font-semibold text-sm",
        "transition-all duration-200 hover:bg-[#20BD5A] hover:scale-105",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]/50 focus-visible:ring-offset-2"
      )}
      aria-label={usesMailto ? "Enviar email para contato" : "Quero ver como organizar meu WhatsApp"}
    >
      <MessageCircle className="size-5 shrink-0" aria-hidden />
      <span className="hidden sm:inline">
        {usesMailto ? "Falar por email" : "Organizar WhatsApp"}
      </span>
    </a>
  );
}
