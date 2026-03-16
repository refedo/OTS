import { NextResponse } from 'next/server';

export async function GET() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

  const manifest = {
    name: 'Hexa Steel\u00ae OTS',
    short_name: 'OTS',
    description: 'Hexa Steel\u00ae Operations Tracking System - Enterprise ERP for steel fabrication',
    start_url: `${basePath}/`,
    scope: `${basePath}/`,
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#0f172a',
    orientation: 'any',
    icons: [
      {
        src: `${basePath}/icons/icon-192x192.png`,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: `${basePath}/icons/icon-512x512.png`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
    categories: ['business', 'productivity'],
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
