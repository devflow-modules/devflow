"use client";

import { MessageCircle } from "lucide-react";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import { trackCtaWhatsAppClick } from "@/lib/analytics";
import { cn } from "@/lib/utils";

interface WhatsAppCtaProps {
  text?: string;
  label?: string;
  className?: string;
  size?: "sm" | "default" | "lg";
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
  className,
  size = "default",
  variant = "primary",
}: WhatsAppCtaProps) {
  const href = getWhatsAppUrl(text);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    trackCtaWhatsAppClick(label);
    setTimeout(() => window.open(href, "_blank", "noopener,noreferrer"), 150);
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={cn(
        variant === "secondary" ? "df-btn-secondary font-medium" : "df-btn-primary border-transparent font-medium",
        "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        sizeClasses[size],
        className
      )}
    >
      <MessageCircle className="size-[1.125em] shrink-0" aria-hidden />
      {label}
    </a>
  );
}
