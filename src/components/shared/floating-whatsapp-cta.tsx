"use client";

import { MessageCircle } from "lucide-react";
import { getWhatsAppOrMailtoUrl, isWhatsAppNumberConfigured } from "@/lib/whatsapp";
import { trackCtaWhatsAppClick } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const DEFAULT_MESSAGE = "Olá! Gostaria de automatizar o atendimento do meu negócio no WhatsApp.";

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
        "fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full px-4 py-3 shadow-lg",
        "bg-[#25D366] text-white font-semibold text-sm",
        "transition-all duration-200 hover:bg-[#20BD5A] hover:scale-105",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]/50 focus-visible:ring-offset-2"
      )}
      aria-label={usesMailto ? "Enviar email para contato" : "Quero automatizar meu atendimento"}
    >
      <MessageCircle className="size-5 shrink-0" />
      <span className="hidden sm:inline">
        {usesMailto ? "Falar por email" : "Quero automatizar"}
      </span>
    </a>
  );
}
