"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ADMIN, NAV_OPERATION, NAV_PRIMARY, NAV_SECONDARY } from "./nav-config";

function NavLink({
  href,
  label,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={() => onNavigate?.()}
      className={`block rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-[var(--df-brand-50)]/90 text-[var(--df-brand-800)]"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      {label}
    </Link>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 mt-6 px-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400/90 first:mt-0">
      {children}
    </p>
  );
}

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname() ?? "";

  function navIsActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/dashboard/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/login";
  }

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-slate-100/90 bg-white">
      <div className="border-b border-slate-100/90 px-4 py-6">
        <Link href="/dashboard" className="block" onClick={() => onNavigate?.()}>
          <span className="text-sm font-semibold tracking-tight text-slate-950">WhatsApp Platform</span>
          <span className="mt-1 block text-xs text-slate-500">DevFlow Labs</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4">
        <SectionTitle>Principal</SectionTitle>
        <div className="space-y-0.5">
          {NAV_PRIMARY.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              active={navIsActive(item.href)}
              onNavigate={onNavigate}
            />
          ))}
        </div>

        <SectionTitle>Conta</SectionTitle>
        <div className="space-y-0.5">
          {NAV_SECONDARY.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              active={navIsActive(item.href)}
              onNavigate={onNavigate}
            />
          ))}
        </div>

        <SectionTitle>Operação</SectionTitle>
        <div className="space-y-0.5">
          {NAV_OPERATION.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              active={navIsActive(item.href)}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </nav>

      <div className="border-t border-slate-100 p-3">
        <Link
          href={NAV_ADMIN.href}
          className="mb-2 block rounded-lg px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50"
          onClick={() => onNavigate?.()}
        >
          {NAV_ADMIN.label}
        </Link>
        <Link
          href="/login"
          className="mb-2 block rounded-lg px-3 py-2 text-xs text-slate-500 hover:bg-slate-50"
          onClick={() => onNavigate?.()}
        >
          Entrar (outra conta)
        </Link>
        <button
          type="button"
          onClick={() => void logout()}
          className="w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50"
        >
          Terminar sessão
        </button>
      </div>
    </aside>
  );
}
