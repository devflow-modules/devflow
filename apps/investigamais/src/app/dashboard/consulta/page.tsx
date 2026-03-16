"use client";

import { useState } from "react";
import Link from "next/link";

export default function ConsultaPage() {
  const [cnpj, setCnpj] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);
    const digits = cnpj.replace(/\D/g, "");
    if (digits.length !== 14) {
      setError("CNPJ deve ter 14 dígitos");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/consulta/${encodeURIComponent(digits)}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro na consulta");
        return;
      }
      setResult(data);
    } catch {
      setError("Erro de conexão");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6">
      <Link href="/dashboard" className="text-blue-600 underline">Voltar</Link>
      <h1 className="mt-4 text-2xl font-semibold">Consultar CNPJ</h1>
      <form onSubmit={handleSubmit} className="mt-4 max-w-md">
        <input type="text" placeholder="00.000.000/0001-00" value={cnpj} onChange={(e) => setCnpj(e.target.value)} className="w-full rounded border px-3 py-2" />
        <button type="submit" disabled={loading} className="mt-2 rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50">
          {loading ? "Consultando…" : "Consultar"}
        </button>
      </form>
      {error && <p className="mt-2 text-red-600">{error}</p>}
      {result && "empresa" in result && result.empresa != null && (
        <pre className="mt-4 overflow-auto rounded border bg-gray-50 p-4 text-sm">{JSON.stringify(result.empresa as object, null, 2)}</pre>
      )}
    </div>
  );
}
