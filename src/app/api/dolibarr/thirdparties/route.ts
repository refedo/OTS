import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dolibarr/thirdparties — List third parties with filters
 * Query params: search, type (customer|supplier|both), page, limit
 */
export async function GET(req: Request) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || '';
    const page = Math.max(0, parseInt(searchParams.get('page') || '0', 10));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const offset = page * limit;

    const conditions: string[] = ['is_active = 1'];
    const params: any[] = [];

    if (search) {
      conditions.push('(name LIKE ? OR name_alias LIKE ? OR email LIKE ? OR code_client LIKE ? OR code_supplier LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s, s, s);
    }

    if (type === 'customer') {
      conditions.push('client_type IN (1, 3)');
    } else if (type === 'supplier') {
      conditions.push('supplier_type = 1');
    } else if (type === 'both') {
      conditions.push('(client_type IN (1, 3) AND supplier_type = 1)');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult: any[] = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as total FROM dolibarr_thirdparties ${whereClause}`, ...params
    );
    const total = Number(countResult[0]?.total) || 0;

    const parties: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM dolibarr_thirdparties ${whereClause} ORDER BY name ASC LIMIT ? OFFSET ?`,
      ...params, limit, offset
    );

    const serialized = parties.map((p: any) => {
      const obj: any = {};
      for (const [key, value] of Object.entries(p)) {
        if (typeof value === 'bigint') obj[key] = Number(value);
        else if (value instanceof Date) obj[key] = value.toISOString();
        else obj[key] = value;
      }
      return obj;
    });

    return NextResponse.json({
      thirdparties: serialized,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    console.error('[Dolibarr ThirdParties API] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch third parties' }, { status: 500 });
  }
}
