import { NextResponse } from 'next/server';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  version: '13.5.0',
  date: 'February 9, 2026',
  type: 'major' as const,
  mainTitle: '🛡️ Security & Performance Major Release',
  highlights: [
    'Complete Server Security Overhaul',
    'Malware Removal & 7-Layer Protection',
    'Memory Optimization (4GB freed)',
    'PTS Sync Features & Bug Fixes',
  ],
  changes: {
    added: [
      {
        title: '🛡️ Complete Server Security Overhaul',
        items: [
          'Removed malware/cryptominer infection (EuXZqNPw process)',
          'Implemented 7-layer security protection system',
          'Added Fail2Ban with automatic IP blocking',
          'Configured Cloudflare DDoS protection',
          'Hardened SSH configuration and disabled root login',
          'Installed ClamAV antivirus with 3.6M signatures',
          'Added comprehensive firewall rules',
        ],
      },
      {
        title: '🚀 Performance & Stability Improvements',
        items: [
          'Freed 4GB RAM from malware consumption',
          'Reduced CPU usage from 96% to 0-3%',
          'Achieved 51% available memory headroom',
          'Zero crashes since security cleanup',
          'PM2 auto-restart configured every 6 hours',
          'Automated daily backups (688K DB + 26M app)',
          'Scheduled weekly virus scans',
        ],
      },
      {
        title: '🔧 PTS Sync Features',
        items: [
          'Fixed sync history not saving (added PTSSyncBatch creation)',
          'Added timeout handling for Google Sheets API (25s timeout)',
          'Implemented auto-map button for column mapping',
          'Added save/load mapping functionality with localStorage',
        ],
      },
    ],
    fixed: [
      'Session Management: Fixed logout session persistence issue',
      'Added multiple cookie domain variations for proper clearing',
      'Client-side storage clearing on login page mount',
      'Cache-busting for version API calls',
      'Fixed UpdateNotificationDialog null check error',
      'Added proper error handling for undefined mappings',
    ],
    changed: [],
  },
};

export async function GET() {
  return NextResponse.json(CURRENT_VERSION);
}
