import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

const baseUrl = "https://devflowlabs.com.br";

const articles: Record<
  string,
  {
    title: string;
    description: string;
    date: string;
    content: string;
  }
> = {
  "automacao-whatsapp-empresas-guia-completo": {
    title: "Automação de WhatsApp para empresas: guia completo",
    description:
      "Tudo o que você precisa saber para automatizar o atendimento da sua empresa no WhatsApp.",
    date: "2025-03-11",
    content: `
      <p>Empresas que usam WhatsApp para atendimento sabem: o volume de mensagens cresce rápido. E quando cresce, responder manualmente vira um problema.</p>
      <p>Automação de WhatsApp é usar um sistema que responde clientes automaticamente, 24 horas por dia, e transfere para um humano quando preciso. O resultado: menos sobrecarga, mais organização, clientes atendidos na hora.</p>
      <h2>O que a automação entrega</h2>
      <ul>
        <li><strong>Respostas automáticas</strong> para perguntas frequentes (horário, produtos, preços, entrega)</li>
        <li><strong>Handoff inteligente</strong> — quando o cliente pede atendente, a conversa vai para humano na hora</li>
        <li><strong>Métricas</strong> — volume de mensagens, taxa de automação, horários de pico</li>
      </ul>
      <h2>Quando vale a pena?</h2>
      <p>Se sua equipe repete as mesmas respostas dezenas de vezes por dia, automação faz sentido. Se você recebe poucas mensagens, talvez o WhatsApp comum já resolva.</p>
      <h2>Como começar</h2>
      <p>Comece mapeando as perguntas mais frequentes. Depois, defina fluxos de resposta. O ideal é usar uma plataforma com integração oficial Meta, como a DevFlow WhatsApp Platform.</p>
      <p><a href="/automacao-whatsapp">Conheça a automação DevFlow</a> e veja como funciona na prática.</p>
    `,
  },
  "como-automatizar-atendimento-whatsapp": {
    title: "Como automatizar atendimento no WhatsApp",
    description:
      "Passo a passo para começar a automatizar respostas e organizar o atendimento.",
    date: "2025-03-10",
    content: `
      <p>Automatizar atendimento no WhatsApp não é magia: é planejamento e ferramenta certa.</p>
      <h2>Passo 1: Mapeie as perguntas frequentes</h2>
      <p>O que os clientes mais perguntam? Horário, preço, entrega, status do pedido? Anote tudo. Essas serão as primeiras respostas automáticas.</p>
      <h2>Passo 2: Defina o fluxo</h2>
      <p>Para cada pergunta, qual deve ser a resposta? E quando o cliente quiser falar com humano? O handoff deve acontecer na hora.</p>
      <h2>Passo 3: Escolha a plataforma</h2>
      <p>Prefira soluções com integração oficial Meta (WhatsApp Business API). Evite atalhos que violam os termos do WhatsApp.</p>
      <h2>Passo 4: Teste antes de ir ao ar</h2>
      <p>Simule conversas reais. Veja se as respostas fazem sentido e se o handoff funciona.</p>
      <p><a href="/demo">Teste a demonstração da DevFlow</a> para ver como um fluxo automatizado funciona.</p>
    `,
  },
  "chatbot-whatsapp-vale-pena": {
    title: "Chatbot para WhatsApp: vale a pena?",
    description:
      "Quando um bot de atendimento faz sentido — e quando não faz.",
    date: "2025-03-09",
    content: `
      <p>Chatbot para WhatsApp: vale a pena? Depende.</p>
      <h2>Quando vale a pena</h2>
      <ul>
        <li>Você recebe muitas mensagens repetidas (horário, preço, entrega)</li>
        <li>Sua equipe perde tempo com perguntas que um bot resolve</li>
        <li>Clientes reclamam de demora ou falta de resposta</li>
      </ul>
      <h2>Quando não vale</h2>
      <ul>
        <li>Pouquíssimo volume de mensagens</li>
        <li>Atendimento muito personalizado, sem padrão</li>
        <li>Sem equipe para cuidar do bot e do handoff</li>
      </ul>
      <h2>O segredo: handoff humano</h2>
      <p>Um bom chatbot não substitui o humano — ele filtra e encaminha. Quando o cliente pede atendente, a conversa deve ir para um humano na hora.</p>
      <p><a href="/chatbot-whatsapp">Saiba mais sobre chatbot WhatsApp</a> da DevFlow Labs.</p>
    `,
  },
  "5-erros-atendimento-whatsapp-perdem-clientes": {
    title:
      "5 erros no atendimento pelo WhatsApp que fazem empresas perderem clientes",
    description:
      "O que evitar para não perder vendas e reputação no atendimento.",
    date: "2025-03-08",
    content: `
      <p>Atendimento ruim no WhatsApp custa caro: cliente vai embora e conta para outros.</p>
      <h2>1. Demora para responder</h2>
      <p>Cliente espera horas? Ele já procurou outro. Resposta rápida ou automação fazem diferença.</p>
      <h2>2. Resposta genérica demais</h2>
      <p>Parecer robótico afasta. O ideal é automação que soa natural e encaminha para humano quando preciso.</p>
      <h2>3. Ignorar a mensagem</h2>
      <p>Deixar no vácuo é o pior. Se não puder responder na hora, use automação para ao menos dar um retorno.</p>
      <h2>4. Sem organização</h2>
      <p>Mensagens perdidas, ninguém sabe quem respondeu o quê. Use uma plataforma que centralize e organize.</p>
      <h2>5. Bot sem handoff</h2>
      <p>Bot que não encaminha para humano frustra. O cliente pede atendente e continua falando com máquina? Péssimo.</p>
      <p><a href="/automacao-whatsapp">Conheça a automação DevFlow</a> com handoff inteligente.</p>
    `,
  },
};

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = articles[slug];
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
  return Object.keys(articles).map((slug) => ({ slug }));
}

export default async function BlogArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = articles[slug];
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
