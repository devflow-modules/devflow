import { applyFlowButtonClass } from "@/components/ui/ApplyFlowButton";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import Link from "next/link";

/** Raiz dos Markdown de produto no GitHub (branch `main`). Atalhos abrem noutro separador; o dashboard não envia dados ao clicar. */
const APPLYFLOW_DOCS_GITHUB_BASE =
  "https://github.com/gustavomarques00/devflow/blob/main/docs/applyflow";

function applyflowDocMarkdownUrl(file: string): string {
  return `${APPLYFLOW_DOCS_GITHUB_BASE}/${file}`;
}

type DocItem = {
  file: string;
  title: string;
  desc: string;
  category: "Produto" | "Arquitetura" | "Design & UX" | "Publicação & carreira";
  priority?: "Essencial";
};

const DOCS: DocItem[] = [
  {
    file: "DESIGN_SYSTEM.md",
    title: "Sistema visual",
    desc: "Tokens, componentes UI do dashboard, hierarquia de botões e diferenças Shadow DOM vs site.",
    category: "Design & UX",
  },
  {
    file: "PRODUCT_FLOW.md",
    title: "Product flow",
    desc: "Discovery → match → save → queue → readiness → application lifecycle.",
    category: "Produto",
    priority: "Essencial",
  },
  {
    file: "ARCHITECTURE.md",
    title: "Arquitetura",
    desc: "Local-first vs V2, providers, Match Engine, tenant boundary.",
    category: "Arquitetura",
    priority: "Essencial",
  },
  {
    file: "PRODUCTION_READINESS.md",
    title: "Production readiness",
    desc: "Closed beta 10–50 controls, blockers for public/paid release.",
    category: "Arquitetura",
    priority: "Essencial",
  },
  {
    file: "PRIVACY_SECURITY.md",
    title: "Privacy / security",
    desc: "Engineering data-flow matrix (CV, providers, DB) — not a legal policy.",
    category: "Arquitetura",
    priority: "Essencial",
  },
  {
    file: "JOB_DISCOVERY.md",
    title: "Job discovery",
    desc: "Providers, Match Engine, opportunity queue, readiness.",
    category: "Produto",
  },
  {
    file: "APPLICATION_LIFECYCLE.md",
    title: "Application lifecycle",
    desc: "Canonical states, Job sync, OCC, cloud history limitation.",
    category: "Produto",
  },
  {
    file: "ADR-LOCAL_FIRST_VS_SERVERLESS.md",
    title: "ADR — Local-first vs serverless",
    desc: "Decisão do MVP: produto local-first; cloud como camada futura opcional.",
    category: "Arquitetura",
  },
  {
    file: "SERVERLESS_FUTURE.md",
    title: "Camada serverless futura",
    desc: "Visão exploratória Pro/cloud — não implementada; riscos e mitigação.",
    category: "Arquitetura",
  },
  {
    file: "CASE_STUDY.md",
    title: "Case study",
    desc: "Contexto, decisões de produto e técnicas (histórico; prefer README actual).",
    category: "Produto",
  },
  {
    file: "ROADMAP.md",
    title: "Roadmap",
    desc: "Notas históricas; release status em PRODUCTION_READINESS.md.",
    category: "Produto",
  },
  {
    file: "DEMO_SCRIPT.md",
    title: "Roteiro de demo (vídeo)",
    desc: "Cenas e narrativas PT/EN para gravação curta de portefólio.",
    category: "Publicação & carreira",
  },
  {
    file: "SCREENSHOTS_CHECKLIST.md",
    title: "Checklist de screenshots",
    desc: "Lista de capturas sugeridas para README, LinkedIn e portefólio.",
    category: "Design & UX",
  },
  {
    file: "INTERVIEW_PITCH.md",
    title: "Pitch para entrevistas",
    desc: "Versões curtas e técnicas (PT/EN) e respostas a perguntas prováveis.",
    category: "Publicação & carreira",
  },
  {
    file: "PUBLICATION_CHECKLIST.md",
    title: "Checklist de publicação",
    desc: "Itens antes de tornar o caso público (dados, build, posts, privacidade).",
    category: "Publicação & carreira",
  },
  {
    file: "LINKEDIN_POST.md",
    title: "Rascunhos para LinkedIn",
    desc: "Textos curtos e longos em PT-BR e EN.",
    category: "Publicação & carreira",
  },
];

const CATEGORY_META: Array<{
  key: DocItem["category"];
  title: string;
  desc: string;
}> = [
  {
    key: "Produto",
    title: "Produto",
    desc: "Visão estratégica, posicionamento e evolução de roadmap do ApplyFlow.",
  },
  {
    key: "Arquitetura",
    title: "Arquitetura",
    desc: "Decisões técnicas, trade-offs local-first e limites claros de escopo cloud.",
  },
  {
    key: "Design & UX",
    title: "Design & UX",
    desc: "Sistema visual, guias de captura e consistência para materiais públicos.",
  },
  {
    key: "Publicação & carreira",
    title: "Publicação & carreira",
    desc: "Materiais prontos para demo, entrevistas e divulgação no LinkedIn.",
  },
];

