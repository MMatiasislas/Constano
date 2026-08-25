import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Las Server Actions de alta/edición de alumnos reciben la foto (hasta
      // 5MB) directo como File; el default de Next (1mb) se queda corto.
      bodySizeLimit: "6mb",
    },
  },
  // @react-pdf/renderer trae dependencias nativas de Node (fontkit, png-js) que
  // el bundler de Next rompe si intenta empaquetarlas para el edge/cliente.
  // Esto le dice a Next que la deje tal cual y la resuelva como un módulo de
  // Node normal en tiempo de ejecución (solo se usa en Server Actions).
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
