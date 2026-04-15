import type { Metadata } from "next";
import { AdminLoginForm } from "./AdminLoginForm";

export const metadata: Metadata = {
  title: "Admin login | WhatsApp Platform",
  robots: "noindex, nofollow",
};

export default function AdminLoginPage() {
  return (
    <div className="flex h-full min-h-0 items-center justify-center overflow-y-auto bg-background px-4 py-8">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-foreground">Acesso admin — métricas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Informe o segredo de admin para acessar o dashboard de métricas.
        </p>
        <AdminLoginForm />
      </div>
    </div>
  );
}
