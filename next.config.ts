import type { NextConfig } from "next";

const securityHeaders = [
  // Só HTTPS, por 2 anos, incluindo subdomínios
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // Ninguém embeda o app em iframe (anti-clickjacking)
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Câmera liberada para o próprio app (fotos antes/depois); resto bloqueado
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" },
  // CSP conservadora: bloqueia embeds/objetos e navegação de base sem
  // restringir scripts/styles (o Next injeta inline chunks próprios)
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'",
  },
];

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Uploads de fotos (até 12MB) e logo passam por server actions;
      // o padrao de 1MB derrubava a pagina em producao.
      bodySizeLimit: "13mb",
    },
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
