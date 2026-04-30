import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const baseUrl = "https://devflowlabs.com.br";

const articles = [
  {
    slug: "automacao-whatsapp-empresas-guia-completo",
    title: "Automação de WhatsApp para empresas: guia completo",
    excerpt:
      "Tudo o que você precisa saber para automatizar o atendimento da sua empresa no WhatsApp.",
    date: "2025-03-11",
  },
  {
    slug: "como-automatizar-atendimento-whatsapp",
    title: "Como automatizar atendimento no WhatsApp",
    excerpt:
      "Passo a passo para começar a automatizar respostas e organizar o atendimento.",
    date: "2025-03-10",
  },
  {
    slug: "chatbot-whatsapp-vale-pena",
    title: "Chatbot para WhatsApp: vale a pena?",
    excerpt:
      "Quando um bot de atendimento faz sentido — e quando não faz.",
    date: "2025-03-09",
  },
  {
    slug: "5-erros-atendimento-whatsapp-perdem-clientes",
    title:
      "5 erros no atendimento pelo WhatsApp que fazem empresas perderem clientes",
    excerpt:
      "O que evitar para não perder vendas e reputação no atendimento.",
    date: "2025-03-08",
  },
];

export const metadata: Metadata = {
  title: "Blog | Automação WhatsApp, Chatbot e Atendimento",
  description:
    "Artigos sobre automação de WhatsApp, chatbot e atendimento para empresas. Dicas e guias da DevFlow Labs.",
  alternates: {
    canonical: `${baseUrl}/blog`,
  },
  openGraph: {
    title: "Blog DevFlow Labs | Automação WhatsApp",
    description:
      "Artigos sobre automação de WhatsApp, chatbot e atendimento para empresas.",
    url: `${baseUrl}/blog`,
  },
};

export default function BlogPage() {
  return (
    <main className="py-16 sm:py-20">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1
            id="blog-heading"
            className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl"
          >
            Blog
          </h1>
          <p className="mt-4 text-lg df-text-secondary">
            Automação WhatsApp, chatbot e atendimento. Dicas e guias para sua
            empresa.
          </p>
        </div>

        <ul
          className="mx-auto mt-16 max-w-2xl space-y-8"
          role="list"
          aria-labelledby="blog-heading"
        >
          {articles.map((article) => (
            <li key={article.slug}>
              <Link
                href={`/blog/${article.slug}`}
                className={cn(
                  "block rounded-xl border border-border bg-card p-6",
                  "transition-all duration-200 hover:border-primary/30 hover:shadow-md"
                )}
              >
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
                <h2 className="mt-2 text-xl font-semibold text-foreground">
                  {article.title}
                </h2>
                <p className="mt-2 df-text-secondary">{article.excerpt}</p>
                <span
                  className={cn(
                    "mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary"
                  )}
                >
                  Ler artigo
                  <ArrowRight className="size-4" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-12 text-center">
          <Link
            href="/automacao-whatsapp"
            className="text-sm font-medium text-primary hover:underline"
          >
            ← Ver automação WhatsApp
          </Link>
        </p>
      </div>
    </main>
  );
}
