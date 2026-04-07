import { describe, it, expect } from "vitest";
import { isSafeInternalNextPath, loginUrlWithNext } from "../safe-redirect";

describe("isSafeInternalNextPath", () => {
  it("aceita path interno simples", () => {
    expect(isSafeInternalNextPath("/dashboard")).toBe(true);
    expect(isSafeInternalNextPath("/inbox")).toBe(true);
  });

  it("aceita path com querystring", () => {
    expect(isSafeInternalNextPath("/dashboard?tab=1")).toBe(true);
    expect(isSafeInternalNextPath("/admin/conversations/abc?x=1")).toBe(true);
  });

  it("rejeita path sem barra inicial", () => {
    expect(isSafeInternalNextPath("dashboard")).toBe(false);
    expect(isSafeInternalNextPath("relative/path")).toBe(false);
  });

  it("rejeita URL absoluta", () => {
    expect(isSafeInternalNextPath("https://malicioso.com")).toBe(false);
    expect(isSafeInternalNextPath("http://evil.test/foo")).toBe(false);
  });

  it("rejeita protocol-relative", () => {
    expect(isSafeInternalNextPath("//malicioso.com")).toBe(false);
    expect(isSafeInternalNextPath("//evil/phishing")).toBe(false);
  });

  it("rejeita espaços e trimming", () => {
    expect(isSafeInternalNextPath("/foo bar")).toBe(false);
    expect(isSafeInternalNextPath(" /dashboard")).toBe(false);
    expect(isSafeInternalNextPath("/dashboard ")).toBe(false);
  });

  it("rejeita backslash e null byte", () => {
    expect(isSafeInternalNextPath("/foo\\bar")).toBe(false);
    expect(isSafeInternalNextPath("/x\0y")).toBe(false);
  });

  it("rejeita segmento com dois-pontos (open redirect / scheme)", () => {
    expect(isSafeInternalNextPath("http:path")).toBe(false);
    expect(isSafeInternalNextPath("/http:foo")).toBe(false);
  });

  it("rejeita pseudo-URL javascript: e variantes sem path absoluto interno", () => {
    expect(isSafeInternalNextPath("javascript:alert(1)")).toBe(false);
    expect(isSafeInternalNextPath("/javascript:alert(1)")).toBe(false);
  });
});

describe("loginUrlWithNext", () => {
  it("sem next devolve /login", () => {
    expect(loginUrlWithNext(undefined)).toBe("/login");
    expect(loginUrlWithNext(null)).toBe("/login");
  });

  it("com next seguro simples", () => {
    expect(loginUrlWithNext("/dashboard")).toBe("/login?next=%2Fdashboard");
  });

  it("com next seguro e querystring", () => {
    expect(loginUrlWithNext("/inbox?filter=open")).toBe(
      "/login?next=" + encodeURIComponent("/inbox?filter=open")
    );
    expect(loginUrlWithNext("/inbox?tab=1")).toBe(
      "/login?next=" + encodeURIComponent("/inbox?tab=1")
    );
  });

  it("descarta next inseguro", () => {
    expect(loginUrlWithNext("//evil.com")).toBe("/login");
    expect(loginUrlWithNext("https://x")).toBe("/login");
    expect(loginUrlWithNext("/open redirect")).toBe("/login");
  });
});
