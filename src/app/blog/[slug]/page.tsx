import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getBlogArticleBySlug, blogSlugs } from "@/lib/blog";

const baseUrl = "https://devflowlabs.com.br";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getBlogArticleBySlug(slug);
  if (!article) return { title: "Artigo não encontrado" };
  return {
    title: `${article.title} | DevFlow Labs`,
    description: article.description,
    alternates: {
      canonical: `${baseUrl}/blog/${slug}`,
    },
    openGraph: {
      title: article.title,
      description: article.description,
      url: `${baseUrl}/blog/${slug}`,
      type: "article",
      publishedTime: article.date,
    },
  };
}

export async function generateStaticParams() {
  return blogSlugs.map((slug) => ({ slug }));
}

export default async function BlogArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = getBlogArticleBySlug(slug);
  if (!article) notFound();

  return (
    <main className="py-16 sm:py-20">
      <article className="mx-auto max-w-[720px] px-4 sm:px-6 lg:px-8">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Voltar ao blog
        </Link>
        <header className="mt-8">
          <time
            dateTime={article.date}
            className="text-sm text-muted-foreground"
          >
            {new Date(article.date).toLocaleDateString("pt-BR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </time>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {article.title}
          </h1>
        </header>
        <div
          className="blog-content mt-10"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />
        <footer className="mt-12 border-t border-border pt-8">
          <Link
            href="/automacao-whatsapp"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            Conhecer automação WhatsApp
            <ArrowLeft className="size-4 rotate-180" aria-hidden />
          </Link>
        </footer>
      </article>
    </main>
  );
}
