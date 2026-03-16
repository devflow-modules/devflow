import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@devflow/ui"],
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
