import type { Metadata } from "next";
import { AdminLoginForm } from "./AdminLoginForm";

export const metadata: Metadata = {
  title: "Admin login | DevFlow",
  robots: "noindex, nofollow",
};

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function AdminLoginPage({ searchParams }: Props) {
  const { next } = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-foreground">Acesso admin — portal</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Informe o segredo de admin (métricas/Ops) para aceder às ferramentas internas neste domínio.
        </p>
        <AdminLoginForm defaultNext={next} />
      </div>
    </div>
  );
}
