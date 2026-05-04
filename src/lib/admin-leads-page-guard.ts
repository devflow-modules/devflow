import { redirect } from "next/navigation";
import { getCrmWhatsappSessionFromCookies } from "@/lib/crm-whatsapp-auth";
import { whatsappAppLoginUrlWithNext } from "@/lib/portal-whatsapp-login-url";

/**
 * Páginas `/admin/leads` e `/admin/lead-finder`: ferramenta interna DevFlow.
 * Em produção exige sessão WhatsApp Platform com `platform_admin`.
 */
export async function requireDevflowOutboundCrmPage(nextPath: string): Promise<void> {
  if (process.env.NODE_ENV !== "production") return;
  const session = await getCrmWhatsappSessionFromCookies();
  if (!session || session.role !== "platform_admin") {
    redirect(whatsappAppLoginUrlWithNext(nextPath));
  }
}
