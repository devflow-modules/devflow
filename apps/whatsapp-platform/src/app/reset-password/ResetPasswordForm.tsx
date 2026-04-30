"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PasswordField } from "@/components/auth/PasswordField";
import { mapAuthHttpError } from "@/lib/auth-client-errors";
import { Button } from "@/components/ui/button";

export function ResetPasswordForm() {
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
      setError("Falta o token de redefinição. Use o link do e-mail ou cole o token abaixo.");
      setShowManualToken(true);
      return;
    }

    submitLock.current = true;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
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
      <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center text-sm text-emerald-900">
        <p className="font-medium">Senha alterada com sucesso.</p>
        <p className="mt-1 text-emerald-800">A redirecionar para o login…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" aria-busy={loading} noValidate>
      {hasUrlToken && !showManualToken ? (
        <p className="rounded-md border border-border bg-muted/60 px-3 py-2 text-sm df-text-secondary">
          Link do e-mail reconhecido. Defina a nova senha abaixo. Sessões anteriores serão encerradas após a alteração.
        </p>
      ) : null}

      {hasUrlToken && !showManualToken ? (
        <Button variant="secondary"
          type="button"
          className="text-sm font-medium text-blue-600 hover:text-blue-800"
          onClick={() => setShowManualToken(true)}
        >
          O link não funcionou? Colar token manualmente
        </Button>
      ) : null}

      {showManualToken ? (
        <div>
          <label htmlFor="reset-token" className="mb-1 block text-sm font-medium df-text-secondary">
            Token do e-mail
          </label>
          <input
            id="reset-token"
            name="token"
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Cole o token completo"
            autoComplete="off"
            disabled={loading}
            className="w-full rounded-md border df-border-dark bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-60"
          />
        </div>
      ) : null}

      {error && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      <PasswordField
        id="reset-password-new"
        label="Nova senha"
        name="newPassword"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        required
        minLength={8}
        disabled={loading}
      />
      <PasswordField
        id="reset-password-confirm"
        label="Confirmar nova senha"
        name="confirmPassword"
        value={confirmPassword}
        onChange={setConfirmPassword}
        autoComplete="new-password"
        required
        minLength={8}
        disabled={loading}
      />

      <Button variant="primary"
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "A guardar…" : "Redefinir senha"}
      </Button>
      <p className="text-center text-sm df-text-secondary">
        <Link href="/login" className="font-medium text-blue-600 hover:text-blue-800">
          Voltar ao login
        </Link>
      </p>
    </form>
  );
}
