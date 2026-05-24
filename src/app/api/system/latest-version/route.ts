import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { version: pkgVersion } = require('../../../../../package.json') as { version: string };

const CURRENT_VERSION = {
  version: pkgVersion,
  date: 'May 24, 2026',
  type: 'major' as const,
  mainTitle: 'Inventory & Warehouse Management Module',
  highlights: [
    'New INV module: full end-to-end inventory and warehouse management for Factory 001 and Factory 003.',
    'Material Issue Requests (MIR-OUT): two-path workflow — Raw Material issues directly, Consumables require approval chain (Foreman → Production Engineer → Storekeeper).',
    'Material Returns: unused stock back to Raw Material Warehouse; off-cuts locked to the Off-cuts Warehouse with mandatory description.',
    'Stock Adjustments: physical count vs. system reconciliation with authorized variance posting.',
    'Immutable Stock Ledger: every IN/OUT movement recorded with full traceability — reference, actor, balance after.',
    'Six seeded warehouses (RM, CM, OC) for both factories; seven seeded production locations.',
    'Six new INV permissions: inv.view, inv.request, inv.approve, inv.issue, inv.adjust, inv.admin.',
    'MIR-OUT numbers: MIR-OUT-YYYY-NNNN; Return numbers: RET-YYYY-NNNN; Adjustment numbers: ADJ-YYYY-NNNN.',
  ],
  changes: {
    added: [
      'INV module: Dashboard (/inv) with live KPI cards, low-stock alerts, warehouse bar chart.',
      'INV module: Stock Levels (/inv/stock) — per-warehouse balance table with slide-over ledger drawer and Excel export.',
      'INV module: Material Issues (/inv/mir-out) — paginated MIR-OUT list with status badges and filters.',
      'INV module: New MIR-OUT (/inv/mir-out/new) — two-step form with live balance fetch and auto-suggest warehouse.',
      'INV module: MIR-OUT Detail (/inv/mir-out/[id]) — status timeline, line items, Approve/Issue/Reject action bar.',
      'INV module: Returns (/inv/returns) — list and HEXA-FRM-030 return form.',
      'INV module: Ledger (/inv/ledger) — immutable full-history ledger with filters and Excel export.',
      'INV module: Settings (/inv/settings) — Items, Warehouses, Locations CRUD via Dialog modals.',
      'API: /api/inv/items, /api/inv/warehouses, /api/inv/locations (GET + POST + PUT).',
      'API: /api/inv/balance — real-time stock balances with low-stock flag.',
      'API: /api/inv/ledger — paginated ledger with 6 filter dimensions.',
      'API: /api/inv/mir-out and action sub-routes (submit, approve, issue, reject).',
      'API: /api/inv/returns and action sub-routes (receive, reject).',
      'API: /api/inv/adjustments — create and apply stock adjustments atomically.',
      'API: /api/inv/internal/stock-in — internal hook called by the MIR module on receipt confirmation.',
      'Services: inv-sequence.service (sequence number generation), inv-stock.service (atomic stock operations), inv-stubs.service (BOM/Finance stubs).',
      'Prisma schema: 9 new models (InvWarehouse, InvLocation, InvItem, InvStockBalance, InvStockLedger, InvMirOut, InvMirOutLine, InvReturn, InvAdjustment) and 8 new enums.',
      'SQL migration v36_0_inv_warehouse_management: full DDL with seed data for warehouses and locations.',
      '6 new INV permissions added to permissions.ts and navigation-permissions.ts.',
      'Sidebar: new Inventory section with 6 navigation items.',
    ],
    fixed: [],
    changed: [],
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
