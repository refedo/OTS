import { lookupSection } from './section-library'
import {
  computeSheetConversions,
  computeProfileConversions,
  computeBarKgPerLm,
  DENSITY
} from './unit-conversion'

export interface ClassificationResult {
  item_class: string
  material_nature: string
  material_category: string
  grade: string | null
  finish: string | null
  unit_of_measure: string
  bar_length_m: number | null
  profile_type: string | null
  profile_designation: string | null
  section_standard: string | null
  // Dimensional
  dim_h_mm: number | null
  dim_b_mm: number | null
  dim_tf_mm: number | null
  dim_tw_mm: number | null
  dim_r_mm: number | null
  dim_width_mm: number | null
  dim_length_mm: number | null
  dim_thickness_mm: number | null
  // Section props (from library)
  weight_kg_per_m: number | null
  area_cm2: number | null
  Ix_cm4: number | null
  Iy_cm4: number | null
  Wx_cm3: number | null
  Wy_cm3: number | null
  ix_cm: number | null
  iy_cm: number | null
  section_props_json: object | null
  // Fastener
  fastener_standard: string | null
  fastener_thread: string | null
  fastener_length_mm: number | null
  fastener_grade: string | null
  fastener_surface: string | null
  // Welding
  aws_class: string | null
  weld_process: string | null
  weld_base_material: string | null
  weld_diameter_mm: number | null
  // Conversion engine
  density_kg_m3: number
  kg_per_m2: number | null
  kg_per_lm: number | null
  unit_area_m2: number | null
  kg_per_unit: number | null
  disburse_unit: string
  unit_conversions_json: object | null
  // Manufacturer (from ref suffix)
  manufacturer: string | null
  manufacturer_ref: string | null
  // Meta
  classified_by: string
  classification_conf: number
  review_required: boolean
}

const EMPTY: ClassificationResult = {
  item_class: 'UNKNOWN', material_nature: 'UNKNOWN', material_category: 'UNKNOWN',
  grade: null, finish: null, unit_of_measure: 'PC', bar_length_m: null,
  profile_type: null, profile_designation: null, section_standard: null,
  dim_h_mm: null, dim_b_mm: null, dim_tf_mm: null, dim_tw_mm: null, dim_r_mm: null,
  dim_width_mm: null, dim_length_mm: null, dim_thickness_mm: null,
  weight_kg_per_m: null, area_cm2: null, Ix_cm4: null, Iy_cm4: null,
  Wx_cm3: null, Wy_cm3: null, ix_cm: null, iy_cm: null, section_props_json: null,
  fastener_standard: null, fastener_thread: null, fastener_length_mm: null,
  fastener_grade: null, fastener_surface: null,
  aws_class: null, weld_process: null, weld_base_material: null, weld_diameter_mm: null,
  density_kg_m3: 7850, kg_per_m2: null, kg_per_lm: null,
  unit_area_m2: null, kg_per_unit: null, disburse_unit: 'KG',
  unit_conversions_json: null,
  manufacturer: null, manufacturer_ref: null,
  classified_by: 'RULE_ENGINE', classification_conf: 0, review_required: true,
}

function parseGrade(gradeStr: string | undefined): string | null {
  if (!gradeStr) return null
  return gradeStr.replace(/-/g, '-').toUpperCase() || null
}

function densityFor(nature: string): number {
  if (nature === 'STAINLESS_STEEL')   return DENSITY.STAINLESS_STEEL
  if (nature === 'ALUMINUM')          return DENSITY.ALUMINUM
  if (nature === 'GALVANIZED_STEEL')  return DENSITY.GALVANIZED_STEEL
  return DENSITY.CARBON_STEEL
}

