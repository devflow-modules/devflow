"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function WhatsappCallbackPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code || !state) {
      setStatus("error");
      setMessage("Parâmetros inválidos. Tente conectar novamente.");
      return;
    }

    fetch("/api/whatsapp/onboard/callback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ code, state }),
    })
      .then(async (res) => {
        const json = await res.json();
        if (res.ok && json.success) {
          setStatus("success");
          setMessage(json.data?.message ?? "Número conectado com sucesso!");
          window.location.href = "/dashboard/whatsapp?success=1";
        } else {
          setStatus("error");
          setMessage(json.error ?? "Falha ao conectar número.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Erro de rede. Tente novamente.");
      });
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="rounded-lg border border-slate-200 p-8 max-w-md text-center">
        {status === "loading" && (
          <p className="text-slate-600">Conectando número…</p>
        )}
        {status === "success" && (
          <p className="text-emerald-600 font-medium">{message}</p>
        )}
        {status === "error" && (
          <div>
            <p className="text-red-600 font-medium">{message}</p>
            <a
              href="/dashboard/whatsapp"
              className="mt-4 inline-block text-blue-600 underline"
            >
              Voltar ao WhatsApp
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
