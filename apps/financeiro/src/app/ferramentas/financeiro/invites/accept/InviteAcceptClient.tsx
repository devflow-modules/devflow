"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

export function InviteAcceptClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token"), [searchParams]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!token) {
        setStatus("error");
        setError("Token ausente.");
        return;
      }

      setStatus("loading");
      setError(null);

      const res = await fetch("/api/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const payload = await res.json();

      if (!payload.success) {
        setStatus("error");
        setError(
          payload.error?.message ?? "Não foi possível aceitar o convite."
        );
        return;
      }

      toast.success("Convite aceito");
      router.replace("/ferramentas/financeiro/dashboard");
      router.refresh();
    };

    run();
  }, [router, token]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-border bg-card p-8 shadow-lg">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
            Convite
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-foreground">
            Aceitar convite
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {status === "loading"
              ? "Processando..."
              : "Confirmando seu acesso à casa."}
          </p>
        </div>
        {status === "error" && error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}
      </div>
    </div>
  );
}
