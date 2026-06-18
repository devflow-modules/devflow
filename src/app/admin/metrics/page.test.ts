import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("/admin/metrics page", () => {
  it("declares force-dynamic so build does not query the database during static prerender", () => {
    const source = readFileSync(resolve(__dirname, "page.tsx"), "utf8");
    expect(source).toMatch(/export const dynamic = "force-dynamic"/);
  });
});
