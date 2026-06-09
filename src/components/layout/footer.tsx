"use client";

import Link from "next/link";
import { WhatsAppCta } from "@/components/shared/whatsapp-cta";
import { trackEcosystemLinkClick, trackFooterLinkClick, trackFunnelCtaClick } from "@/lib/analytics";
import {
  CONTACT_DIAGNOSTIC_WHATSAPP_TEXT,
  PRIMARY_CONVERT_CTA_LABEL,
  PRIMARY_CONVERT_HREF,
  PRIMARY_DEMO_CTA_LABEL,
  PRIMARY_DEMO_HREF,
  QUICK_WHATSAPP_CTA_LABEL,
} from "@/lib/conversion-copy";
import { cn } from "@/lib/utils";

const funnelLinks = [
  { href: "/produtos/whatsapp-platform", label: "WhatsApp Platform", item: "whatsapp_platform" },
  { href: PRIMARY_DEMO_HREF, label: PRIMARY_DEMO_CTA_LABEL, item: "demo" },
  { href: PRIMARY_CONVERT_HREF, label: PRIMARY_CONVERT_CTA_LABEL, item: "agendar_diagnostico" },
  { href: "/#faq", label: "FAQ", item: "faq" },
  { href: "/como-funciona", label: "Como funciona", item: "como_funciona" },
] as const;

const ecosystemLinks = [
  { href: "/ferramentas", label: "Ferramentas gratuitas", item: "ferramentas_gratuitas" },
  { href: "/ferramentas/financeiro", label: "Sistema Financeiro", item: "financeiro" },
  { href: "/ferramentas/divisao-de-contas", label: "Divisão de contas", item: "divisao_contas" },
  { href: "/ferramentas/consulta-cnpj", label: "Consulta CNPJ", item: "consulta_cnpj" },
  { href: "/produtos", label: "Catálogo de produtos", item: "products_hub" },
  { href: "/precos", label: "Preços", item: "precos" },
] as const;

const segmentLinks = [
  { href: "/automacao-whatsapp", label: "Automação WhatsApp", item: "automacao_whatsapp" },
  { href: "/automacao-whatsapp-restaurante", label: "Restaurantes", item: "segmento_restaurante" },
  { href: "/automacao-whatsapp-tabacaria", label: "Tabacarias", item: "segmento_tabacaria" },
  { href: "/automacao-whatsapp-loja", label: "Lojas", item: "segmento_loja" },
  { href: "/automacao-whatsapp-clinica", label: "Clínicas", item: "segmento_clinica" },
] as const;

const empresaLinks = [
  { href: "/sobre", label: "Sobre", item: "sobre" },
  { href: "/cases", label: "Cases", item: "cases" },
  { href: "/projetos", label: "Projetos", item: "projetos" },
  { href: "/blog", label: "Blog", item: "blog" },
] as const;

const legalLinks = [
  { href: "/privacidade", label: "Política de Privacidade", item: "privacidade" },
  { href: "/termos", label: "Termos de Uso", item: "termos" },
  { href: "/cookies", label: "Cookies", item: "cookies" },
] as const;

const currentYear = new Date().getFullYear();

const footerLinkClass =
  "df-text-on-dark-secondary flex min-h-10 items-center py-1 text-sm font-medium transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

type FooterSection = "funnel" | "ecossistema" | "segmentos" | "empresa" | "legal";

function trackFooterNav(item: string, section: FooterSection) {
  trackFooterLinkClick({ item, section });
  if (section === "ecossistema" || section === "segmentos") {
    trackEcosystemLinkClick({ item, surface: `footer_${section}` });
  }
  if (item === "demo") {
    trackFunnelCtaClick({ cta: "ver_demo_guiada", surface: "footer_funnel" });
  }
  if (item === "agendar_diagnostico") {
    trackFunnelCtaClick({ cta: "agendar_diagnostico", surface: "footer_funnel" });
  }
}

