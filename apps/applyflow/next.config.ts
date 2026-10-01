import type { NextConfig } from "next";

/**
 * Baseline security headers (closed beta).
 * Minimal CSP: frame-ancestors + base-uri only — no script-src (avoids breaking Next hydration).
 * Strict CSP deferred to Phase 9D.
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
  transpilePackages: ["@devflow/applyflow-core", "@devflow/career-core"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
