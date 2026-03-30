import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { APP_VERSION } from '@/lib/version';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  ...APP_VERSION,
  mainTitle: 'Project Scope & Status Tracker',
  highlights: [
    'Project Setup Wizard supports Scope of Work per building (Steel, Sheeting, Deck Panel, Metal Work, Other) with BoQ specifications',
    'New Activities step: configure contractual activities per scope — Design, Detailing, Procurement, Production, Coating, Dispatch, Erection',
    'Project Status Tracker Dashboard: real-time visual tracker with dark/light theme, activity progress from Tasks, LCR & Production modules',
    'Scope of Work integration across Production Upload, Assembly Parts, and Project Details pages',
  ],
  changes: {
    added: [
      {
        title: 'Scope of Work System',
        items: [
          'ScopeOfWork model: multiple scopes per building (Steel, Roof Sheeting, Wall Sheeting, Deck Panel, Metal Work, Other)',
          'BuildingActivity model: configurable activities per scope with applicability rules',
          'Wizard Step 3 (Scope of Work) and Step 4 (Activities) in the project setup wizard',
          'CRUD APIs: /api/scope-of-work and /api/building-activities',
        ],
      },
      {
        title: 'Project Status Tracker Dashboard',
        items: [
          '/project-tracker with dark/light theme toggle and real-time progress tracking',
          'Progress computed from Tasks, LCR procurement, and Production Logs',
          'Summary stats, filter tabs, search, and 60s auto-refresh',
        ],
      },
      {
        title: 'Production & Project Details',
        items: [
          'Scope of Work selector on Production Upload and Assembly Parts pages',
          'BuildingScopesView component on project detail page',
        ],
      },
    ],
    fixed: [
      'Project wizard supports full 9-step flow with scope of work and activities',
    ],
    changed: [
      'Wizard restructured from 7 to 9 steps with dedicated Scope of Work and Activities steps',
      'RBAC: project_tracker.view and project_tracker.export permissions added',
      'Navigation: Project Status Tracker link in sidebar',
    ],
  },
};

export async function GET(_req: NextRequest) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;

  let alreadySeen = false;
  if (session) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: session.sub },
        select: { customPermissions: true },
      });
      const perms = user?.customPermissions as Record<string, unknown> | null;
      if (perms?.lastSeenVersion === CURRENT_VERSION.version) {
        alreadySeen = true;
      }
    } catch {
      // Non-critical; fall back to client-side check
    }
  }

  return NextResponse.json({ ...CURRENT_VERSION, alreadySeen });
}
