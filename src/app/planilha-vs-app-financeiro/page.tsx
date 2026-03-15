import type { Metadata } from "next";
import Link from "next/link";
import { Section } from "@/components/layout/Section";

const baseUrl = "https://devflowlabs.com.br";

export const metadata: Metadata = {
  title: "Planilha financeira vs aplicativo financeiro | DevFlow Labs",
  description:
    "Compare planilhas de controle financeiro com aplicativos. Veja por que um app como o DevFlow Financeiro pode economizar tempo e dar mais clareza.",
  alternates: {
    canonical: `${baseUrl}/planilha-vs-app-financeiro`,
  },
  keywords: [
    "planilha financeira",
    "aplicativo financeiro",
    "controle financeiro",
    "planilha vs app",
    "organizar finanças",
  ],
  openGraph: {
    title: "Planilha financeira vs aplicativo financeiro | DevFlow Labs",
    description:
      "Compare planilhas com aplicativos de controle financeiro. Descubra o que um app pode fazer por você.",
    url: `${baseUrl}/planilha-vs-app-financeiro`,
    type: "article",
  },
};

const COMPARISON = [
  {
    funcao: "Controle automático",
    planilha: false,
    devflow: true,
  },
  {
    funcao: "Histórico completo",
    planilha: false,
    devflow: true,
  },
  {
    funcao: "Projeção de fluxo de caixa",
    planilha: false,
    devflow: true,
  },
  {
    funcao: "Compartilhamento casal/família",
    planilha: false,
    devflow: true,
  },
  {
    funcao: "Separação PJ e PF",
    planilha: false,
    devflow: true,
  },
  {
    funcao: "Metas de investimento e reserva",
    planilha: false,
    devflow: true,
  },
  {
    funcao: "Sincronização entre dispositivos",
    planilha: "Parcial (Google Sheets)",
    devflow: true,
  },
  {
    funcao: "Alertas e lembretes",
    planilha: false,
    devflow: "Em breve",
  },
];

function Check({ ok }: { ok: boolean }) {
  if (ok) {
    return <span className="text-emerald-600 dark:text-emerald-400">✓</span>;
  }
  return <span className="text-muted-foreground">—</span>;
}

function Value({ value }: { value: string | boolean }) {
  if (typeof value === "boolean") {
    return <Check ok={value} />;
  }
  return <span className="text-sm text-muted-foreground">{value}</span>;
}

export default function PlanilhaVsAppPage() {
  return (
    <div className="min-h-screen">
      <Section aria-label="Conteúdo principal" className="py-16 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Planilha financeira vs aplicativo financeiro
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Planilhas ajudam, mas têm limitações. Veja o que um aplicativo como
            o DevFlow Financeiro oferece a mais.
          </p>

          <div className="mt-12 overflow-x-auto">
            <table className="w-full min-w-[400px] border-collapse rounded-lg border border-border">
              <thead>
                <tr className="bg-muted/50">
                  <th className="border-b border-border px-4 py-3 text-left text-sm font-semibold text-foreground">
                    Função
                  </th>
                  <th className="border-b border-border px-4 py-3 text-center text-sm font-semibold text-foreground">
                    Planilha
                  </th>
                  <th className="border-b border-border px-4 py-3 text-center text-sm font-semibold text-foreground">
                    DevFlow
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr
                    key={row.funcao}
                    className={i % 2 === 0 ? "bg-card" : "bg-muted/20"}
                  >
                    <td className="border-b border-border px-4 py-3 text-sm text-foreground">
                      {row.funcao}
                    </td>
                    <td className="border-b border-border px-4 py-3 text-center">
                      <Value value={row.planilha} />
                    </td>
                    <td className="border-b border-border px-4 py-3 text-center">
                      <Value value={row.devflow} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-12 rounded-xl border border-primary/30 bg-primary/5 p-6">
            <h2 className="text-xl font-semibold text-foreground">
              Teste o simulador financeiro
            </h2>
            <p className="mt-2 text-muted-foreground">
              Simule seu fluxo mensal em segundos, sem cadastro.
            </p>
            <Link
              href="/ferramentas/financeiro"
              className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Ir para o simulador
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/ferramentas/financeiro"
              className="text-sm font-medium text-primary hover:underline"
            >
              ← Voltar ao Financeiro
            </Link>
            <Link
              href="/ferramentas"
              className="text-sm font-medium text-primary hover:underline"
            >
              Ver todas as ferramentas
            </Link>
          </div>
        </div>
      </Section>
    </div>
  );
}
