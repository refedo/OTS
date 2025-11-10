import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Base path for subdirectory deployment (hexasteel.sa/ots)
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || '',
  
  // Disable strict linting during production build
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Disable TypeScript errors during build
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Image optimization with base path
  images: {
    path: process.env.NEXT_PUBLIC_BASE_PATH 
      ? `${process.env.NEXT_PUBLIC_BASE_PATH}/_next/image` 
      : '/_next/image',
  },
  
  // Turbopack for development
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
