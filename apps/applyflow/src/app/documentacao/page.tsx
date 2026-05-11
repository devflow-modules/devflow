import { applyFlowButtonClass } from "@/components/ui/ApplyFlowButton";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import Link from "next/link";

const DOCS = [
  {
    file: "DESIGN_SYSTEM.md",
    title: "Sistema visual",
    desc: "Tokens, componentes UI do dashboard, hierarquia de botões e diferenças Shadow DOM vs site.",
  },
  {
    file: "PRODUCT_OVERVIEW.md",
    title: "Visão de produto",
    desc: "Problema, solução, público, features e privacidade.",
  },
  {
    file: "ARCHITECTURE.md",
    title: "Arquitetura",
    desc: "Extensão, dashboard, pacotes partilhados, fluxo de dados e limites de segurança.",
  },
  {
    file: "ADR-LOCAL_FIRST_VS_SERVERLESS.md",
    title: "ADR — Local-first vs serverless",
    desc: "Decisão do MVP: produto local-first; cloud como camada futura opcional.",
  },
  {
    file: "SERVERLESS_FUTURE.md",
    title: "Camada serverless futura",
    desc: "Visão exploratória Pro/cloud — não implementada; riscos e mitigação.",
  },
  {
    file: "CASE_STUDY.md",
    title: "Case study",
    desc: "Contexto, decisões de produto e técnicas, desafios e o que o projeto demonstra.",
  },
  {
    file: "ROADMAP.md",
    title: "Roadmap",
    desc: "Concluído, próximos passos, futuro e fora de escopo proposital.",
  },
  {
    file: "DEMO_SCRIPT.md",
    title: "Roteiro de demo (vídeo)",
    desc: "Cenas e narrativas PT/EN para gravação curta de portefólio.",
  },
  {
    file: "SCREENSHOTS_CHECKLIST.md",
    title: "Checklist de screenshots",
    desc: "Lista de capturas sugeridas para README, LinkedIn e portefólio.",
  },
  {
    file: "INTERVIEW_PITCH.md",
    title: "Pitch para entrevistas",
    desc: "Versões curtas e técnicas (PT/EN) e respostas a perguntas prováveis.",
  },
  {
    file: "PUBLICATION_CHECKLIST.md",
    title: "Checklist de publicação",
    desc: "Itens antes de tornar o caso público (dados, build, posts, privacidade).",
  },
  {
    file: "LINKEDIN_POST.md",
    title: "Rascunhos para LinkedIn",
    desc: "Textos curtos e longos em PT-BR e EN.",
  },
];

export default function DocumentacaoPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-14 sm:py-20">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-400/90">ApplyFlow</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[color:var(--af-text)]">Documentação</h1>
      <p className="mt-4 text-sm leading-relaxed text-[color:var(--af-text-muted)]">
        O conteúdo completo vive no monorepo em{" "}
        <code className="rounded border border-[color:var(--af-border)] bg-[color:var(--af-bg-soft)] px-1.5 py-0.5 text-[13px] text-emerald-200/90">
          docs/applyflow/
        </code>
        . Esta página funciona como índice quando exploras o projeto localmente ou um deploy estático do dashboard.
      </p>

      <ul className="mt-10 list-none space-y-3 p-0">
        {DOCS.map((d) => (
          <li key={d.file}>
            <ApplyFlowCard variant="muted" padding="md">
              <p className="font-medium text-[color:var(--af-text)]">{d.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-[color:var(--af-text-muted)]">{d.desc}</p>
              <p className="mt-2 font-mono text-xs text-zinc-500">{d.file}</p>
            </ApplyFlowCard>
          </li>
        ))}
      </ul>

      <div className="mt-12 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Link href="/dashboard" className={applyFlowButtonClass({ variant: "primary", size: "md", className: "justify-center sm:min-w-[160px]" })}>
          Abrir dashboard
        </Link>
        <Link
          href="/dashboard#como-importar"
          className={applyFlowButtonClass({ variant: "secondary", size: "md", className: "justify-center sm:min-w-[160px]" })}
        >
          Importar JSON
        </Link>
        <Link
          href="/"
          className={applyFlowButtonClass({ variant: "ghost", size: "md", className: "justify-center border-transparent sm:min-w-[120px]" })}
        >
          ← Início
        </Link>
      </div>
    </main>
  );
}
