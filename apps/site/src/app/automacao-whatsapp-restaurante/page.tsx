import { NicheAutomationWhatsAppPage } from "@/components/niche-whatsapp/niche-automation-whatsapp-page";
import {
  AUTOMACAO_WHATSAPP_RESTAURANTE,
  buildNicheAutomationMetadata,
} from "@/lib/niche-whatsapp-automation-pages";

export const metadata = buildNicheAutomationMetadata(AUTOMACAO_WHATSAPP_RESTAURANTE);

export default function AutomacaoWhatsAppRestaurantePage() {
  return <NicheAutomationWhatsAppPage content={AUTOMACAO_WHATSAPP_RESTAURANTE} />;
}
