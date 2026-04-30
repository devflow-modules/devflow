"use client";

import { useState } from "react";
import { getGrowthSessionId } from "@/analytics/growth/trackClient";
import { cn } from "@/modules/financeiro/lib/cn";
import { Button } from "@/components/ui/button";
import { focusRingLight, mutedTextLight } from "@/modules/financeiro/lib/primitives";

type LeadCaptureFormProps = {
  source: string;
  title?: string;
  description?: string;
  buttonLabel?: string;
  variant?: "default" | "footer";
  className?: string;
};

export function LeadCaptureForm({
  source,
  title = "Receba novas ferramentas financeiras e melhorias",
  description,
  buttonLabel = "Quero receber",
  variant = "default",
  className,
}: LeadCaptureFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/financeiro/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          source,
          sessionId: typeof window !== "undefined" ? getGrowthSessionId() : undefined,
        }),
      });

      const payload = await res.json();

      if (payload.success) {
        setStatus("success");
        setEmail("");
        setMessage("Obrigado! Você receberá novidades em breve.");
      } else {
        setStatus("error");
        setMessage(payload.error?.message ?? "Erro ao cadastrar. Tente novamente.");
      }
    } catch {
      setStatus("error");
      setMessage("Erro ao cadastrar. Tente novamente.");
    }
  };

  const isCompact = variant === "footer";

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "rounded-xl border border-border bg-card p-4 sm:p-6",
        isCompact && "p-4",
        className
      )}
    >
      <h3 className={cn("font-semibold text-foreground", isCompact ? "text-base" : "text-lg")}>
        {title}
      </h3>
      {description && (
        <p className={cn("mt-1 text-sm", mutedTextLight)}>{description}</p>
      )}
      <div className={cn("mt-4 flex flex-col gap-2 sm:flex-row sm:items-end")}>
        <label className="flex-1 space-y-1">
          <span className="sr-only">E-mail</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            required
            disabled={status === "loading"}
            className={cn(
              "w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground",
              "placeholder:text-muted-foreground",
              "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
              focusRingLight
            )}
          />
        </label>
        <Button
          type="submit"
          variant="primary"
          disabled={status === "loading"}
          className={cn(
            "rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-60",
            focusRingLight
          )}
        >
          {status === "loading" ? "Enviando..." : buttonLabel}
        </Button>
      </div>
      {message && (
        <p
          className={cn(
            "mt-2 text-sm",
            status === "success" ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
          )}
        >
          {message}
        </p>
      )}
    </form>
  );
}
