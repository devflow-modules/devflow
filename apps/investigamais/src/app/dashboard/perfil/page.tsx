"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PerfilPage() {
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ nome: "", telefone: "", nascimento: "", cidade: "", uf: "", genero: "" });

  useEffect(() => {
    fetch("/api/perfil", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setProfile(data);
        if (data.nome) setForm((f) => ({ ...f, nome: String(data.nome ?? "") }));
        if (data.telefone) setForm((f) => ({ ...f, telefone: String(data.telefone ?? "") }));
        if (data.nascimento) setForm((f) => ({ ...f, nascimento: String(data.nascimento ?? "").slice(0, 10) }));
        if (data.cidade) setForm((f) => ({ ...f, cidade: String(data.cidade ?? "") }));
        if (data.uf) setForm((f) => ({ ...f, uf: String(data.uf ?? "") }));
        if (data.genero) setForm((f) => ({ ...f, genero: String(data.genero ?? "") }));
      })
      .catch(() => setProfile({ error: "Erro ao carregar" }))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/perfil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Erro ao salvar");
        return;
      }
      setProfile(data);
      setMessage(data.bonusConcedido ? "Perfil atualizado! Bônus concedido." : "Perfil atualizado.");
    } catch {
      setMessage("Erro de conexão");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6">Carregando…</div>;
  if (profile && "error" in profile) return <div className="p-6 text-red-600">{String(profile.error)}</div>;

  const completion = Number(profile?.completionPercentage ?? 0);

  return (
    <div className="p-6">
      <Link href="/dashboard" className="text-blue-600 underline">Voltar</Link>
      <h1 className="mt-4 text-2xl font-semibold">Perfil</h1>
      <p className="mt-1 text-sm df-text-secondary">Completude: {completion}%</p>
      {completion === 100 && profile?.bonus_concedido_at ? (
        <p className="mt-1 text-sm text-green-600">Bônus já concedido.</p>
      ) : null}
      <form onSubmit={handleSubmit} className="mt-4 max-w-md space-y-2">
        <input type="text" placeholder="Nome" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} className="w-full rounded border px-3 py-2" />
        <input type="text" placeholder="Telefone" value={form.telefone} onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))} className="w-full rounded border px-3 py-2" />
        <input type="date" placeholder="Nascimento" value={form.nascimento} onChange={(e) => setForm((f) => ({ ...f, nascimento: e.target.value }))} className="w-full rounded border px-3 py-2" />
        <input type="text" placeholder="Cidade" value={form.cidade} onChange={(e) => setForm((f) => ({ ...f, cidade: e.target.value }))} className="w-full rounded border px-3 py-2" />
        <input type="text" placeholder="UF" value={form.uf} maxLength={2} onChange={(e) => setForm((f) => ({ ...f, uf: e.target.value.toUpperCase() }))} className="w-full rounded border px-3 py-2" />
        <input type="text" placeholder="Gênero" value={form.genero} onChange={(e) => setForm((f) => ({ ...f, genero: e.target.value }))} className="w-full rounded border px-3 py-2" />
        {message && <p className="text-sm text-green-600">{message}</p>}
        <Button variant="primary" type="submit" disabled={saving} className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50">Salvar</Button>
      </form>
    </div>
  );
}