export function classifyProduct(ref: string, label: string): ClassificationResult {
  const r = ref.trim().toUpperCase()
  const l = label.trim()

  // ── PATTERN 1: Sheets ────────────────────────────────────────────────────
  {
    const m = r.match(/^SHE(\d+(?:\.\d+)?)X(\d+(?:\.\d+)?)X(\d+(?:\.\d+)?)(-G50|-A572-G50|-A572-S355|-S355)?$/)
    if (m) {
      const w = parseFloat(m[1]), len = parseFloat(m[2]), t = parseFloat(m[3])
      const gradeStr = m[4]
      const nature = 'CARBON_STEEL'
      const grade = gradeStr ? (gradeStr.includes('G50') ? 'A572-G50' : gradeStr.replace(/^-/,'')) : 'A36'
      const density = densityFor(nature)
      const sc = computeSheetConversions(w, len, t, density)
      return {
        ...EMPTY,
        item_class: 'RAW_MATERIAL', material_nature: nature,
        material_category: t >= 6 ? 'PLATE' : 'SHEET',
        grade, finish: 'Black Steel', unit_of_measure: 'KG',
        profile_type: t >= 6 ? 'PLATE' : 'SHEET',
        dim_width_mm: w, dim_length_mm: len, dim_thickness_mm: t,
        density_kg_m3: density,
        kg_per_m2: sc.kg_per_m2, unit_area_m2: sc.unit_area_m2,
        kg_per_unit: sc.kg_per_sheet,
        disburse_unit: 'KG',
        unit_conversions_json: sc,
        classified_by: 'RULE_ENGINE', classification_conf: 1.0, review_required: false,
      }
    }
  }

  // ── PATTERN 2: H/I Profiles from section library ─────────────────────────
  {
    const m = r.match(/^(HEA|HEB|HEM|IPE|IPO|IPN|UPN|UPE)(\d+)-(\d+(?:\.\d+)?)-(.+)$/)
    if (m) {
      const profileType = m[1], size = m[2], barLen = parseFloat(m[3])
      const grade = parseGrade(m[4])
      const designation = `${profileType} ${size}`
      const section = lookupSection(profileType, designation)
      let result: ClassificationResult = {
        ...EMPTY,
        item_class: 'RAW_MATERIAL', material_nature: 'CARBON_STEEL',
        material_category: ['HEA','HEB','HEM'].includes(profileType) ? 'PROFILE_H' :
                           ['IPE','IPO','IPN'].includes(profileType) ? 'PROFILE_I' : 'PROFILE_C',
        grade, finish: 'Black Steel', unit_of_measure: 'KG',
        profile_type: profileType as ClassificationResult['profile_type'],
        profile_designation: designation,
        section_standard: 'EN10365',
        bar_length_m: barLen,
        density_kg_m3: DENSITY.CARBON_STEEL,
        classified_by: 'RULE_ENGINE', classification_conf: 0.95, review_required: false,
      }
      if (section) {
        const pc = computeProfileConversions(section.weight_kg_per_m, barLen)
        result = {
          ...result,
          dim_h_mm: section.h_mm, dim_b_mm: section.b_mm,
          dim_tf_mm: section.tf_mm, dim_tw_mm: section.tw_mm, dim_r_mm: section.r_mm,
          weight_kg_per_m: section.weight_kg_per_m, area_cm2: section.area_cm2,
          Ix_cm4: section.Ix_cm4, Iy_cm4: section.Iy_cm4,
          Wx_cm3: section.Wx_cm3, Wy_cm3: section.Wy_cm3,
          ix_cm: section.ix_cm, iy_cm: section.iy_cm,
          section_props_json: section,
          kg_per_lm: section.weight_kg_per_m, kg_per_unit: pc.kg_per_bar,
          disburse_unit: 'KG',
          unit_conversions_json: pc,
          classification_conf: 1.0,
        }
      }
      return result
    }
  }

  // ── PATTERN 3: Heavy Hex Bolts ────────────────────────────────────────────
  {
    const m = r.match(/^HHB-(BS|GS|HDG|ZN)-?(M\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)MM-G?(\d+(?:\.\d+)?)$/)
    if (m) {
      const finishCode = m[1], thread = m[2], length = parseFloat(m[3]), grade = m[4]
      const finishMap: Record<string,string> = { BS:'Black Steel', GS:'Galvanized', HDG:'Hot-Dip Galvanized', ZN:'Zinc Plated' }
      return {
        ...EMPTY,
        item_class: 'CONSUMABLE', material_nature: 'HARDWARE',
        material_category: 'BOLT',
        grade, finish: finishMap[finishCode] ?? finishCode, unit_of_measure: 'PC',
        fastener_standard: 'DIN 6914', fastener_thread: thread,
        fastener_length_mm: length, fastener_grade: grade,
        fastener_surface: finishMap[finishCode] ?? finishCode,
        disburse_unit: 'PC',
        classified_by: 'RULE_ENGINE', classification_conf: 1.0, review_required: false,
      }
    }
  }

  // ── PATTERN 4: Heavy Hex Nuts ─────────────────────────────────────────────
  {
    const m = r.match(/^HHN-(BS|GS|HDG|ZN)-?(M\d+(?:\.\d+)?)-(.+)$/)
    if (m) {
      const thread = m[2], standard = m[3].replace(/GR\./g,'Grade ')
      return {
        ...EMPTY,
        item_class: 'CONSUMABLE', material_nature: 'HARDWARE',
        material_category: 'NUT', unit_of_measure: 'PC',
        fastener_standard: standard, fastener_thread: thread,
        fastener_grade: standard.includes('2H') ? '2H' : null,
        fastener_surface: 'Black Steel',
        disburse_unit: 'PC',
        classified_by: 'RULE_ENGINE', classification_conf: 1.0, review_required: false,
      }
    }
  }

  // ── PATTERN 5: Self-Drilling Screws ──────────────────────────────────────
  {
    const m = r.match(/^SS\w+-?(GS|BS|HDG|ZN)-M?(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)MM?$/)
    if (m) {
      return {
        ...EMPTY,
        item_class: 'CONSUMABLE', material_nature: 'HARDWARE',
        material_category: 'BOLT', unit_of_measure: 'PC',
        fastener_thread: `M${m[2]}`, fastener_length_mm: parseFloat(m[3]),
        fastener_surface: m[1] === 'GS' ? 'Galvanized' : 'Black Steel',
        disburse_unit: 'PC',
        classified_by: 'RULE_ENGINE', classification_conf: 0.90, review_required: false,
      }
    }
  }

  // ── PATTERN 6: Welding Electrodes (SMAW) ──────────────────────────────────
  {
    const m = r.match(/^WE(\w+)-E-(MS|SS|LA|AL)(\d+(?:\.\d+)?)(\w+)$/)
    if (m) {
      const awsBase = m[1], matCode = m[2], diam = parseFloat(m[3])
      const matMap: Record<string,string> = { MS:'MILD_STEEL', SS:'STAINLESS', LA:'LOW_ALLOY', AL:'ALUMINUM' }
      const awsClass = `E${awsBase}`
      const brandFromLabel = l.split(' - ').pop()?.split('-').pop()?.trim() ?? null
      return {
        ...EMPTY,
        item_class: 'CONSUMABLE', material_nature: 'WELDING_CONSUMABLE',
        material_category: 'WELDING_ELECTRODE', unit_of_measure: 'KG',
        aws_class: awsClass,
        weld_process: 'SMAW',
        weld_base_material: matMap[matCode] as ClassificationResult['weld_base_material'],
        weld_diameter_mm: diam,
        manufacturer: brandFromLabel,
        manufacturer_ref: awsClass,
        disburse_unit: 'KG',
        classified_by: 'RULE_ENGINE', classification_conf: 1.0, review_required: false,
      }
    }
  }

  // ── PATTERN 7: Welding Flux-Cored Wire ────────────────────────────────────
  {
    const m = r.match(/^WE(\w+)-FW-(MS|SS|CS|LA)(\d+(?:\.\d+)?)(\w+)$/)
    if (m) {
      const awsBase = m[1], diam = parseFloat(m[3])
      return {
        ...EMPTY,
        item_class: 'CONSUMABLE', material_nature: 'WELDING_CONSUMABLE',
        material_category: 'WELDING_WIRE_FLUX', unit_of_measure: 'KG',
        aws_class: `E${awsBase}`,
        weld_process: 'FCAW',
        weld_base_material: 'MILD_STEEL',
        weld_diameter_mm: diam,
        disburse_unit: 'KG',
        classified_by: 'RULE_ENGINE', classification_conf: 1.0, review_required: false,
      }
    }
  }

  // ── PATTERN 8: SAW Flux Wire ──────────────────────────────────────────────
  {
    const m = r.match(/^WFLUX[\w.]+-FW-(CS|MS)(\d+(?:\.\d+)?)(\w+)$/)
    if (m) {
      return {
        ...EMPTY,
        item_class: 'CONSUMABLE', material_nature: 'WELDING_CONSUMABLE',
        material_category: 'WELDING_WIRE_SOLID', unit_of_measure: 'KG',
        weld_process: 'SAW', weld_base_material: 'MILD_STEEL',
        weld_diameter_mm: parseFloat(m[2]),
        disburse_unit: 'KG',
        classified_by: 'RULE_ENGINE', classification_conf: 0.95, review_required: false,
      }
    }
  }

  // ── PATTERN 9: HX-D PPE & Accessories ────────────────────────────────────
  {
    const m = r.match(/^HX-D-(\w+)-(\w+)-(.+)$/)
    if (m) {
      const typeCode = m[1], brand = m[3]
      const weldingPPECodes = ['WG','WH','WJ','WN','WS']
      const isWeldingPPE = weldingPPECodes.includes(typeCode.toUpperCase())
      return {
        ...EMPTY,
        item_class: 'CONSUMABLE',
        material_nature: isWeldingPPE ? 'WELDING_CONSUMABLE' : 'PPE',
        material_category: isWeldingPPE ? 'WELDING_PPE' : 'SAFETY_PPE',
        unit_of_measure: 'PC',
        manufacturer: brand,
        disburse_unit: 'PC',
        classified_by: 'RULE_ENGINE', classification_conf: 0.9, review_required: false,
      }
    }
  }

  // ── PATTERN 10: Stainless Sheets ─────────────────────────────────────────
  {
    if (/STAINLESS|304SS|316SS|SS304|SS316/.test(r) && /SHE|SHEET|PLATE|PL/.test(r)) {
      const dimMatch = l.match(/(\d+(?:\.\d+)?)\s*[Xx]\s*(\d+(?:\.\d+)?)\s*[Xx]\s*(\d+(?:\.\d+)?)/)
      if (dimMatch) {
        const w = parseFloat(dimMatch[1]), len = parseFloat(dimMatch[2]), t = parseFloat(dimMatch[3])
        const sc = computeSheetConversions(w, len, t, DENSITY.STAINLESS_STEEL)
        return {
          ...EMPTY,
          item_class: 'RAW_MATERIAL', material_nature: 'STAINLESS_STEEL',
          material_category: t >= 6 ? 'PLATE' : 'SHEET',
          grade: r.includes('304') ? '304SS' : r.includes('316') ? '316SS' : null,
          unit_of_measure: 'KG',
          dim_width_mm: w, dim_length_mm: len, dim_thickness_mm: t,
          density_kg_m3: DENSITY.STAINLESS_STEEL,
          kg_per_m2: sc.kg_per_m2, unit_area_m2: sc.unit_area_m2,
          kg_per_unit: sc.kg_per_sheet, unit_conversions_json: sc,
          disburse_unit: 'KG',
          classified_by: 'RULE_ENGINE', classification_conf: 0.95, review_required: false,
        }
      }
    }
  }

  // ── FALLBACK: unmatched → queue for AI batch ──────────────────────────────
  return {
    ...EMPTY,
    classified_by: 'UNCLASSIFIED',
    classification_conf: 0,
    review_required: true,
  }
}
