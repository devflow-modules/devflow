import type { JobContext } from "@devflow/applyflow-linkedin";

export function JobSummaryCard(props: { ctx: JobContext }) {
  const { ctx } = props;
  const hasMeta = !!(ctx.title || ctx.company || ctx.location);

  if (!hasMeta) {
    return (
      <section className="af-card">
        <p className="af-title" style={{ fontSize: "13px", marginBottom: "6px" }}>
          Contexto da vaga
        </p>
        <p className="af-muted">
          Posicione esta aba na descrição da vaga para um resumo melhor — Sprint 1 usa heurística simples.
        </p>
      </section>
    );
  }

  return (
    <section className="af-card">
      <p className="af-title" style={{ fontSize: "13px", marginBottom: "6px" }}>
        Contexto da vaga
      </p>
      {ctx.title ? <p className="af-field-value" style={{ marginBottom: "4px" }}>{ctx.title}</p> : null}
      {ctx.company ? <p className="af-sub" style={{ marginBottom: "4px" }}>{ctx.company}</p> : null}
      {ctx.location ? <p className="af-sub" style={{ marginBottom: "0px" }}>{ctx.location}</p> : null}
    </section>
  );
}
