"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PasswordField } from "@/components/auth/PasswordField";
import { mapAuthHttpError } from "@/lib/auth-client-errors";
import { Button } from "@/components/ui/button";

export function ActivateMemberForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token")?.trim() ?? "";
  const hasUrlToken = tokenFromUrl.length > 0;

  const [token, setToken] = useState(tokenFromUrl);
  const [showManualToken, setShowManualToken] = useState(!hasUrlToken);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const submitLock = useRef(false);

  useEffect(() => {
    if (tokenFromUrl) setToken(tokenFromUrl);
  }, [tokenFromUrl]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitLock.current || loading) return;
    setError(null);

    if (password.length < 8) {
      setError("A senha deve ter no mínimo 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    const t = token.trim();
    if (!t) {
      setError("Falta o token de activação. Use o link do convite ou cole o token abaixo.");
      setShowManualToken(true);
      return;
    }

    submitLock.current = true;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: t, newPassword: password }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
      };

      if (!res.ok) {
        setError(mapAuthHttpError(res.status, data));
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
      submitLock.current = false;
    }
  };

  if (success) {
    return (
      <div role="status" className="df-feedback-success !rounded-lg p-4 text-center">
        <p className="font-medium">Conta activada com sucesso.</p>
        <p className="mt-1 opacity-95">A redirecionar para o login…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" aria-busy={loading} noValidate>
      {hasUrlToken && !showManualToken ? (
        <p className="rounded-md border border-border bg-muted/60 px-3 py-2 text-sm df-text-secondary">
          Convite reconhecido. Defina a sua senha para activar a conta na equipe.
        </p>
      ) : null}

      {hasUrlToken && !showManualToken ? (
        <Button
          variant="secondary"
          type="button"
          className="text-sm font-medium"
          onClick={() => setShowManualToken(true)}
        >
          O link não funcionou? Colar token manualmente
        </Button>
      ) : null}

      {showManualToken ? (
        <div>
          <label htmlFor="activate-token" className="mb-1 block text-sm font-medium df-text-secondary">
            Token do convite
          </label>
          <input
            id="activate-token"
            name="token"
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Cole o token completo"
            autoComplete="off"
            disabled={loading}
            className="w-full rounded-md border df-border-dark bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--df-brand-500)] disabled:opacity-60"
          />
        </div>
      ) : null}

      {error && (
        <div role="alert" className="df-feedback-error !rounded-md">
          {error}
        </div>
      )}

      <PasswordField
        id="activate-password-new"
        label="Senha"
        name="newPassword"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        required
        minLength={8}
        disabled={loading}
      />
      <PasswordField
        id="activate-password-confirm"
        label="Confirmar senha"
        name="confirmPassword"
        value={confirmPassword}
        onChange={setConfirmPassword}
        autoComplete="new-password"
        required
        minLength={8}
        disabled={loading}
      />

      <Button
        variant="primary"
        type="submit"
        disabled={loading}
        className="w-full rounded-md px-4 py-2.5 text-sm font-semibold shadow-sm disabled:opacity-50"
      >
        {loading ? "A activar…" : "Activar conta"}
      </Button>
      <p className="text-center text-sm df-text-secondary">
        <Link href="/login" className="df-text-info font-medium hover:opacity-90">
          Já tem conta? Iniciar sessão
        </Link>
      </p>
    </form>
  );
}
