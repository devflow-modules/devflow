"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { householdCreateSchema } from "@/modules/financeiro/schemas";
import { cn } from "@/modules/financeiro/lib/cn";
import {
  btnPrimaryBase,
  btnPrimaryLight,
  cardStaticLight,
  focusRingLight,
  h1,
  mutedTextLight,
} from "@/modules/financeiro/lib/primitives";

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [apresentacao, setApresentacao] = useState(false);

  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      setApresentacao(q.get("apresentacao") === "1" || q.get("demo") === "1");
    } catch {
      setApresentacao(false);
    }
  }, []);

  const toSlug = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const parsed = householdCreateSchema.parse({
        name: name.trim(),
        slug: toSlug(slug),
        timezone: "America/Sao_Paulo",
      });

      const response = await fetch("/api/households", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });

      const payload = await response.json();

      if (!payload.success) {
        throw new Error(payload.error?.message ?? "Erro ao criar casa");
      }

      router.replace("/ferramentas/financeiro/dashboard");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className={cn(cardStaticLight, "w-full max-w-md space-y-8 p-8")}>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {apresentacao ? "Passo 1 · Casa" : "Onboarding"}
          </p>
          <h1
            className={cn(
              h1,
              "mt-2 text-3xl text-foreground md:text-4xl"
            )}
          >
            {apresentacao ? "Nome da sua casa financeira" : "Crie sua primeira casa"}
          </h1>
          <p className={cn("mt-2 text-sm", mutedTextLight)}>
            {apresentacao
              ? "Na reunião: escolha qualquer nome (ex.: “Casa Silva” ou “Demo Marques”). O slug acompanha o nome automaticamente — em segundos você vê o dashboard com clareza de caixa."
              : "Dê um nome e um identificador único (slug) para a sua casa. Depois você pode convidar outras pessoas."}
          </p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-semibold text-foreground">
            Nome da casa
            <input
              type="text"
              required
              minLength={3}
              value={name}
              onChange={(e) => {
                const newName = e.target.value;
                setName(newName);
                setSlug(toSlug(newName));
              }}
              placeholder="Ex: Casa Marques"
              className={cn(
                "mt-2 w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground",
                focusRingLight
              )}
            />
          </label>
          <label className="block text-sm font-semibold text-foreground">
            {apresentacao ? "Identificador (gerado do nome — pode ajustar)" : "Slug (identificador único, só letras minúsculas, números e hífen)"}
            <input
              type="text"
              required
              minLength={3}
              value={slug}
              onChange={(e) => setSlug(toSlug(e.target.value))}
              placeholder="Ex: casa-marques"
              className={cn(
                "mt-2 w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground",
                focusRingLight
              )}
            />
          </label>
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}
          <button
            type="submit"
            disabled={loading || name.length < 3 || slug.length < 3}
            className={cn(
              btnPrimaryBase,
              btnPrimaryLight,
              focusRingLight,
              "w-full disabled:cursor-not-allowed"
            )}
          >
            {loading ? "Criando..." : apresentacao ? "Ir ao dashboard" : "Criar casa"}
          </button>
        </form>
      </div>
    </div>
  );
}
