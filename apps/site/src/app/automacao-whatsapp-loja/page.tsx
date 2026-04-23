import { NicheAutomationWhatsAppPage } from "@/components/niche-whatsapp/niche-automation-whatsapp-page";
import {
  AUTOMACAO_WHATSAPP_LOJA,
  buildNicheAutomationMetadata,
} from "@/lib/niche-whatsapp-automation-pages";

export const metadata = buildNicheAutomationMetadata(AUTOMACAO_WHATSAPP_LOJA);

export default function AutomacaoWhatsAppLojaPage() {
  return <NicheAutomationWhatsAppPage content={AUTOMACAO_WHATSAPP_LOJA} />;
}
