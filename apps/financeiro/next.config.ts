import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@devflow/ui", "@devflow/financeiro-routes"],
};

export default nextConfig;
