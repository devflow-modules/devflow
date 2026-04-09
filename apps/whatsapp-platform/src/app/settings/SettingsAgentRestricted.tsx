import Link from "next/link";
import { StateEmpty } from "@/components/ui/app-states";
import { buttonClassName } from "@/components/ui/button";
import { permissionsMessages } from "@/lib/permissionsMessages";

export function SettingsAgentRestricted() {
  return (
    <div className="mx-auto max-w-lg py-12">
      <StateEmpty
        title="Acesso restrito"
        description={permissionsMessages.adminOnly}
        action={
          <Link href="/inbox" className={buttonClassName("primary")}>
            Ir para a Inbox
          </Link>
        }
      />
    </div>
  );
}
