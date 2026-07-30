import { describe, expect, it } from "vitest";
import { navIsActive, normalizeNavPath } from "../nav-active";

describe("nav-active", () => {
  it("normalizeNavPath remove query, trailing slash e vazio → /", () => {
    expect(normalizeNavPath("/inbox?x=1")).toBe("/inbox");
    expect(normalizeNavPath("/settings/")).toBe("/settings");
    expect(normalizeNavPath("/")).toBe("/");
    expect(normalizeNavPath("")).toBe("/");
  });

  it("navIsActive: match exacto e prefixo em rotas filhas", () => {
    expect(navIsActive("/inbox", "/inbox")).toBe(true);
    expect(navIsActive("/inbox/abc", "/inbox")).toBe(true);
    expect(navIsActive("/queues", "/inbox")).toBe(false);
  });

  it("navIsActive: /dashboard e /settings não activam filhos", () => {
    expect(navIsActive("/dashboard", "/dashboard")).toBe(true);
    expect(navIsActive("/dashboard/ai", "/dashboard")).toBe(false);
    expect(navIsActive("/dashboard/whatsapp", "/dashboard")).toBe(false);
    expect(navIsActive("/settings", "/settings")).toBe(true);
    expect(navIsActive("/settings/developer", "/settings")).toBe(false);
    expect(navIsActive("/settings/ai", "/settings")).toBe(false);
  });

  it("navIsActive: filho de settings activa o href exacto/prefixo do filho", () => {
    expect(navIsActive("/settings/developer", "/settings/developer")).toBe(true);
    expect(navIsActive("/settings/ai/extra", "/settings/ai")).toBe(true);
  });
});
