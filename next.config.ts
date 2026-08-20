import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Las Server Actions de alta/edición de alumnos reciben la foto (hasta
      // 5MB) directo como File; el default de Next (1mb) se queda corto.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
