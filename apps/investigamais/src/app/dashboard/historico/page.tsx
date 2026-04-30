"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Row {
  id: string;
  cnpj: string;
  nome: string | null;
  status: string;
  criado_em: string;
  criadoFormatado: string;
}

export default function HistoricoPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/consulta?page=${page}&limit=5`, { credentials: "include" });
        const data = await res.json();
        if (!cancelled) {
          setRows(data.rows ?? []);
          setTotal(data.total ?? 0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [page]);

  return (
    <div className="p-6">
      <Link href="/dashboard" className="text-blue-600 underline">Voltar</Link>
      <h1 className="mt-4 text-2xl font-semibold">Histórico de consultas</h1>
      {loading ? (
        <p className="mt-4 df-text-secondary">Carregando…</p>
      ) : (
        <>
          <table className="mt-4 w-full border-collapse border text-sm">
            <thead>
              <tr className="bg-muted">
                <th className="border p-2 text-left">CNPJ</th>
                <th className="border p-2 text-left">Nome</th>
                <th className="border p-2 text-left">Status</th>
                <th className="border p-2 text-left">Data</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="border p-2">{r.cnpj}</td>
                  <td className="border p-2">{r.nome ?? "—"}</td>
                  <td className="border p-2">{r.status}</td>
                  <td className="border p-2">{r.criadoFormatado}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {total === 0 && <p className="mt-4 df-text-secondary">Nenhuma consulta ainda.</p>}
          {total > 0 && (
            <div className="mt-4 flex gap-2">
              <Button variant="disabled"
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded border px-3 py-1 disabled:opacity-50"
              >
                Anterior
              </Button>
              <span className="py-1">Página {page}</span>
              <Button variant="disabled"
                type="button"
                disabled={page * 5 >= total}
                onClick={() => setPage((p) => p + 1)}
                className="rounded border px-3 py-1 disabled:opacity-50"
              >
                Próxima
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
