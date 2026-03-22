import { NextResponse } from "next/server";
import { seoPageSlugs } from "@/lib/seo/pages";

const baseUrl = "https://devflowlabs.com.br";
const lastmod = new Date().toISOString().slice(0, 10);

export function GET() {
  const urlElements = seoPageSlugs
    .map(
      (slug) => `
  <url>
    <loc>${baseUrl}/${slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.65</priority>
  </url>`
    )
    .join("");

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
