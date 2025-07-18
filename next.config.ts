import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Configuración para manejar jsPDF
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        buffer: false,
        crypto: false,
        stream: false,
        util: false,
        assert: false,
        http: false,
        https: false,
        os: false,
        url: false,
        zlib: false,
      };
    }
    
    return config;
  },
  // Configuración para optimizar chunks - deshabilitado por error de build
  // experimental: {
  //   optimizeCss: true,
  // },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
