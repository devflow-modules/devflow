import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
