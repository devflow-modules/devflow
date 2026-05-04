import { describe, it, expect } from "vitest";
import {
  isSafeInternalNextPath,
  isTrustedStripeCheckoutRedirectUrl,
  loginUrlWithNext,
  resolveSignupClientNavigationHref,
} from "../safe-redirect";

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

  it("alinha com guards admin: paths /admin internos incluem next na query", () => {
    expect(loginUrlWithNext("/admin/agents")).toBe(
      "/login?next=" + encodeURIComponent("/admin/agents")
    );
    expect(loginUrlWithNext("/admin/metrics")).toBe(
      "/login?next=" + encodeURIComponent("/admin/metrics")
    );
  });
});

describe("isTrustedStripeCheckoutRedirectUrl", () => {
  it("aceita apenas https em checkout.stripe.com", () => {
    expect(
      isTrustedStripeCheckoutRedirectUrl("https://checkout.stripe.com/c/pay/cs_test_abc")
    ).toBe(true);
    expect(isTrustedStripeCheckoutRedirectUrl("http://checkout.stripe.com/c/pay/x")).toBe(false);
    expect(isTrustedStripeCheckoutRedirectUrl("https://evil.com/c/pay/x")).toBe(false);
    expect(isTrustedStripeCheckoutRedirectUrl("https://checkout.stripe.com.evil.com/x")).toBe(false);
    expect(isTrustedStripeCheckoutRedirectUrl("not-a-url")).toBe(false);
  });
});

describe("resolveSignupClientNavigationHref", () => {
  it("usa redirectUrl só quando for checkout Stripe", () => {
    const stripe = "https://checkout.stripe.com/c/pay/cs_live_123";
    expect(resolveSignupClientNavigationHref({ redirectUrl: stripe })).toBe(stripe);
    expect(
      resolveSignupClientNavigationHref({
        redirectUrl: "https://evil.com/phish",
        redirectTo: "/onboarding",
      })
    ).toBe("/onboarding");
    expect(
      resolveSignupClientNavigationHref({
        redirectUrl: "https://evil.com/phish",
        redirectTo: "/inbox",
      })
    ).toBe("/inbox");
  });

  it("usa redirectTo interno seguro ou cai em /onboarding", () => {
    expect(resolveSignupClientNavigationHref({ redirectTo: "/onboarding" })).toBe("/onboarding");
    expect(resolveSignupClientNavigationHref({ redirectTo: "/inbox?x=1" })).toBe("/inbox?x=1");
    expect(resolveSignupClientNavigationHref({ redirectTo: "//evil.com" })).toBe("/onboarding");
    expect(resolveSignupClientNavigationHref({ redirectTo: "https://evil.com" })).toBe("/onboarding");
    expect(resolveSignupClientNavigationHref({})).toBe("/onboarding");
  });
});
