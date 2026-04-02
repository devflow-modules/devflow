import { NextResponse } from "next/server";

const baseUrl = "https://devflowlabs.com.br";

const routes: { path: string; changefreq: string; priority: string }[] = [
  { path: "/", changefreq: "weekly", priority: "1" },
  { path: "/automacao-whatsapp", changefreq: "weekly", priority: "0.95" },
  { path: "/chatbot-whatsapp", changefreq: "weekly", priority: "0.9" },
  { path: "/software-atendimento-whatsapp", changefreq: "weekly", priority: "0.9" },
  { path: "/produtos/whatsapp-platform", changefreq: "weekly", priority: "0.9" },
  { path: "/produtos/funklab-studio", changefreq: "weekly", priority: "0.9" },
  { path: "/automacao-whatsapp-restaurante", changefreq: "weekly", priority: "0.9" },
  { path: "/automacao-whatsapp-tabacaria", changefreq: "weekly", priority: "0.9" },
  { path: "/automacao-whatsapp-loja", changefreq: "weekly", priority: "0.9" },
  { path: "/automacao-whatsapp-clinica", changefreq: "weekly", priority: "0.9" },
  { path: "/demo", changefreq: "weekly", priority: "0.85" },
  { path: "/precos", changefreq: "weekly", priority: "0.85" },
  { path: "/blog", changefreq: "weekly", priority: "0.85" },
  { path: "/projetos", changefreq: "weekly", priority: "0.8" },
  { path: "/produtos", changefreq: "weekly", priority: "0.9" },
  { path: "/ferramentas", changefreq: "weekly", priority: "0.9" },
  { path: "/ferramentas/financeiro", changefreq: "weekly", priority: "0.85" },
  { path: "/ferramentas/financeiro/demo", changefreq: "weekly", priority: "0.75" },
  { path: "/ferramentas/divisao-de-contas", changefreq: "weekly", priority: "0.8" },
  { path: "/ferramentas/consulta-cnpj", changefreq: "weekly", priority: "0.8" },
  { path: "/contato", changefreq: "monthly", priority: "0.7" },
  { path: "/privacidade", changefreq: "yearly", priority: "0.5" },
  { path: "/termos", changefreq: "yearly", priority: "0.5" },
  { path: "/cookies", changefreq: "yearly", priority: "0.5" },
  { path: "/sobre", changefreq: "monthly", priority: "0.6" },
];

const lastmod = new Date().toISOString().slice(0, 10);

function buildUrlEl(path: string, changefreq: string, priority: string) {
  return `
  <url>
    <loc>${baseUrl}${path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

export function GET() {
  const urlElements = routes.map((r) => buildUrlEl(r.path, r.changefreq, r.priority)).join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urlElements}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
