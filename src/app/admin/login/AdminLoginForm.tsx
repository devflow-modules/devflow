"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { safePortalAdminPostLoginPath } from "@/lib/admin-post-login-path";

export function AdminLoginForm({ defaultNext }: { defaultNext?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const secret = fd.get("secret");
    if (typeof secret !== "string" || !secret.trim()) {
      setError("Informe o segredo.");
      return;
    }
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: secret.trim() }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Segredo inválido.");
      return;
    }
    const dest = safePortalAdminPostLoginPath(defaultNext);
    router.push(dest);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      <div>
        <label htmlFor="secret" className="sr-only">
          Segredo admin
        </label>
        <input
          id="secret"
          name="secret"
          type="password"
          autoComplete="off"
          placeholder="Segredo"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button variant="primary" type="submit" className="w-full">
        Entrar
      </Button>
    </form>
  );
}
