import { Suspense } from "react";
import { AuthFormClient } from "./AuthFormClient";

function AuthFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-muted/70 p-8 shadow-xl">
        <p className="text-sm df-text-muted">Carregando...</p>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<AuthFallback />}>
      <AuthFormClient />
    </Suspense>
  );
}
