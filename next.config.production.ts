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
  
  // Cache headers to prevent stale chunk references
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  
  // Turbopack for development
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
