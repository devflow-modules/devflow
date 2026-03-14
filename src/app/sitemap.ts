import type { MetadataRoute } from "next";

const baseUrl = "https://devflowlabs.com.br";

const blogSlugs = [
  "automacao-whatsapp-empresas-guia-completo",
  "como-automatizar-atendimento-whatsapp",
  "chatbot-whatsapp-vale-pena",
  "5-erros-atendimento-whatsapp-perdem-clientes",
];

const routes = [
  { path: "/", priority: 1, changeFrequency: "weekly" as const },
  { path: "/automacao-whatsapp", priority: 0.95, changeFrequency: "weekly" as const },
  { path: "/chatbot-whatsapp", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/software-atendimento-whatsapp", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/produtos/whatsapp-platform", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/produtos/funklab-studio", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/automacao-whatsapp-restaurante", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/automacao-whatsapp-tabacaria", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/automacao-whatsapp-loja", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/automacao-whatsapp-clinica", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/demo", priority: 0.85, changeFrequency: "weekly" as const },
  { path: "/precos", priority: 0.85, changeFrequency: "weekly" as const },
  { path: "/blog", priority: 0.85, changeFrequency: "weekly" as const },
  { path: "/projetos", priority: 0.8, changeFrequency: "weekly" as const },
  { path: "/ferramentas", priority: 0.85, changeFrequency: "weekly" as const },
  { path: "/ferramentas/financeiro", priority: 0.8, changeFrequency: "weekly" as const },
  { path: "/ferramentas/divisao-de-contas", priority: 0.8, changeFrequency: "weekly" as const },
  { path: "/contato", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/privacidade", priority: 0.5, changeFrequency: "yearly" as const },
  { path: "/termos", priority: 0.5, changeFrequency: "yearly" as const },
  { path: "/cookies", priority: 0.5, changeFrequency: "yearly" as const },
  { path: "/sobre", priority: 0.6, changeFrequency: "monthly" as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const mainRoutes = routes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const blogRoutes = blogSlugs.map((slug) => ({
    url: `${baseUrl}/blog/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...mainRoutes, ...blogRoutes];
}
