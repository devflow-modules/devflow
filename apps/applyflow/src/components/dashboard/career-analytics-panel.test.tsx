import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { CareerAnalyticsPanel } from "./career-analytics-panel";
import { CAREER_ANALYTICS_TITLE } from "./career-analytics-content";

describe("CareerAnalyticsPanel", () => {
  it("renderiza o estado de carregamento no servidor", () => {
    const html = renderToStaticMarkup(<CareerAnalyticsPanel />);
    expect(html).toContain("A carregar");
    expect(html).not.toContain(CAREER_ANALYTICS_TITLE);
  });
});
