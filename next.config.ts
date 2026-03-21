import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@devflow/ui", "@devflow/whatsapp-core", "@devflow/ai-core"],
  async redirects() {
    return [
      {
        source: "/segmentos/tabacarias",
        destination: "/automacao-whatsapp-tabacaria",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
