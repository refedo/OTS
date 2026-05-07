/**
 * Client-safe constants and helpers for the Subcontractor Contracts module.
 * No server-only imports (no prisma, no logger).
 */

export const SCOPE_CODES: Record<string, string> = {
  steel: 'STL',
  roof_sheeting: 'RSH',
  wall_sheeting: 'WSH',
  deck_panel: 'DKP',
  metal_work: 'MTW',
  other: 'OTH',
};

export const SCOPE_LABELS: Record<string, string> = {
  steel: 'Structural Steel',
  roof_sheeting: 'Roof Sheeting',
  wall_sheeting: 'Wall Sheeting',
  deck_panel: 'Deck Panel',
  metal_work: 'Metal Works',
  other: 'Other',
};

export const TEMPLATE_LABELS: Record<string, string> = {
  steel: 'Steel Works',
  sheeting_sandwich: 'Sheeting — Sandwich Panel',
  sheeting_single_skin: 'Sheeting — Single Skin',
};

export const SC_TERMS_STEEL = `1. SCOPE OF WORK
The Subcontractor shall fabricate, supply, and erect structural steel works as described in the approved drawings, specifications, and bill of quantities forming part of this Contract.

2. MATERIAL STANDARDS
All structural steel shall conform to ASTM A36 / ASTM A572 Grade 50 or equivalent approved standard. Mill certificates shall be provided for all steel material prior to fabrication commencement.

3. WELDING REQUIREMENTS
All welding shall comply with AWS D1.1 Structural Welding Code – Steel. All welders shall hold valid qualifications per AWS D1.1 or equivalent. Welding Procedure Specifications (WPS) and Procedure Qualification Records (PQR) must be submitted and approved before commencement of welding works.

4. QUALITY CONTROL
The Subcontractor shall maintain a documented Quality Control Plan including material inspection, dimensional inspection, fit-up inspection, and pre-erection inspections. Hexa Steel® shall have the right to inspect all works at any stage of fabrication and erection.

5. HEALTH, SAFETY & ENVIRONMENT
The Subcontractor shall comply with all applicable Saudi labor, health, and safety regulations (SASO, OSHA equivalent). A site-specific safety plan and method statement must be submitted and approved before site access. All personnel must use appropriate PPE at all times.

6. PROGRAM & SCHEDULE
The Subcontractor shall submit a detailed work program within 7 days of contract execution. Any delays must be formally notified in writing within 48 hours of occurrence.

7. PAYMENT TERMS
Payment shall be made within 30 calendar days of receiving an approved Progress Payment Certificate, subject to the payment terms specified herein.

8. RETENTION
A retention of 10% shall be deducted from each Progress Payment Certificate. 50% of the retention shall be released upon Practical Completion, and the remaining 50% shall be released upon expiry of the Defects Liability Period.

9. DEFECTS LIABILITY
The Defects Liability Period shall be 12 months from the date of Practical Completion. During this period, the Subcontractor shall rectify any defects at their own cost within 7 days of written notification.

10. VARIATIONS
No variation work shall be executed without a written Variation Order signed by both parties. Verbal instructions shall not be considered valid and will not be compensated.

11. INSURANCE
The Subcontractor shall maintain adequate insurance coverage throughout the duration of the Contract, including public liability insurance and workmen's compensation insurance.

12. DISPUTE RESOLUTION
Any disputes arising from this Contract shall first be addressed through amicable negotiation. If unresolved within 30 days, disputes shall be referred to arbitration in accordance with applicable Saudi law and regulations.`;

