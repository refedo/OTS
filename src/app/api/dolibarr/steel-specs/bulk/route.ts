import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const bulkSpecSchema = z.object({
  match_field: z.enum(['ref', 'label']),
  match_pattern: z.string().min(1).max(255),
  specs: z.object({
    steel_grade: z.string().max(50).nullable().optional(),
    grade_standard: z.string().max(50).nullable().optional(),
    profile_type: z.string().max(50).nullable().optional(),
    profile_size: z.string().max(50).nullable().optional(),
    thickness_mm: z.number().nullable().optional(),
    width_mm: z.number().nullable().optional(),
    height_mm: z.number().nullable().optional(),
    length_mm: z.number().nullable().optional(),
    weight_per_meter: z.number().nullable().optional(),
    surface_finish: z.string().max(50).nullable().optional(),
    is_standard_stock: z.boolean().optional(),
    lead_time_days: z.number().int().nullable().optional(),
    fabrication_notes: z.string().nullable().optional(),
    welding_notes: z.string().nullable().optional(),
  }),
  preview: z.boolean().optional(),
});

/**
 * POST /api/dolibarr/steel-specs/bulk — Bulk assign specs by pattern matching
 * Body: { match_field, match_pattern, specs, preview? }
 */
export async function POST(req: Request) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = bulkSpecSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 });
    }

    const { match_field, match_pattern, specs, preview } = parsed.data;

    // Find matching products
    const column = match_field === 'ref' ? 'ref' : 'label';
    const matchedProducts: any[] = await prisma.$queryRawUnsafe(
      `SELECT dolibarr_id, ref, label FROM dolibarr_products WHERE is_active = 1 AND ${column} LIKE ?`,
      `%${match_pattern}%`
    );

    if (preview) {
      return NextResponse.json({
        matchCount: matchedProducts.length,
        matchedProducts: matchedProducts.map((p: any) => ({
          dolibarr_id: Number(p.dolibarr_id),
          ref: p.ref,
          label: p.label,
        })),
      });
    }

    // Apply specs to all matched products
    let applied = 0;
    for (const product of matchedProducts) {
      const dolibarrId = Number(product.dolibarr_id);

      await prisma.$executeRawUnsafe(`
        INSERT INTO steel_product_specs (
          dolibarr_product_id, steel_grade, grade_standard,
          profile_type, profile_size,
          thickness_mm, width_mm, height_mm, length_mm,
          weight_per_meter, surface_finish,
          is_standard_stock, lead_time_days,
          fabrication_notes, welding_notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          steel_grade = COALESCE(VALUES(steel_grade), steel_grade),
          grade_standard = COALESCE(VALUES(grade_standard), grade_standard),
          profile_type = COALESCE(VALUES(profile_type), profile_type),
          profile_size = COALESCE(VALUES(profile_size), profile_size),
          thickness_mm = COALESCE(VALUES(thickness_mm), thickness_mm),
          width_mm = COALESCE(VALUES(width_mm), width_mm),
          height_mm = COALESCE(VALUES(height_mm), height_mm),
          length_mm = COALESCE(VALUES(length_mm), length_mm),
          weight_per_meter = COALESCE(VALUES(weight_per_meter), weight_per_meter),
          surface_finish = COALESCE(VALUES(surface_finish), surface_finish),
          is_standard_stock = COALESCE(VALUES(is_standard_stock), is_standard_stock),
          lead_time_days = COALESCE(VALUES(lead_time_days), lead_time_days),
          fabrication_notes = COALESCE(VALUES(fabrication_notes), fabrication_notes),
          welding_notes = COALESCE(VALUES(welding_notes), welding_notes),
          updated_at = NOW()
      `,
        dolibarrId,
        specs.steel_grade ?? null, specs.grade_standard ?? null,
        specs.profile_type ?? null, specs.profile_size ?? null,
        specs.thickness_mm ?? null, specs.width_mm ?? null,
        specs.height_mm ?? null, specs.length_mm ?? null,
        specs.weight_per_meter ?? null, specs.surface_finish ?? null,
        specs.is_standard_stock ? 1 : 0, specs.lead_time_days ?? null,
        specs.fabrication_notes ?? null, specs.welding_notes ?? null
      );
      applied++;
    }

    return NextResponse.json({
      success: true,
      applied,
      matchCount: matchedProducts.length,
    });
  } catch (error: any) {
    console.error('[Bulk Steel Specs API] Error:', error);
    return NextResponse.json({ error: error.message || 'Bulk operation failed' }, { status: 500 });
  }
}
