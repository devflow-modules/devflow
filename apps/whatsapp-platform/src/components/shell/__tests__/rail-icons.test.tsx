import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { navPlatformItemsForRole } from "../nav-config";
import { RailIcon, railIconKey } from "../rail-icons";

const ADMIN_PLATFORM_HREFS = [
  "/admin/metrics",
  "/admin/billing",
  "/admin/affiliates",
  "/admin/tenants",
  "/admin/agents",
  "/admin/conversations",
  "/admin/whatsapp",
] as const;

describe("rail-icons (SB-10)", () => {
  it("as sete rotas /admin/* têm keys distintas e nunca generic", () => {
    const keys = ADMIN_PLATFORM_HREFS.map((href) => railIconKey(href));
    expect(keys).toEqual([
      "admin-metrics",
      "admin-billing",
      "admin-affiliates",
      "admin-tenants",
      "admin-agents",
      "admin-conversations",
      "admin-whatsapp",
    ]);
    expect(new Set(keys).size).toBe(7);
    for (const key of keys) {
      expect(key).not.toBe("generic");
      expect(key.startsWith("admin-")).toBe(true);
    }
  });

  it("toda platformOnly de ROUTE_META tem ícone admin distinto (sem generic)", () => {
    const items = navPlatformItemsForRole("platform_admin");
    expect(items.map((i) => i.href)).toEqual([...ADMIN_PLATFORM_HREFS]);
    const keys = items.map((i) => railIconKey(i.href));
    expect(new Set(keys).size).toBe(items.length);
    expect(keys.every((k) => k !== "generic" && k !== "admin-fallback")).toBe(true);
  });

  it("rota /admin desconhecida não cai no ícone generic", () => {
    expect(railIconKey("/admin/unknown-future")).toBe("admin-fallback");
    expect(railIconKey("/admin/unknown-future")).not.toBe("generic");
  });

  it("rotas não administrativas preservam keys estáveis", () => {
    expect(railIconKey("/inbox")).toBe("inbox");
    expect(railIconKey("/dashboard")).toBe("dashboard");
    expect(railIconKey("/billing")).toBe("billing");
    expect(railIconKey("/agents")).toBe("agents");
    expect(railIconKey("/distribuir")).toBe("distribuir");
  });

  it("RailIcon marca data-rail-icon distinto por rota admin", () => {
    const seen = new Set<string>();
    for (const href of ADMIN_PLATFORM_HREFS) {
      const { container } = render(<RailIcon href={href} />);
      const svg = container.querySelector("svg[data-rail-icon]");
      expect(svg).toBeTruthy();
      const id = svg!.getAttribute("data-rail-icon");
      expect(id).toBe(railIconKey(href));
      expect(seen.has(id!)).toBe(false);
      seen.add(id!);
    }
    expect(seen.size).toBe(7);
  });
});
