import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { APP_VERSION } from '@/lib/version';

const CURRENT_VERSION = {
  ...APP_VERSION,
  mainTitle: 'HR Letter Enhancements — CEO Approval, Per-Type Serials, Bilingual Print',
  highlights: [
    'CEO approval cycle: every issued letter goes to PENDING_CEO — CEO receives a push notification and can approve or reject with a reason; HR creator is notified of the decision.',
    'Per-type serial numbers: configure a prefix and mask per letter type (QST-26-0001, FW1-26-0001, …) in HR Setup → Letter Serials. Yearly counter reset optional.',
    'Bilingual print page: open any letter at /hr/letters/[id]/print — switch between Arabic (RTL), English (LTR), or Bilingual layout; prints to A4 PDF via browser natively.',
    'Letters tab on the employee card: every letter issued to an employee now appears under a new Letters tab with status badges, approval detail, and an inline print button.',
    'HR Setup → Letter Serials tab: full config UI for per-type serial numbers — add, edit, reset counter, delete.',
    'Approved letters are locked: editing or deleting an APPROVED letter returns 422.',
  ],
  changes: {
    added: [
      'HrLetterSerialConfig table: per-type prefix, mask, currentSeq, resetYearly — atomic increment inside letter-creation transaction',
      'POST /api/hr/letters/[id]/approve — CEO approval route; notifies HR creator on success',
      'POST /api/hr/letters/[id]/reject — CEO rejection route with mandatory reason; notifies HR creator',
      'GET/POST /api/hr/letter-serial-configs — CRUD for serial configs',
      'PUT/DELETE /api/hr/letter-serial-configs/[id] — edit prefix/mask/resetYearly, reset counter, delete',
      'hr.letters.approveCeo permission — CEO-only letter sign-off',
      'HrLetterStatus enum: DRAFT | PENDING_CEO | APPROVED | REJECTED',
      'HrLetterLanguage enum: ARABIC | ENGLISH | BILINGUAL',
      '/hr/letters/[id]/print — bilingual A4 print page with language switcher (Arabic RTL / English LTR / Bilingual)',
      'EmployeeLettersTab: Letters tab on /hr/employees/[id] — KPI strip, expandable letter rows, approval/rejection detail, print button',
      'LetterSerialsSetupTab: new HR Setup tab with add/edit/reset/delete UI for per-type serial configs and live number preview',
      'Startup migration: add_hr_letter_enhancements.sql',
    ],
    fixed: [
      'PUT /api/hr/letters/[id]: approved letters now return 422 instead of silently accepting edits',
      'DELETE /api/hr/letters/[id]: approved letters now return 422 instead of silently deleting',
    ],
    changed: [
      'POST /api/hr/letters: uses HrLetterSerialConfig when available; status defaults to PENDING_CEO; notifies CEO approvers',
      'GET /api/hr/letters: returns status, language, approvedBy, rejectedBy, timestamps, employee.fullNameAr/department/occupation; supports ?status= filter',
      'Version bumped to 19.4.2',
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
