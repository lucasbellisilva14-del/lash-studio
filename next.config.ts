import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Uploads de fotos (até 12MB) e logo passam por server actions;
      // o padrão de 1MB derrubava a página em produção.
      bodySizeLimit: "13mb",
    },
  },
};

export default nextConfig;
