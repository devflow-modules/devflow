import type { NextConfig } from "next";

/**
 * Headers de segurança globais.
 * CSP mínima: `frame-ancestors` + `base-uri` — não define `script-src`/`default-src`
 * para não quebrar Next.js (scripts inline/hydration). Endurecimento extra via
 * X-Frame-Options e nosniff. HSTS recomendado no reverse proxy (TLS).
 */
const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'self'; base-uri 'self'",
  },
];

const nextConfig: NextConfig = {
  transpilePackages: ["@devflow/ui"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
