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
    const search = searchParams.get('search')?.toLowerCase() || '';
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const client = createDolibarrClient();

    // Fetch recent purchase orders (no SQL filter - more reliable)
    console.log('[PO Lookup] Fetching recent POs, search term:', search);
    const allOrders = await client.getPurchaseOrders({
      limit,
      page: 0,
      sortfield: 't.rowid',
      sortorder: 'DESC',
    });
    console.log('[PO Lookup] Fetched orders:', allOrders.length);

    // Filter client-side by search term
    let filteredOrders = allOrders;
    if (search) {
      filteredOrders = allOrders.filter(order => 
        order.ref?.toLowerCase().includes(search) ||
        order.ref_supplier?.toLowerCase().includes(search)
      );
      console.log('[PO Lookup] Filtered to:', filteredOrders.length, 'orders matching:', search);
    }

    // Enrich with supplier names and project references (limit to first 20 to avoid timeout)
    const ordersToEnrich = filteredOrders.slice(0, 20);
    const enrichedOrders = await Promise.all(
      ordersToEnrich.map(async (order) => {
        // Fetch supplier name
        if (order.socid) {
          try {
            const supplier = await client.getThirdPartyById(order.socid);
            if (supplier) {
              order.supplier_name = supplier.name;
            }
          } catch (err) {
            // Silently ignore supplier fetch errors
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
            // Silently ignore project fetch errors
          }
        }
        
        return order;
      })
    );

    console.log('[PO Lookup] Returning', enrichedOrders.length, 'enriched orders');
    return NextResponse.json({ orders: enrichedOrders });
  } catch (error: any) {
    console.error('[API] PO lookup error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to lookup purchase orders' },
      { status: 500 }
    );
  }
}
