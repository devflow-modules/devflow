"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

const DEFAULT_MESSAGE = "Olá! Gostaria de automatizar o atendimento do meu negócio no WhatsApp.";

export function FloatingWhatsAppCta() {
  const href = getWhatsAppUrl(DEFAULT_MESSAGE);

  if (!href || href === "#") return null;

  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full px-4 py-3 shadow-lg",
        "bg-[#25D366] text-white font-semibold text-sm",
        "transition-all duration-200 hover:bg-[#20BD5A] hover:scale-105",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]/50 focus-visible:ring-offset-2"
      )}
      aria-label="Automatizar meu WhatsApp"
    >
      <MessageCircle className="size-5 shrink-0" />
      <span className="hidden sm:inline">Automatizar meu WhatsApp</span>
    </Link>
  );
}
