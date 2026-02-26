import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { createDolibarrClient } from '@/lib/dolibarr/dolibarr-client';

export const dynamic = 'force-dynamic';

// GET - Lookup purchase orders from Dolibarr
export async function GET(request: NextRequest) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const client = createDolibarrClient();

    // Build SQL filter for search
    let sqlfilters = '';
    if (search) {
      // Search by PO ref or supplier ref
      sqlfilters = `(t.ref:like:'%${search}%' OR t.ref_supplier:like:'%${search}%')`;
    }

    // Fetch purchase orders
    const orders = await client.getPurchaseOrders({
      limit,
      page: 0,
      sortfield: 't.rowid',
      sortorder: 'DESC',
      sqlfilters: sqlfilters || undefined,
    });

    // Enrich with supplier names and project references
    const enrichedOrders = await Promise.all(
      orders.map(async (order) => {
        // Fetch supplier name
        if (order.socid) {
          try {
            const supplier = await client.getThirdPartyById(order.socid);
            if (supplier) {
              order.supplier_name = supplier.name;
            }
          } catch (err) {
            console.error(`Failed to fetch supplier ${order.socid}:`, err);
          }
        }
        
        // Fetch project reference
        if (order.fk_projet) {
          try {
            const project = await client.getProjectById(order.fk_projet);
            if (project) {
              order.project_ref = project.ref;
            }
          } catch (err) {
            console.error(`Failed to fetch project ${order.fk_projet}:`, err);
          }
        }
        
        return order;
      })
    );

    return NextResponse.json({ orders: enrichedOrders });
  } catch (error: any) {
    console.error('[API] PO lookup error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to lookup purchase orders' },
      { status: 500 }
    );
  }
}
