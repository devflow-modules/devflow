import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ApplyFlowEmptyState } from "@/components/ui/ApplyFlowEmptyState";
import { ApplyFlowLoadingState } from "@/components/ui/ApplyFlowLoadingState";
import {
  applicationStatusTone,
  matchDecisionTone,
  readinessTone,
} from "@/components/ui/status-tones";

describe("ApplyFlowLoadingState", () => {
  it("exposes polite status for screen readers", () => {
    const html = renderToStaticMarkup(<ApplyFlowLoadingState label="A carregar…" />);
    expect(html).toContain('role="status"');
    expect(html).toContain("A carregar…");
    expect(html).toContain("data-testid=\"applyflow-loading\"");
  });
});

describe("ApplyFlowEmptyState", () => {
  it("renders title, description and optional action", () => {
    const html = renderToStaticMarkup(
      <ApplyFlowEmptyState
        compact
        title="Fila vazia"
        description="Nenhuma vaga na fila ativa."
        primaryLabel="Buscar"
        onPrimary={() => undefined}
      />,
    );
    expect(html).toContain("Fila vazia");
    expect(html).toContain("Nenhuma vaga na fila ativa.");
    expect(html).toContain("Buscar");
  });
});

describe("status tone helpers", () => {
  it("keeps Match apply and Application applied visually distinct", () => {
    expect(matchDecisionTone("apply")).toBe("success");
    expect(applicationStatusTone("applied")).toBe("neutral");
  });

  it("maps readiness missing to neutral guidance tone", () => {
    expect(readinessTone("ready")).toBe("success");
    expect(readinessTone("attention")).toBe("warning");
    expect(readinessTone("missing")).toBe("neutral");
  });
});
