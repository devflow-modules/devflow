import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { DashboardJobUrlCell } from "./dashboard-job-url-cell";

describe("DashboardJobUrlCell", () => {
  it("não transforma javascript: nem URL inválida em link", () => {
    expect(renderToStaticMarkup(<DashboardJobUrlCell url="javascript:alert(1)" />)).toBe("—");
    expect(renderToStaticMarkup(<DashboardJobUrlCell url="not-a-url" />)).toBe("—");
    expect(renderToStaticMarkup(<DashboardJobUrlCell url="/jobs/local" />)).toBe("—");
  });

  it("mantém http(s) como link abrir", () => {
    const html = renderToStaticMarkup(<DashboardJobUrlCell url="https://example.com/jobs/1" />);
    expect(html).toContain("href=\"https://example.com/jobs/1\"");
    expect(html).toContain("abrir");
  });
});
