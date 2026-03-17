export const MAIN_ACTIVITIES = [
  { key: 'design', label: 'Design' },
  { key: 'detailing', label: 'Detailing' },
  { key: 'procurement', label: 'Procurement' },
  { key: 'production', label: 'Production' },
  { key: 'coating', label: 'Coating' },
  { key: 'delivery_logistics', label: 'Delivery & Logistics' },
  { key: 'erection', label: 'Erection' },
] as const;

export type MainActivityKey = (typeof MAIN_ACTIVITIES)[number]['key'];

export const SUB_ACTIVITIES: Record<string, { key: string; label: string }[]> = {
  design: [
    { key: 'proposal_coordination', label: 'Proposal & Coordination' },
    { key: 'design_package', label: 'Design Package' },
  ],
  detailing: [
    { key: 'modeling', label: 'Modeling' },
    { key: 'checking_coordination', label: 'Checking & Coordination' },
    { key: 'ga_shop_drawings', label: 'GA & Shop Drawings' },
    { key: 'fabrication_package', label: 'Fabrication Package' },
  ],
  procurement: [
    { key: 'raw_material', label: 'Raw Material Procurement' },
    { key: 'sheeting', label: 'Sheeting Procurement' },
    { key: 'accessories', label: 'Accessories Procurement' },
    { key: 'bolts_nuts', label: 'Bolts & Nuts Procurement' },
    { key: 'paints', label: 'Paints Procurement' },
    { key: 'special_items', label: 'Special Items Procurement' },
  ],
  production: [
    { key: 'preparation', label: 'Preparation' },
    { key: 'fabrication', label: 'Fabrication' },
  ],
  coating: [
    { key: 'sand_blasting', label: 'Sand Blasting' },
    { key: 'painting', label: 'Painting' },
    { key: 'galvanization', label: 'Galvanization' },
  ],
  delivery_logistics: [
    { key: 'dispatch_sand_blasting', label: 'Dispatch to Sand Blasting' },
    { key: 'dispatch_customer', label: 'Dispatch to Customer' },
  ],
  erection: [
    { key: 'erection_anchor_bolts', label: 'Erection of Anchor Bolts' },
    { key: 'erection_steel', label: 'Erection of Steel' },
    { key: 'erection_sheeting', label: 'Erection of Sheeting' },
    { key: 'erection_accessories', label: 'Erection of Accessories' },
    { key: 'erection_metal_decking', label: 'Erection of Metal Decking' },
  ],
};

/**
 * Finish-to-Start dependencies between sub-activities.
 * Key = sub-activity that depends on its predecessor.
 * Value = predecessor sub-activity key that must be Completed first.
 */
export const SUB_ACTIVITY_DEPENDENCIES: Record<string, string> = {
  // Design
  design_package: 'proposal_coordination',
  // Detailing
  checking_coordination: 'modeling',
  ga_shop_drawings: 'checking_coordination',
  fabrication_package: 'ga_shop_drawings',
  // Production
  fabrication: 'preparation',
  // Coating
  painting: 'sand_blasting',
  // Delivery & Logistics
  dispatch_customer: 'dispatch_sand_blasting',
  // Erection
  erection_steel: 'erection_anchor_bolts',
  erection_sheeting: 'erection_steel',
  erection_accessories: 'erection_sheeting',
  erection_metal_decking: 'erection_accessories',
};

export function getMainActivityLabel(key: string): string {
  return MAIN_ACTIVITIES.find(a => a.key === key)?.label ?? key;
}

export function getSubActivityLabel(mainKey: string, subKey: string): string {
  return SUB_ACTIVITIES[mainKey]?.find(s => s.key === subKey)?.label ?? subKey;
}

export function getPredecessorSubActivity(subKey: string): string | undefined {
  return SUB_ACTIVITY_DEPENDENCIES[subKey];
}
