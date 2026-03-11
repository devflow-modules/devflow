import type { MetadataRoute } from "next";

const baseUrl = "https://devflowlabs.com.br";

const routes = [
  { path: "/", priority: 1, changeFrequency: "weekly" as const },
  { path: "/produtos/whatsapp-platform", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/produtos/funklab-studio", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/automacao-whatsapp-tabacaria", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/automacao-whatsapp-restaurante", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/demo", priority: 0.85, changeFrequency: "weekly" as const },
  { path: "/projetos", priority: 0.8, changeFrequency: "weekly" as const },
  { path: "/contato", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/privacidade", priority: 0.5, changeFrequency: "yearly" as const },
  { path: "/termos", priority: 0.5, changeFrequency: "yearly" as const },
  { path: "/cookies", priority: 0.5, changeFrequency: "yearly" as const },
  { path: "/sobre", priority: 0.6, changeFrequency: "monthly" as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