export function Footer() {
  return (
    <footer className="df-card-dark border-t df-border-dark">
      <div className="mx-auto max-w-[1200px] px-3 py-10 min-[400px]:px-4 sm:px-6 sm:py-12 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-10">
          <div className="space-y-4 sm:col-span-2 lg:col-span-1">
            <Link
              href="/"
              className="inline-block text-base font-semibold text-foreground transition-colors hover:text-primary"
              onClick={() => trackFooterNav("logo_home", "funnel")}
            >
              DevFlow Labs
            </Link>
            <p className="df-text-on-dark-secondary max-w-md text-sm leading-relaxed">
              DevFlow Labs implementa operações de atendimento e vendas no WhatsApp com IA no repetitivo, inbox
              multiatendente, handoff humano, SLA e dashboard operacional.
            </p>
            <div className="flex flex-col gap-3 pt-1">
              <Link
                href={PRIMARY_CONVERT_HREF}
                className={cn("df-btn-primary min-h-11 rounded-xl px-4 text-sm font-semibold")}
                onClick={() =>
                  trackFunnelCtaClick({ cta: "agendar_diagnostico", surface: "footer_primary" })
                }
              >
                {PRIMARY_CONVERT_CTA_LABEL}
              </Link>
              <WhatsAppCta
                label={QUICK_WHATSAPP_CTA_LABEL}
                variant="secondary"
                size="default"
                className="!min-h-11 w-full justify-center sm:w-auto sm:justify-center"
                text={CONTACT_DIAGNOSTIC_WHATSAPP_TEXT}
                trackingSource="footer_whatsapp"
                trackFunnel
              />
            </div>
          </div>

          <nav aria-label="WhatsApp Platform e conversão">
            <h3 className="text-sm font-semibold text-foreground">WhatsApp Platform</h3>
            <ul className="mt-3 space-y-0.5" role="list">
              {funnelLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={footerLinkClass}
                    onClick={() => trackFooterNav(link.item, "funnel")}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Ecossistema DevFlow Labs">
            <h3 className="text-sm font-semibold text-foreground">Ecossistema</h3>
            <p className="df-text-on-dark-secondary mt-1 text-xs leading-relaxed">
              Ferramentas e produtos complementares.
            </p>
            <ul className="mt-3 space-y-0.5" role="list">
              {ecosystemLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={footerLinkClass}
                    onClick={() => trackFooterNav(link.item, "ecossistema")}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Segmentos de atendimento">
            <h3 className="text-sm font-semibold text-foreground">Por segmento</h3>
            <ul className="mt-3 space-y-0.5" role="list">
              {segmentLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={footerLinkClass}
                    onClick={() => trackFooterNav(link.item, "segmentos")}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Empresa">
            <h3 className="text-sm font-semibold text-foreground">Empresa</h3>
            <ul className="mt-3 space-y-0.5" role="list">
              {empresaLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={footerLinkClass}
                    onClick={() => trackFooterNav(link.item, "empresa")}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/contato"
                  className={footerLinkClass}
                  onClick={() => trackFooterNav("contato", "empresa")}
                >
                  Contato
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-8 border-t df-border-dark pt-6 sm:mt-10 sm:pt-8">
          <nav
            className="df-text-on-dark-secondary flex flex-col items-center gap-2 text-center text-xs leading-relaxed sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-5 sm:gap-y-2 sm:text-sm"
            aria-label="Legal e institucional"
          >
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="min-h-9 py-1 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                onClick={() => trackFooterNav(link.item, "legal")}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <p className="df-text-on-dark-secondary mt-4 text-center text-xs sm:text-sm">
            © {currentYear} DevFlow Labs. Todos os direitos reservados.
          </p>
          <address className="df-text-on-dark-secondary mx-auto mt-3 max-w-lg text-center text-xs leading-relaxed not-italic sm:text-sm">
            São Paulo — SP · CNPJ: 60.517.335/0001-03 ·{" "}
            <a href="mailto:contato@devflowlabs.com.br" className="df-link break-all font-medium sm:break-normal">
              contato@devflowlabs.com.br
            </a>
          </address>
        </div>
      </div>
    </footer>
  );
}