export const SC_TERMS_SHEETING_SANDWICH = `1. SCOPE OF WORK
The Subcontractor shall supply and install sandwich panel sheeting (roof and/or wall) as specified in the approved drawings, product submittals, and bill of quantities forming part of this Contract.

2. MATERIAL & PRODUCT SPECIFICATIONS
All panels shall conform to the approved product submittal for panel type, thickness, profile, core material, and RAL color. No substitution of approved products is permitted without written approval.

3. INSTALLATION STANDARDS
Installation shall be carried out strictly in accordance with the manufacturer's installation guidelines, approved shop drawings, and project specifications. Lap direction, fastener type and spacing, and sealant application shall conform to the approved method statement.

4. QUALITY CONTROL
Panel alignment, laps, fastener spacing, flashing details, and sealant application shall be inspected at each stage. The Subcontractor shall provide a signed installation completion checklist upon completion of each area.

5. HEALTH, SAFETY & ENVIRONMENT (WORKING AT HEIGHTS)
All installation personnel must be trained and certified for working at heights. Full body harness, anchor points, and fall-arrest systems are mandatory. A Method Statement & Risk Assessment (MSRA) must be approved before any elevated work begins.

6. PROGRAM & SCHEDULE
The Subcontractor shall submit a detailed installation program coordinated with the structural steel erection program to avoid conflicts and ensure safe working conditions.

7. PAYMENT TERMS
Payment shall be made within 30 calendar days of receiving an approved Progress Payment Certificate, subject to the payment terms specified herein.

8. RETENTION
A retention of 10% shall be deducted from each Progress Payment Certificate, released per the conditions specified herein.

9. WARRANTY
The Subcontractor provides a 12-month installation workmanship warranty from the date of Practical Completion. Product warranty is governed by the manufacturer's published warranty terms.

10. VARIATIONS
No variation work shall be executed without a written Variation Order signed by both parties.

11. INSURANCE
Adequate insurance coverage including public liability and workmen's compensation shall be maintained throughout the duration of the Contract.

12. DISPUTE RESOLUTION
Disputes shall be resolved per applicable Saudi law and regulation, first through negotiation then arbitration.`;

export const SC_TERMS_SHEETING_SINGLE_SKIN = `1. SCOPE OF WORK
The Subcontractor shall supply and install single-skin metal sheeting (roof and/or wall) as specified in the approved drawings, product submittals, and bill of quantities forming part of this Contract.

2. MATERIAL & PRODUCT SPECIFICATIONS
All sheets shall conform to the approved product submittal for profile, gauge, coating type, and RAL color. Material shall meet the applicable ASTM or equivalent standard for pre-painted galvanized or Zincalume steel.

3. INSTALLATION STANDARDS
Installation shall comply with the manufacturer's installation manual and approved shop drawings. Correct lap direction (wind-driven rain direction), fastener pattern, and end laps shall be strictly observed.

4. QUALITY CONTROL
Sheet alignment, fastener spacing, laps, and ridge/eave flashings shall be inspected at each stage. Any damaged or incorrectly installed sheets must be replaced before proceeding.

5. HEALTH, SAFETY & ENVIRONMENT (WORKING AT HEIGHTS)
All roofing and cladding personnel must be trained and certified for working at heights. Full harness, safety lines, and fall-arrest systems are mandatory. A Method Statement & Risk Assessment (MSRA) must be approved before work begins.

6. PROGRAM & SCHEDULE
A detailed installation program shall be submitted and coordinated with the main structure erection sequence.

7. PAYMENT TERMS
Payment shall be made within 30 calendar days of receiving an approved Progress Payment Certificate.

8. RETENTION
A retention of 10% shall be deducted from each Progress Payment Certificate, released per agreed conditions.

9. WARRANTY
12-month installation workmanship warranty from Practical Completion. Product coating warranty per manufacturer terms.

10. VARIATIONS
No variation without a written Variation Order.

11. INSURANCE
Public liability and workmen's compensation insurance shall be maintained throughout the Contract.

12. DISPUTE RESOLUTION
Disputes resolved per Saudi law, first through negotiation then arbitration.`;

export function getDefaultTerms(templateType: string): string {
  switch (templateType) {
    case 'steel': return SC_TERMS_STEEL;
    case 'sheeting_sandwich': return SC_TERMS_SHEETING_SANDWICH;
    case 'sheeting_single_skin': return SC_TERMS_SHEETING_SINGLE_SKIN;
    default: return '';
  }
}
