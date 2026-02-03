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
  
  // Build optimizations
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
  
  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      config.optimization.splitChunks.cacheGroups = {
        ...config.optimization.splitChunks.cacheGroups,
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10,
        },
      };
    }
    
    // Ignore handlebars warnings
    config.module.rules.push({
      test: /\.js$/,
      include: /node_modules\/handlebars/,
      use: 'null-loader',
    });
    
    return config;
  },
};

export default nextConfig;
