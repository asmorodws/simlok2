import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Performance Optimizations */
  compress: true,  // Enable gzip compression
  
  /* Image Optimization */
  images: {
    formats: ['image/avif', 'image/webp'],  // Modern image formats
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.w3schools.com',
        pathname: '/howto/**',
      },
    ],
  },
  
  /* TypeScript Configuration */
  typescript: {
    // ✅ FIXED: Enforce type safety in production
    ignoreBuildErrors: false,
  },
  
  /* Bundle Optimization */
  experimental: {
    optimizeCss: true,  // Optimize CSS
    optimizePackageImports: ['@heroicons/react', 'date-fns', 'react-hot-toast'],  // Tree-shake large packages
  },
  
  /* Optional: Bundle Analyzer Support */
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config: any) => {
      if (typeof require !== 'undefined') {
        const BundleAnalyzerPlugin = require('@next/bundle-analyzer')({
          enabled: true,
        });
        config.plugins.push(new BundleAnalyzerPlugin());
      }
      return config;
    },
  }),
};

export default nextConfig;
