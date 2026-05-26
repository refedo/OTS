// ============================================================
// Unit Conversion Engine — Material Master Enrichment
// Pure math, no side effects, no DB access.
// All inputs in mm unless noted. Density in kg/m³.
// ============================================================

// ── Density constants (kg/m³) ────────────────────────────────────────────
export const DENSITY = {
  CARBON_STEEL:     7850,
  STAINLESS_STEEL:  7930,
  ALUMINUM:         2700,
  GALVANIZED_STEEL: 7870,
  DEFAULT:          7850,
} as const

export type MaterialNature =
  | keyof typeof DENSITY
  | 'HARDWARE'
  | 'WELDING_CONSUMABLE'
  | 'CHEMICAL'
  | 'PPE'
  | 'GAS'
  | 'ELECTRICAL'
  | 'SERVICE'
  | 'OTHER'
  | 'UNKNOWN'

// ── Sheet / Plate Conversions ────────────────────────────────────────────
export interface SheetConversions {
  /** kg per 1 m² of this sheet */
  kg_per_m2: number
  /** m² per metric ton */
  m2_per_ton: number
  /** kg for one standard unit (width × length) */
  kg_per_sheet: number
  /** how many sheets per ton */
  sheets_per_ton: number
  /** area of one sheet in m² */
  unit_area_m2: number
}

/**
 * Compute sheet conversions from physical dimensions.
 *
 * @param widthMm      - Sheet width in mm
 * @param lengthMm     - Sheet length in mm
 * @param thicknessMm  - Sheet thickness in mm
 * @param densityKgM3  - Material density kg/m³ (default 7850 carbon steel)
 *
 * Formulas:
 *   kg_per_m2    = density × (thickness / 1000)
 *   unit_area_m2 = (width / 1000) × (length / 1000)
 *   kg_per_sheet = unit_area_m2 × kg_per_m2
 *   m2_per_ton   = 1000 / kg_per_m2
 *   sheets_per_ton = 1000 / kg_per_sheet
 */
export function computeSheetConversions(
  widthMm: number,
  lengthMm: number,
  thicknessMm: number,
  densityKgM3: number = DENSITY.CARBON_STEEL,
): SheetConversions {
  const thicknessM = thicknessMm / 1000
  const widthM     = widthMm / 1000
  const lengthM    = lengthMm / 1000

  const kg_per_m2    = thicknessM * densityKgM3
  const unit_area_m2 = widthM * lengthM
  const kg_per_sheet = unit_area_m2 * kg_per_m2
  const m2_per_ton   = 1000 / kg_per_m2
  const sheets_per_ton = 1000 / kg_per_sheet

  return {
    kg_per_m2:     round4(kg_per_m2),
    m2_per_ton:    round4(m2_per_ton),
    kg_per_sheet:  round4(kg_per_sheet),
    sheets_per_ton: round4(sheets_per_ton),
    unit_area_m2:  round6(unit_area_m2),
  }
}

// ── Profile / Bar Conversions ────────────────────────────────────────────
export interface ProfileConversions {
  /** kg per linear meter */
  kg_per_lm: number
  /** linear meters per metric ton */
  lm_per_ton: number
  /** kg for one standard bar length */
  kg_per_bar: number
  /** how many bars per ton */
  bars_per_ton: number
}

/**
 * Compute profile conversions from section weight and bar length.
 *
 * @param kgPerLm     - Weight per linear meter (G_kg_per_m from section library)
 * @param barLengthM  - Standard bar/beam length in meters (6 or 12)
 */
export function computeProfileConversions(
  kgPerLm: number,
  barLengthM: number,
): ProfileConversions {
  const kg_per_bar  = kgPerLm * barLengthM
  const lm_per_ton  = 1000 / kgPerLm
  const bars_per_ton = 1000 / kg_per_bar

  return {
    kg_per_lm:   round4(kgPerLm),
    lm_per_ton:  round4(lm_per_ton),
    kg_per_bar:  round4(kg_per_bar),
    bars_per_ton: round4(bars_per_ton),
  }
}

/**
 * Compute kg/m for solid bars (no section library needed).
 * Cross-section area × density.
 *
 * @param shape    - 'FLAT' | 'ROUND' | 'SQUARE'
 * @param dim1Mm   - Width for FLAT, diameter for ROUND, side for SQUARE (mm)
 * @param dim2Mm   - Thickness for FLAT (mm) — ignored for ROUND/SQUARE
 * @param densityKgM3 - Material density kg/m³
 */
export function computeBarKgPerLm(
  shape: 'FLAT' | 'ROUND' | 'SQUARE',
  dim1Mm: number,
  dim2Mm: number,
  densityKgM3: number = DENSITY.CARBON_STEEL,
): number {
  let areaM2: number
  if (shape === 'FLAT') {
    areaM2 = (dim1Mm / 1000) * (dim2Mm / 1000)
  } else if (shape === 'ROUND') {
    areaM2 = Math.PI / 4 * Math.pow(dim1Mm / 1000, 2)
  } else {
    // SQUARE
    areaM2 = Math.pow(dim1Mm / 1000, 2)
  }
  return round4(areaM2 * densityKgM3)
}

// ── Combined type for stored conversions JSON ────────────────────────────
export interface UnitConversions {
  sheet?: SheetConversions
  profile?: ProfileConversions
}

/**
 * Reverse lookup: given a quantity in one unit, convert to all others.
 * Used in production disbursement UI and the /convert API endpoint.
 *
 * @param qty         - Input quantity
 * @param fromUnit    - Input unit
 * @param conversions - Pre-computed conversion rates (from unit_conversions_json)
 */
export function convertDisbursementUnits(
  qty: number,
  fromUnit: 'KG' | 'TON' | 'M2' | 'LM' | 'PC',
  conversions: UnitConversions,
): Record<string, number | null> {
  const c = conversions

  // First normalize to KG
  let kg: number | null = null
  if (fromUnit === 'KG')  kg = qty
  if (fromUnit === 'TON') kg = qty * 1000
  if (fromUnit === 'M2'  && c.sheet)   kg = qty * c.sheet.kg_per_m2
  if (fromUnit === 'LM'  && c.profile) kg = qty * c.profile.kg_per_lm
  if (fromUnit === 'PC'  && c.sheet)   kg = qty * c.sheet.kg_per_sheet
  if (fromUnit === 'PC'  && c.profile) kg = qty * c.profile.kg_per_bar

  if (kg === null) return { KG: null, TON: null, M2: null, LM: null }

  return {
    KG:  round4(kg),
    TON: round6(kg / 1000),
    M2:  c.sheet   ? round4(kg / c.sheet.kg_per_m2)   : null,
    LM:  c.profile ? round4(kg / c.profile.kg_per_lm) : null,
  }
}

// ── Internal helpers ─────────────────────────────────────────────────────

/** Round to 4 decimal places */
function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000
}

/** Round to 6 decimal places (for area_m2 values) */
function round6(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000
}
