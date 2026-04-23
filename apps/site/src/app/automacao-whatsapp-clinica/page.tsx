import { NicheAutomationWhatsAppPage } from "@/components/niche-whatsapp/niche-automation-whatsapp-page";
import {
  AUTOMACAO_WHATSAPP_CLINICA,
  buildNicheAutomationMetadata,
} from "@/lib/niche-whatsapp-automation-pages";

export const metadata = buildNicheAutomationMetadata(AUTOMACAO_WHATSAPP_CLINICA);

export default function AutomacaoWhatsAppClinicaPage() {
  return <NicheAutomationWhatsAppPage content={AUTOMACAO_WHATSAPP_CLINICA} />;
}
