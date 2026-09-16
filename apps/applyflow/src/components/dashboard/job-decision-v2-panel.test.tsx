import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { JobDecisionV2Panel } from "./job-decision-v2-panel";
import { JOB_DECISION_V2_TITLE } from "./job-decision-v2-content";

describe("JobDecisionV2Panel", () => {
  it("renderiza o estado de carregamento no servidor", () => {
    const html = renderToStaticMarkup(<JobDecisionV2Panel jobId="missing" />);
    expect(html).toContain("A carregar");
    expect(html).not.toContain(JOB_DECISION_V2_TITLE);
  });
});