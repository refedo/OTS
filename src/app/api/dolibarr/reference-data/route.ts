import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dolibarr/reference-data — Returns steel grades and profile types for dropdowns
 */
export async function GET() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const grades: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM steel_grade_reference ORDER BY grade_code ASC`
    );

    const profiles: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM steel_profile_reference ORDER BY profile_type ASC, height_mm ASC`
    );

    // Get distinct profile types for dropdown
    const profileTypes: any[] = await prisma.$queryRawUnsafe(
      `SELECT DISTINCT profile_type FROM steel_profile_reference ORDER BY profile_type ASC`
    );

    // Surface finish options
    const surfaceFinishes = [
      'Hot-Rolled', 'Cold-Rolled', 'Galvanized', 'Painted', 'Blasted',
    ];

    const serialize = (arr: any[]) => arr.map((item: any) => {
      const obj: any = {};
      for (const [key, value] of Object.entries(item)) {
        if (typeof value === 'bigint') obj[key] = Number(value);
        else if (value instanceof Date) obj[key] = value.toISOString();
        else obj[key] = value;
      }
      return obj;
    });

    return NextResponse.json({
      grades: serialize(grades),
      profiles: serialize(profiles),
      profileTypes: profileTypes.map((p: any) => p.profile_type),
      surfaceFinishes,
    });
  } catch (error: any) {
    console.error('[Reference Data API] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch reference data' }, { status: 500 });
  }
}
