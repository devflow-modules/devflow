import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { AppShell } from "@/components/shell/AppShell";
import { JWT_COOKIE_NAME } from "@/lib/auth-config";
import { validateAuthToken } from "@/modules/auth";
import { isAgent } from "@/lib/roles";
import { SettingsAgentRestricted } from "./SettingsAgentRestricted";

export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const store = await cookies();
  const token = store.get(JWT_COOKIE_NAME)?.value;
  const auth = token ? await validateAuthToken(token) : null;
  if (auth && isAgent(auth.payload.role)) {
    return (
      <AppShell>
        <SettingsAgentRestricted />
      </AppShell>
    );
  }
  return <AppShell>{children}</AppShell>;
}
