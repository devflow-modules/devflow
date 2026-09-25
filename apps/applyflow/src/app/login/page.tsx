import { Suspense } from "react";

import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-6xl items-center justify-center px-4 py-12 text-[color:var(--af-text)]">
      <Suspense
        fallback={
          <p className="text-sm text-[color:var(--af-text-muted)]">Loading auth…</p>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}
