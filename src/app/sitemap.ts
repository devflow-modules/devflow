import type { MetadataRoute } from "next";

const baseUrl = "https://devflowlabs.com.br";

const routes = [
  { path: "/", priority: 1, changeFrequency: "weekly" as const },
  { path: "/produtos/whatsapp-platform", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/produtos/funklab-studio", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/segmentos/tabacarias", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/projetos", priority: 0.8, changeFrequency: "weekly" as const },
  { path: "/contato", priority: 0.7, changeFrequency: "monthly" as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
