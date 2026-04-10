import type { Metadata } from "next";
import { cookies } from "next/headers";
import { JWT_COOKIE_NAME } from "@/lib/auth-config";
import { shellHomeHref } from "@/lib/roles";
import { validateAuthToken } from "@/modules/auth";
import { HeroSection } from "@/components/home/HeroSection";
import { FeatureCards } from "@/components/home/FeatureCards";
import { RoleSection } from "@/components/home/RoleSection";

export const metadata: Metadata = {
  title: "WhatsApp Platform — DevFlow Labs",
  description: "Atendimento, operação e vendas no WhatsApp com IA.",
  robots: { index: true, follow: true },
};

function marketingSiteUrl(): string | null {
  const u = process.env.NEXT_PUBLIC_DEVFLOW_WEBSITE_URL?.trim();
  return u || null;
}

export default async function HomePage() {
  const store = await cookies();
  const token = store.get(JWT_COOKIE_NAME)?.value;
  const auth = token ? await validateAuthToken(token) : null;
  const isAuthenticated = Boolean(auth);
  const panelHref = auth ? shellHomeHref(auth.payload.role) : "/dashboard";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50/95 via-white to-white">
      <main className="mx-auto max-w-4xl px-6 py-16 sm:py-20 md:py-24">
        <HeroSection
          isAuthenticated={isAuthenticated}
          panelHref={panelHref}
          marketingSiteUrl={marketingSiteUrl()}
        />
        <FeatureCards />
        <RoleSection />
      </main>
    </div>
  );
}
