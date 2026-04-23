import { NicheAutomationWhatsAppPage } from "@/components/niche-whatsapp/niche-automation-whatsapp-page";
import {
  AUTOMACAO_WHATSAPP_TABACARIA,
  buildNicheAutomationMetadata,
} from "@/lib/niche-whatsapp-automation-pages";

export const metadata = buildNicheAutomationMetadata(AUTOMACAO_WHATSAPP_TABACARIA);

export default function AutomacaoWhatsAppTabacariaPage() {
  return <NicheAutomationWhatsAppPage content={AUTOMACAO_WHATSAPP_TABACARIA} />;
}
