import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dolibarr/products — List products with optional steel specs and enrichment data
 * Query params:
 *   search, profile_type, steel_grade, product_type, with_specs (1/0), page, limit
 *   item_class, material_category, review_required (1/0), enriched (1/0)
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

    // Enrichment filters
    const itemClass = searchParams.get('item_class') || '';
    const materialCategory = searchParams.get('material_category') || '';
    const enrichmentProfileType = searchParams.get('enrichment_profile_type') || '';
    const reviewRequired = searchParams.get('review_required');
    const enrichedOnly = searchParams.get('enriched') === '1';

    // Build WHERE conditions
    const conditions: string[] = ['p.is_active = 1'];
    const params: unknown[] = [];

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

    // Enrichment filters
    if (itemClass) {
      conditions.push('p.item_class = ?');
      params.push(itemClass);
    }

    if (materialCategory) {
      conditions.push('p.material_category = ?');
      params.push(materialCategory);
    }

    if (enrichmentProfileType) {
      conditions.push('p.profile_type = ?');
      params.push(enrichmentProfileType);
    }

    if (reviewRequired === '1') {
      conditions.push('p.review_required = 1');
    } else if (reviewRequired === '0') {
      conditions.push('p.review_required = 0');
    }

    if (enrichedOnly) {
      conditions.push('p.classification_conf > 0');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM dolibarr_products p
      LEFT JOIN steel_product_specs s ON s.dolibarr_product_id = p.dolibarr_id
      ${whereClause}
    `;
    const countResult: unknown[] = await prisma.$queryRawUnsafe(countQuery, ...params);
    const total = Number((countResult[0] as Record<string, unknown>)?.total) || 0;

    // Fetch products with LEFT JOIN to steel specs + enrichment columns
    const dataQuery = `
      SELECT
        p.dolibarr_id, p.ref, p.label, p.description,
        p.product_type, p.status_sell, p.status_buy,
        p.price, p.price_ttc, p.tva_tx, p.pmp, p.weight,
        p.barcode, p.is_active, p.created_at, p.updated_at,
        s.id as spec_id,
        s.steel_grade, s.grade_standard,
        s.profile_type as spec_profile_type, s.profile_size,
        s.thickness_mm, s.width_mm as spec_width_mm, s.height_mm as spec_height_mm,
        s.length_mm, s.weight_per_meter, s.weight_per_sqm,
        s.surface_finish, s.is_standard_stock,
        s.lead_time_days, s.fabrication_notes, s.welding_notes,
        p.item_class, p.material_nature, p.material_category,
        p.grade, p.finish, p.unit_of_measure,
        p.profile_type, p.profile_designation, p.section_standard, p.bar_length_m,
        p.dim_h_mm, p.dim_b_mm, p.dim_tf_mm, p.dim_tw_mm, p.dim_r_mm,
        p.dim_width_mm, p.dim_length_mm, p.dim_thickness_mm,
        p.weight_kg_per_m, p.area_cm2, p.Ix_cm4, p.Iy_cm4, p.Wx_cm3, p.Wy_cm3, p.ix_cm, p.iy_cm,
        p.section_props_json,
        p.fastener_standard, p.fastener_thread, p.fastener_length_mm, p.fastener_grade, p.fastener_surface,
        p.aws_class, p.weld_process, p.weld_base_material, p.weld_diameter_mm,
        p.density_kg_m3, p.kg_per_m2, p.kg_per_lm, p.unit_area_m2, p.kg_per_unit,
        p.disburse_unit, p.unit_conversions_json,
        p.manufacturer, p.manufacturer_ref, p.image_url, p.tds_url, p.technical_attrs_json,
        p.classified_by, p.classification_conf, p.review_required, p.enriched_at
      FROM dolibarr_products p
      LEFT JOIN steel_product_specs s ON s.dolibarr_product_id = p.dolibarr_id
      ${whereClause}
      ORDER BY p.ref ASC
      LIMIT ? OFFSET ?
    `;
    const products: unknown[] = await prisma.$queryRawUnsafe(dataQuery, ...params, limit, offset);

    // Serialize BigInt, Date, and JSON values
    const serialized = (products as Record<string, unknown>[]).map((p) => {
      const obj: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(p)) {
        if (typeof value === 'bigint') {
          obj[key] = Number(value);
        } else if (value instanceof Date) {
          obj[key] = value.toISOString();
        } else {
          obj[key] = value;
        }
      }

      // Build enrichment sub-object
      const enrichment = {
        item_class: obj.item_class,
        material_nature: obj.material_nature,
        material_category: obj.material_category,
        grade: obj.grade,
        finish: obj.finish,
        unit_of_measure: obj.unit_of_measure,
        profile_type: obj.profile_type,
        profile_designation: obj.profile_designation,
        section_standard: obj.section_standard,
        bar_length_m: obj.bar_length_m,
        dimensions: {
          h_mm: obj.dim_h_mm,
          b_mm: obj.dim_b_mm,
          tf_mm: obj.dim_tf_mm,
          tw_mm: obj.dim_tw_mm,
          r_mm: obj.dim_r_mm,
          width_mm: obj.dim_width_mm,
          length_mm: obj.dim_length_mm,
          thickness_mm: obj.dim_thickness_mm,
        },
        section_props: {
          weight_kg_per_m: obj.weight_kg_per_m,
          area_cm2: obj.area_cm2,
          Ix_cm4: obj.Ix_cm4,
          Iy_cm4: obj.Iy_cm4,
          Wx_cm3: obj.Wx_cm3,
          Wy_cm3: obj.Wy_cm3,
          ix_cm: obj.ix_cm,
          iy_cm: obj.iy_cm,
        },
        section_props_json: obj.section_props_json,
        welding: {
          aws_class: obj.aws_class,
          weld_process: obj.weld_process,
          weld_base_material: obj.weld_base_material,
          weld_diameter_mm: obj.weld_diameter_mm,
        },
        fastener: {
          standard: obj.fastener_standard,
          thread: obj.fastener_thread,
          length_mm: obj.fastener_length_mm,
          grade: obj.fastener_grade,
          surface: obj.fastener_surface,
        },
        kg_per_m2: obj.kg_per_m2,
        kg_per_lm: obj.kg_per_lm,
        unit_area_m2: obj.unit_area_m2,
        kg_per_unit: obj.kg_per_unit,
        disburse_unit: obj.disburse_unit,
        conversions: obj.unit_conversions_json,
        manufacturer: obj.manufacturer,
        manufacturer_ref: obj.manufacturer_ref,
        image_url: obj.image_url,
        tds_url: obj.tds_url,
        technical_attrs_json: obj.technical_attrs_json,
        classified_by: obj.classified_by,
        classification_conf: obj.classification_conf ? Number(obj.classification_conf) : 0,
        review_required: Boolean(obj.review_required),
        enriched_at: obj.enriched_at,
      };

      return {
        dolibarr_id: obj.dolibarr_id,
        ref: obj.ref,
        label: obj.label,
        description: obj.description,
        product_type: obj.product_type,
        status_sell: obj.status_sell,
        status_buy: obj.status_buy,
        price: obj.price,
        price_ttc: obj.price_ttc,
        tva_tx: obj.tva_tx,
        pmp: obj.pmp,
        weight: obj.weight,
        barcode: obj.barcode,
        is_active: obj.is_active,
        created_at: obj.created_at,
        updated_at: obj.updated_at,
        // Legacy steel specs
        spec_id: obj.spec_id,
        steel_grade: obj.steel_grade,
        spec_profile_type: obj.spec_profile_type,
        profile_size: obj.profile_size,
        thickness_mm: obj.thickness_mm,
        is_standard_stock: obj.is_standard_stock,
        // Enrichment
        enrichment,
      };
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
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[Dolibarr Products API] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch products' }, { status: 500 });
  }
}
