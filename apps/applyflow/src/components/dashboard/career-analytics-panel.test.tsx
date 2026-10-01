// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";

import { CareerAnalyticsPanel } from "./career-analytics-panel";
import { testBootstrapV1 } from "./test-persistence-bootstrap";
import { CAREER_ANALYTICS_EMPTY, CAREER_ANALYTICS_TITLE } from "./career-analytics-content";

afterEach(() => {
  window.localStorage.clear();
  cleanup();
});

describe("CareerAnalyticsPanel", () => {
  it("renderiza o estado de carregamento no servidor", () => {
    const html = renderToStaticMarkup(<CareerAnalyticsPanel persistenceBootstrap={testBootstrapV1} />);
    expect(html).toContain("A carregar");
    expect(html).not.toContain(CAREER_ANALYTICS_TITLE);
  });

  it("lê o armazenamento local só depois da hidratação", () => {
    render(<CareerAnalyticsPanel persistenceBootstrap={testBootstrapV1} />);
    expect(screen.getByText(CAREER_ANALYTICS_TITLE)).toBeTruthy();
    expect(screen.getByText(CAREER_ANALYTICS_EMPTY)).toBeTruthy();
    expect(screen.getByTestId("analytics-empty-cta")).toBeTruthy();
    expect(screen.queryByText("A carregar…")).toBeNull();
  });
});
