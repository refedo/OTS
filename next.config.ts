import type { NextConfig } from "next";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { version: packageVersion } = require('./package.json') as { version: string };

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: packageVersion,
  },
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
  
  // Turbopack configuration
  turbopack: {
    root: __dirname,
  },
  
  // Keep heavy server-only packages out of the webpack bundle
  serverExternalPackages: ['puppeteer'],

  // Build optimizations
  experimental: {
    // Disable CSS optimization to avoid critters module error
    optimizeCss: false,
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  compress: true,

  // Webpack config — only applies when NOT using --turbopack
  webpack: (config, { isServer }) => {
    // Ignore handlebars warnings
    config.module.rules.push({
      test: /\.js$/,
      include: /node_modules\/handlebars/,
      resolve: { fullySpecified: false },
    });
    return config;
  },
};

export default nextConfig;
