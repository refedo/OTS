import { NextResponse } from 'next/server';
import { APP_VERSION } from '@/lib/version';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  ...APP_VERSION,
  mainTitle: 'Mobile App & Push Notifications (PWA)',
  highlights: [
    'Progressive Web App — installable on mobile devices via browser',
    'Web Push Notifications — real-time alerts even when the app is closed',
    'Per-type notification preferences — toggle push and in-app per notification type',
    'Service Worker with auto-update and smart install prompt',
  ],
  changes: {
    added: [
      'PWA Support — installable Progressive Web App with service worker, manifest, and app icons',
      'Web Push Notifications — VAPID-based push delivery to mobile and desktop browsers',
      'Push Subscription Management — subscribe/unsubscribe devices via /api/push-subscription',
      'Notification Preferences UI — per-type toggles for push and in-app notifications in Settings',
      'Service Worker Provider — auto-registration, update detection, and install prompt',
      'VAPID Key Generation Script — scripts/generate-vapid-keys.mjs',
    ],
    fixed: [],
    changed: [
      'Notification service now sends push notifications alongside in-app notifications',
      'Middleware updated to allow PWA static assets and public push endpoints',
    ],
  },
};

export async function GET() {
  return NextResponse.json(CURRENT_VERSION);
}
