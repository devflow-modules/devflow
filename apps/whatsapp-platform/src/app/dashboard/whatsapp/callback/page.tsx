"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fetchProtected, protectedApiUserMessage } from "@/lib/protected-fetch";

function WhatsappCallbackInner() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const paramsInvalid = !code || !state;

  const [status, setStatus] = useState<"loading" | "success" | "error">(() =>
    paramsInvalid ? "error" : "loading"
  );
  const [message, setMessage] = useState(() =>
    paramsInvalid ? "Parâmetros inválidos. Tente conectar novamente." : ""
  );

  useEffect(() => {
    if (paramsInvalid || !code || !state) return;

    fetchProtected("/api/whatsapp/onboard/callback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, state }),
    })
      .then(async (res) => {
        const json = (await res.json().catch(() => ({}))) as {
          success?: boolean;
          data?: { message?: string };
          error?: string;
        };
        if (res.ok && json.success) {
          setStatus("success");
          setMessage(json.data?.message ?? "Número conectado com sucesso!");
          window.location.href = "/dashboard/whatsapp?success=1";
        } else {
          setStatus("error");
          setMessage(protectedApiUserMessage(res.status, json));
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Erro de rede. Tente novamente.");
      });
  }, [code, state, paramsInvalid]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="rounded-lg border border-slate-200 p-8 max-w-md text-center">
        {status === "loading" && <p className="text-slate-600">Conectando número…</p>}
        {status === "success" && <p className="text-emerald-600 font-medium">{message}</p>}
        {status === "error" && (
          <div>
            <p className="text-red-600 font-medium">{message}</p>
            <a href="/dashboard/whatsapp" className="mt-4 inline-block text-blue-600 underline">
              Voltar ao WhatsApp
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default function WhatsappCallbackPage() {
  return (
    <Suspense fallback={<p className="p-6 text-center text-slate-600">Carregando…</p>}>
      <WhatsappCallbackInner />
    </Suspense>
  );
}
