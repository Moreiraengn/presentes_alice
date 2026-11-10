import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // obrigatório: a lista usa "use cache" (catálogo em cache, cotas sempre na hora)
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // fotos dos presentes podem vir de qualquer loja (cadastradas no /admin)
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
  turbopack: {
    // este módulo é um projeto independente (não usa o package.json da pasta de cima)
    root: __dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
