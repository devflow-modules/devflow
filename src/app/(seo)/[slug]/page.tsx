import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getSeoPageBySlug,
  getRelatedPages,
  seoPageSlugs,
} from "@/lib/seo/pages";
import {
  getGrowthPageBySlug,
  getRelatedGrowthPages,
  growthPageSlugs,
} from "@/lib/seo/growth-pages";
import { SeoPageTemplate } from "@/components/seo/SeoPageTemplate";
import { GrowthPageTemplate } from "@/components/seo/GrowthPageTemplate";

const baseUrl = "https://devflowlabs.com.br";

export const dynamicParams = false;

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const seo = seoPageSlugs.map((slug) => ({ slug }));
  const growth = growthPageSlugs.map((slug) => ({ slug }));
  return [...seo, ...growth];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  const growth = getGrowthPageBySlug(slug);
  if (growth) {
    return {
      title: growth.title,
      description: growth.description,
      alternates: { canonical: `${baseUrl}/${slug}` },
      openGraph: {
        title: growth.title,
        description: growth.description,
        url: `${baseUrl}/${slug}`,
        type: "article",
      },
      twitter: {
        title: growth.title,
        description: growth.description,
      },
    };
  }

  const seoPage = getSeoPageBySlug(slug);
  if (seoPage) {
    return {
      title: seoPage.title,
      description: seoPage.description,
      alternates: { canonical: `${baseUrl}/${slug}` },
      openGraph: {
        title: seoPage.title,
        description: seoPage.description,
        url: `${baseUrl}/${slug}`,
        type: "article",
      },
      twitter: {
        title: seoPage.title,
        description: seoPage.description,
      },
    };
  }

  return { title: "Página não encontrada | DevFlow Labs" };
}

export default async function UnifiedSlugPage({ params }: Props) {
  const { slug } = await params;

  const growth = getGrowthPageBySlug(slug);
  if (growth) {
    return (
      <main>
        <GrowthPageTemplate
          page={growth}
          relatedPages={getRelatedGrowthPages(slug)}
        />
      </main>
    );
  }

  const seoPage = getSeoPageBySlug(slug);
  if (seoPage) {
    return (
      <main>
        <SeoPageTemplate
          page={seoPage}
          relatedPages={getRelatedPages(slug)}
        />
      </main>
    );
  }

  notFound();
}
