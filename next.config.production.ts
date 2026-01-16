import type { NextConfig } from "next";

// Production configuration for deployment to hexasteel.sa/ots
const nextConfig: NextConfig = {
  // Base path for subdirectory deployment
  basePath: process.env.NODE_ENV === 'production' ? '/ots' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/ots' : '',
  
  // Trailing slash for better routing
  trailingSlash: true,
  
  // Standalone output for production
  output: 'standalone',
  
  // Image optimization with base path
  images: {
    path: process.env.NODE_ENV === 'production' ? '/ots/_next/image' : '/_next/image',
  },
  
  // Turbopack for development
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
