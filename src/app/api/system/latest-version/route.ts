import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { APP_VERSION } from '@/lib/version';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  ...APP_VERSION,
  mainTitle: '🏷️ Cost Classification Mapping — Product Categories & Supplier Classification',
  highlights: [
    'New Product Categories system: define named categories that carry a cost classification and an optional Chart-of-Accounts account code',
    'Product Category Mapping: map each Dolibarr product reference to a category so every invoice line is classified accurately',
    'Supplier Classification: assign a default cost category to each supplier, used as a fallback when no account or product mapping exists',
    '4-level classification hierarchy in all financial reports: Account Mapping → Product Category → Supplier Classification → Other/Unclassified',
    'New sidebar entries: Product Categories and Supplier Classification under Financial',
  ],
  changes: {
    added: [
      {
        title: 'Product Categories',
        items: [
          'New table fin_product_categories — stores named categories (English + Arabic) with cost_classification and optional coa_account_code',
          'GET /api/financial/product-categories — list all categories with mapped product count and COA account name',
          'POST /api/financial/product-categories — create a new category',
          'PUT /api/financial/product-categories/[id] — update name, classification, COA code, or active status',
          'DELETE /api/financial/product-categories/[id] — delete a category (blocked if product mappings exist)',
          'New page /financial/product-categories — manage categories and map product refs on a single tabbed page',
        ],
      },
      {
        title: 'Product Category Mapping',
        items: [
          'New table fin_product_category_mapping — maps Dolibarr product_ref to a fin_product_categories row',
          'GET /api/financial/product-category-mapping — returns existing mappings + list of unmapped product refs from invoices',
          'POST /api/financial/product-category-mapping — create a new product→category mapping',
          'PUT /api/financial/product-category-mapping/[id] — change the category for an existing mapping',
          'DELETE /api/financial/product-category-mapping/[id] — remove a mapping',
          'Unmapped products tab shows all product refs appearing in invoices with no mapping, sorted by spend',
        ],
      },
      {
        title: 'Supplier Classification',
        items: [
          'New table fin_supplier_classification — maps supplier (Dolibarr socid) to a default cost category and optional COA code',
          'GET /api/financial/supplier-classification — returns classified suppliers + unclassified suppliers sorted by spend',
          'POST /api/financial/supplier-classification — classify a supplier',
          'PUT /api/financial/supplier-classification/[id] — update category or COA code',
          'DELETE /api/financial/supplier-classification/[id] — remove classification',
          'New page /financial/supplier-classification — shows classification priority explanation, unclassified suppliers, and classified table',
        ],
      },
      {
        title: 'DB Migration',
        items: [
          'prisma/migrations/add_cost_classification_mapping.sql — creates all 3 new tables with proper indexes, FK constraints, and audit columns',
        ],
      },
    ],
    changed: [
      {
        title: '4-Level Classification Hierarchy in Reports',
        items: [
          'Cost Structure report (getProjectCostStructure): COALESCE now checks account mapping → product category → supplier classification → Other/Unclassified',
          'Monthly trend query updated from keyword pattern matching to the same 4-level hierarchy',
          'Expenses Analysis report (getExpensesAnalysis): supplier expenses breakdown uses the same 4-level COALESCE',
          'All SQL queries now LEFT JOIN fin_product_category_mapping, fin_product_categories, and fin_supplier_classification',
        ],
      },
      {
        title: 'Sidebar Navigation',
        items: [
          'Added "Product Categories" → /financial/product-categories under Financial',
          'Added "Supplier Classification" → /financial/supplier-classification under Financial',
        ],
      },
    ],
    fixed: [],
  },
};

export async function GET(_req: NextRequest) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;

  let alreadySeen = false;
  if (session) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: session.sub },
        select: { customPermissions: true },
      });
      const perms = user?.customPermissions as Record<string, unknown> | null;
      if (perms?.lastSeenVersion === CURRENT_VERSION.version) {
        alreadySeen = true;
      }
    } catch {
      // Non-critical; fall back to client-side check
    }
  }

  return NextResponse.json({ ...CURRENT_VERSION, alreadySeen });
}
