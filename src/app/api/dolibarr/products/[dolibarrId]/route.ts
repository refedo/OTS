import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dolibarr/products/[dolibarrId] — Single product with full steel specs + references
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ dolibarrId: string }> }
) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { dolibarrId } = await params;
  const id = parseInt(dolibarrId, 10);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid dolibarr ID' }, { status: 400 });

  try {
    // Fetch product with steel specs
    const products: any[] = await prisma.$queryRawUnsafe(`
      SELECT p.*, s.*
      FROM dolibarr_products p
      LEFT JOIN steel_product_specs s ON s.dolibarr_product_id = p.dolibarr_id
      WHERE p.dolibarr_id = ?
      LIMIT 1
    `, id);

    if (products.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const product = products[0];

    // If product has a steel grade, fetch grade reference
    let gradeRef = null;
    if (product.steel_grade) {
      const grades: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM steel_grade_reference WHERE grade_code = ? LIMIT 1`,
        product.steel_grade
      );
      gradeRef = grades[0] || null;
    }

    // If product has a profile size, fetch profile reference
    let profileRef = null;
    if (product.profile_type && product.profile_size) {
      const profiles: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM steel_profile_reference WHERE profile_type = ? AND profile_size = ? LIMIT 1`,
        product.profile_type, product.profile_size
      );
      profileRef = profiles[0] || null;
    }

    // Serialize BigInt and Date values
    const serialize = (obj: any) => {
      if (!obj) return null;
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'bigint') {
          result[key] = Number(value);
        } else if (value instanceof Date) {
          result[key] = value.toISOString();
        } else {
          result[key] = value;
        }
      }
      return result;
    };

    return NextResponse.json({
      product: serialize(product),
      gradeReference: serialize(gradeRef),
      profileReference: serialize(profileRef),
    });
  } catch (error: any) {
    console.error('[Dolibarr Product Detail API] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch product' }, { status: 500 });
  }
}
