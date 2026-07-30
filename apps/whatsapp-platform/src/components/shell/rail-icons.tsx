import type { ReactNode } from "react";

/**
 * Stable keys for SidebarRail icons (SB-10).
 * Admin `/admin/*` routes each map to a distinct key; unknown admin keeps a
 * non-generic fallback so nothing falls through to the link placeholder.
 */
export function railIconKey(href: string): string {
  if (href === "/distribuir") return "distribuir";
  if (href.startsWith("/dashboard/whatsapp")) return "dashboard-whatsapp";
  if (href === "/dashboard") return "dashboard";
  if (href.startsWith("/inbox")) return "inbox";
  if (href.startsWith("/conversations")) return "conversations";
  if (href.startsWith("/automation")) return "automation";
  if (href.startsWith("/billing")) return "billing";
  if (href.startsWith("/settings")) return "settings";
  if (href.startsWith("/dashboard/ai")) return "dashboard-ai";
  if (href.startsWith("/agents")) return "agents";
  if (href.startsWith("/queues")) return "queues";

  // Platform admin — exact matches first (distinct icons).
  if (href === "/admin/metrics") return "admin-metrics";
  if (href === "/admin/billing") return "admin-billing";
  if (href === "/admin/affiliates") return "admin-affiliates";
  if (href === "/admin/tenants") return "admin-tenants";
  if (href === "/admin/agents") return "admin-agents";
  if (href === "/admin/conversations") return "admin-conversations";
  if (href === "/admin/whatsapp") return "admin-whatsapp";
  if (href.startsWith("/admin")) return "admin-fallback";

  return "generic";
}

function Svg({
  iconKey,
  children,
}: {
  iconKey: string;
  children: ReactNode;
}) {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden
      data-rail-icon={iconKey}
    >
      {children}
    </svg>
  );
}

/** Inline paths already used in the shell rail (Heroicons-style). */
const PATHS = {
  clockDistribuir: (
    <>
      <circle cx="12" cy="12" r="9" strokeWidth={1.75} />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v4l2 2" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 12h4m0 0l-2-2m2 2l-2 2" />
    </>
  ),
  phone: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
    />
  ),
  home: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
    />
  ),
  inboxChat: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
    />
  ),
  conversations: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
    />
  ),
  lightning: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M13 10V3L4 14h7v7l9-11h-7z"
    />
  ),
  card: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
    />
  ),
  cog: (
    <>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </>
  ),
  chart: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
    />
  ),
  users: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
    />
  ),
  list: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 6h16M4 10h16M4 14h10M4 18h10" />
  ),
  shield: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
    />
  ),
  link: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
    />
  ),
} as const;

export function RailIcon({ href }: { href: string }) {
  const key = railIconKey(href);
  switch (key) {
    case "distribuir":
      return <Svg iconKey={key}>{PATHS.clockDistribuir}</Svg>;
    case "dashboard-whatsapp":
    case "admin-whatsapp":
      return <Svg iconKey={key}>{PATHS.phone}</Svg>;
    case "dashboard":
    case "admin-tenants":
      return <Svg iconKey={key}>{PATHS.home}</Svg>;
    case "inbox":
      return <Svg iconKey={key}>{PATHS.inboxChat}</Svg>;
    case "conversations":
    case "admin-conversations":
      return <Svg iconKey={key}>{PATHS.conversations}</Svg>;
    case "automation":
      return <Svg iconKey={key}>{PATHS.lightning}</Svg>;
    case "billing":
    case "admin-billing":
      return <Svg iconKey={key}>{PATHS.card}</Svg>;
    case "settings":
      return <Svg iconKey={key}>{PATHS.cog}</Svg>;
    case "dashboard-ai":
    case "admin-metrics":
      return <Svg iconKey={key}>{PATHS.chart}</Svg>;
    case "agents":
    case "admin-agents":
      return <Svg iconKey={key}>{PATHS.users}</Svg>;
    case "queues":
      return <Svg iconKey={key}>{PATHS.list}</Svg>;
    case "admin-affiliates":
    case "admin-fallback":
      return <Svg iconKey={key}>{PATHS.shield}</Svg>;
    default:
      return <Svg iconKey="generic">{PATHS.link}</Svg>;
  }
}
