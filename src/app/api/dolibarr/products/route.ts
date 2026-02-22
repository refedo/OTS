import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dolibarr/products — List products with optional steel specs
 * Query params: search, profile_type, steel_grade, product_type, with_specs (1/0), page, limit
 */
export async function GET(req: Request) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const profileType = searchParams.get('profile_type') || '';
    const steelGrade = searchParams.get('steel_grade') || '';
    const productType = searchParams.get('product_type');
    const withSpecs = searchParams.get('with_specs') === '1';
    const page = Math.max(0, parseInt(searchParams.get('page') || '0', 10));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const offset = page * limit;

    // Build WHERE conditions
    const conditions: string[] = ['p.is_active = 1'];
    const params: any[] = [];

    if (search) {
      conditions.push('(p.ref LIKE ? OR p.label LIKE ? OR p.description LIKE ?)');
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (productType !== null && productType !== '') {
      conditions.push('p.product_type = ?');
      params.push(parseInt(productType, 10));
    }

    if (profileType) {
      conditions.push('s.profile_type = ?');
      params.push(profileType);
    }

    if (steelGrade) {
      conditions.push('s.steel_grade = ?');
      params.push(steelGrade);
    }

    if (withSpecs) {
      conditions.push('s.id IS NOT NULL');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM dolibarr_products p
      LEFT JOIN steel_product_specs s ON s.dolibarr_product_id = p.dolibarr_id
      ${whereClause}
    `;
    const countResult: any[] = await prisma.$queryRawUnsafe(countQuery, ...params);
    const total = Number(countResult[0]?.total) || 0;

    // Fetch products with LEFT JOIN to steel specs
    const dataQuery = `
      SELECT 
        p.*,
        s.id as spec_id,
        s.steel_grade, s.grade_standard,
        s.profile_type, s.profile_size,
        s.thickness_mm, s.width_mm as spec_width_mm, s.height_mm as spec_height_mm,
        s.length_mm, s.weight_per_meter, s.weight_per_sqm,
        s.surface_finish, s.is_standard_stock,
        s.lead_time_days, s.fabrication_notes, s.welding_notes
      FROM dolibarr_products p
      LEFT JOIN steel_product_specs s ON s.dolibarr_product_id = p.dolibarr_id
      ${whereClause}
      ORDER BY p.ref ASC
      LIMIT ? OFFSET ?
    `;
    const products: any[] = await prisma.$queryRawUnsafe(dataQuery, ...params, limit, offset);

    // Serialize BigInt and Date values
    const serialized = products.map((p: any) => {
      const obj: any = {};
      for (const [key, value] of Object.entries(p)) {
        if (typeof value === 'bigint') {
          obj[key] = Number(value);
        } else if (value instanceof Date) {
          obj[key] = value.toISOString();
        } else {
          obj[key] = value;
        }
      }
      return obj;
    });

    return NextResponse.json({
      products: serialized,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('[Dolibarr Products API] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch products' }, { status: 500 });
  }
}
