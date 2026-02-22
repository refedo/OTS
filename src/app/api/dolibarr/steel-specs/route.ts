import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const steelSpecSchema = z.object({
  dolibarr_product_id: z.number().int().positive(),
  steel_grade: z.string().max(50).nullable().optional(),
  grade_standard: z.string().max(50).nullable().optional(),
  profile_type: z.string().max(50).nullable().optional(),
  profile_size: z.string().max(50).nullable().optional(),
  thickness_mm: z.number().nullable().optional(),
  width_mm: z.number().nullable().optional(),
  height_mm: z.number().nullable().optional(),
  length_mm: z.number().nullable().optional(),
  outer_diameter_mm: z.number().nullable().optional(),
  inner_diameter_mm: z.number().nullable().optional(),
  wall_thickness_mm: z.number().nullable().optional(),
  web_thickness_mm: z.number().nullable().optional(),
  flange_thickness_mm: z.number().nullable().optional(),
  flange_width_mm: z.number().nullable().optional(),
  weight_per_meter: z.number().nullable().optional(),
  weight_per_sqm: z.number().nullable().optional(),
  yield_strength_mpa: z.number().nullable().optional(),
  tensile_strength_mpa: z.number().nullable().optional(),
  elongation_pct: z.number().nullable().optional(),
  surface_finish: z.string().max(50).nullable().optional(),
  coating_type: z.string().max(100).nullable().optional(),
  coating_thickness_um: z.number().nullable().optional(),
  is_standard_stock: z.boolean().optional(),
  preferred_supplier_id: z.number().int().nullable().optional(),
  lead_time_days: z.number().int().nullable().optional(),
  min_order_qty: z.number().nullable().optional(),
  fabrication_notes: z.string().nullable().optional(),
  welding_notes: z.string().nullable().optional(),
});

/**
 * POST /api/dolibarr/steel-specs — Add/update steel specs for a single product
 */
export async function POST(req: Request) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = steelSpecSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 });
    }

    const data = parsed.data;

    // Verify the product exists in mirror table
    const productCheck: any[] = await prisma.$queryRawUnsafe(
      `SELECT dolibarr_id FROM dolibarr_products WHERE dolibarr_id = ?`,
      data.dolibarr_product_id
    );
    if (productCheck.length === 0) {
      return NextResponse.json({ error: 'Product not found in Dolibarr mirror' }, { status: 404 });
    }

    // Upsert steel specs
    await prisma.$executeRawUnsafe(`
      INSERT INTO steel_product_specs (
        dolibarr_product_id, steel_grade, grade_standard,
        profile_type, profile_size,
        thickness_mm, width_mm, height_mm, length_mm,
        outer_diameter_mm, inner_diameter_mm, wall_thickness_mm,
        web_thickness_mm, flange_thickness_mm, flange_width_mm,
        weight_per_meter, weight_per_sqm,
        yield_strength_mpa, tensile_strength_mpa, elongation_pct,
        surface_finish, coating_type, coating_thickness_um,
        is_standard_stock, preferred_supplier_id, lead_time_days, min_order_qty,
        fabrication_notes, welding_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        steel_grade = VALUES(steel_grade), grade_standard = VALUES(grade_standard),
        profile_type = VALUES(profile_type), profile_size = VALUES(profile_size),
        thickness_mm = VALUES(thickness_mm), width_mm = VALUES(width_mm),
        height_mm = VALUES(height_mm), length_mm = VALUES(length_mm),
        outer_diameter_mm = VALUES(outer_diameter_mm), inner_diameter_mm = VALUES(inner_diameter_mm),
        wall_thickness_mm = VALUES(wall_thickness_mm),
        web_thickness_mm = VALUES(web_thickness_mm), flange_thickness_mm = VALUES(flange_thickness_mm),
        flange_width_mm = VALUES(flange_width_mm),
        weight_per_meter = VALUES(weight_per_meter), weight_per_sqm = VALUES(weight_per_sqm),
        yield_strength_mpa = VALUES(yield_strength_mpa), tensile_strength_mpa = VALUES(tensile_strength_mpa),
        elongation_pct = VALUES(elongation_pct),
        surface_finish = VALUES(surface_finish), coating_type = VALUES(coating_type),
        coating_thickness_um = VALUES(coating_thickness_um),
        is_standard_stock = VALUES(is_standard_stock), preferred_supplier_id = VALUES(preferred_supplier_id),
        lead_time_days = VALUES(lead_time_days), min_order_qty = VALUES(min_order_qty),
        fabrication_notes = VALUES(fabrication_notes), welding_notes = VALUES(welding_notes),
        updated_at = NOW()
    `,
      data.dolibarr_product_id,
      data.steel_grade ?? null, data.grade_standard ?? null,
      data.profile_type ?? null, data.profile_size ?? null,
      data.thickness_mm ?? null, data.width_mm ?? null, data.height_mm ?? null, data.length_mm ?? null,
      data.outer_diameter_mm ?? null, data.inner_diameter_mm ?? null, data.wall_thickness_mm ?? null,
      data.web_thickness_mm ?? null, data.flange_thickness_mm ?? null, data.flange_width_mm ?? null,
      data.weight_per_meter ?? null, data.weight_per_sqm ?? null,
      data.yield_strength_mpa ?? null, data.tensile_strength_mpa ?? null, data.elongation_pct ?? null,
      data.surface_finish ?? null, data.coating_type ?? null, data.coating_thickness_um ?? null,
      data.is_standard_stock ? 1 : 0, data.preferred_supplier_id ?? null,
      data.lead_time_days ?? null, data.min_order_qty ?? null,
      data.fabrication_notes ?? null, data.welding_notes ?? null
    );

    return NextResponse.json({ success: true, message: 'Steel specs saved' });
  } catch (error: any) {
    console.error('[Steel Specs API] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to save steel specs' }, { status: 500 });
  }
}