function DocCard({ doc, highlight = false }: { doc: DocItem; highlight?: boolean }) {
  const href = applyflowDocMarkdownUrl(doc.file);
  const label = `Abrir «${doc.title}» (${doc.file}) no GitHub`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="block h-full rounded-[var(--af-radius)] no-underline outline-none transition-[transform] focus-visible:ring-2 focus-visible:ring-emerald-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--af-bg)]"
    >
      <ApplyFlowCard
        variant={highlight ? "default" : "muted"}
        padding="md"
        className={[
          "group h-full cursor-pointer transition-[border-color,box-shadow,transform] hover:-translate-y-0.5",
          highlight
            ? "border-emerald-500/30 bg-emerald-500/[0.06] shadow-[0_14px_46px_rgba(0,0,0,0.35)] hover:border-emerald-400/55 hover:shadow-[0_20px_56px_rgba(0,0,0,0.45)]"
            : "hover:border-emerald-500/30 hover:shadow-md",
        ].join(" ")}
      >
        <div className="flex items-start justify-between gap-3">
          <span className="rounded-full border border-[color:var(--af-border)] bg-black/25 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
            {doc.category}
          </span>
          {doc.priority ? (
            <span className="rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
              {doc.priority}
            </span>
          ) : null}
        </div>
        <p className="mt-4 text-base font-semibold tracking-tight text-[color:var(--af-text)]">{doc.title}</p>
        <p className="mt-2 text-sm leading-relaxed text-[color:var(--af-text-muted)]">{doc.desc}</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <code className="rounded border border-[color:var(--af-border)] bg-black/25 px-2 py-1 text-[11px] text-emerald-200/90">{doc.file}</code>
          <span className="text-xs text-zinc-500 transition-colors group-hover:text-emerald-300">Abrir no GitHub →</span>
        </div>
      </ApplyFlowCard>
    </a>
  );
}

export default function DocumentacaoPage() {
  const coreDocs = DOCS.filter((d) => d.priority === "Essencial");

  return (
    <main className="mx-auto max-w-6xl space-y-12 px-4 py-14 sm:px-6 sm:py-20">
      <section className="relative overflow-hidden rounded-[var(--af-radius)] border border-[color:var(--af-border)] bg-[color:var(--af-bg-soft)]/85 p-6 sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_65%_at_50%_-20%,rgba(52,211,153,0.14),transparent_60%)]" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400/90">Documentation Hub</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[color:var(--af-text)] sm:text-4xl lg:text-5xl">
            Documentação do produto
          </h1>
          <p className="mt-4 max-w-4xl text-sm leading-relaxed text-[color:var(--af-text-muted)] sm:text-[15px]">
            Arquitetura, fluxo de produto, readiness e materiais de publicação do ApplyFlow — career workflow local-first com persistência V2 opcional (closed beta). Os ficheiros Markdown completos abrem no GitHub (novo separador); o dashboard não envia os teus dados ao seguir estes atalhos.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {["Local-first", "V2 pilot", "Deterministic Match", "Next.js", "Closed beta 10–50"].map((badge) => (
              <span
                key={badge}
                className="rounded-full border border-[color:var(--af-border)] bg-black/25 px-3 py-1 text-[11px] font-medium text-zinc-300"
              >
                {badge}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400/85">Core docs</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[color:var(--af-text)]">Essenciais</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {coreDocs.map((doc) => (
            <DocCard key={doc.file} doc={doc} highlight />
          ))}
        </div>
      </section>

      <section className="rounded-[var(--af-radius)] border border-[color:var(--af-border)] bg-[color:var(--af-surface)] p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400/85">Arquitetura local-first</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <ApplyFlowCard variant="muted" padding="sm">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Extensão</p>
            <p className="mt-1 text-sm font-medium text-[color:var(--af-text)]">Chrome Extension</p>
            <p className="mt-1 text-xs text-[color:var(--af-text-muted)]">Safety gate, histórico local e export JSON.</p>
          </ApplyFlowCard>
          <ApplyFlowCard variant="muted" padding="sm">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Fluxo de dados</p>
            <p className="mt-1 text-sm font-medium text-[color:var(--af-text)]">Local storage → JSON</p>
            <p className="mt-1 text-xs text-[color:var(--af-text-muted)]">Sem backend obrigatório para uso do produto.</p>
          </ApplyFlowCard>
          <ApplyFlowCard variant="muted" padding="sm">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Dashboard</p>
            <p className="mt-1 text-sm font-medium text-[color:var(--af-text)]">Next.js App Router</p>
            <p className="mt-1 text-xs text-[color:var(--af-text-muted)]">V2 Postgres opcional (pilot-gated closed beta).</p>
          </ApplyFlowCard>
        </div>
      </section>

      {CATEGORY_META.map((category) => {
        const docs = DOCS.filter((d) => d.category === category.key);
        return (
          <section key={category.key}>
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400/85">{category.title}</p>
              <p className="mt-2 max-w-3xl text-sm text-[color:var(--af-text-muted)]">{category.desc}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {docs.map((doc) => (
                <DocCard key={doc.file} doc={doc} />
              ))}
            </div>
          </section>
        );
      })}

      <section className="rounded-[var(--af-radius)] border border-[color:var(--af-border)] bg-[color:var(--af-bg-soft)]/80 p-6 sm:p-8">
        <h3 className="text-xl font-semibold tracking-tight text-[color:var(--af-text)]">Explorar o produto</h3>
        <p className="mt-2 text-sm text-[color:var(--af-text-muted)]">
          Navega entre métricas, importação local e documentação técnica sem sair do contexto local-first.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
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
      </section>
    </main>
  );
}
