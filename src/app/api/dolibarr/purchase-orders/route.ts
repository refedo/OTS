import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { createDolibarrClient } from '@/lib/dolibarr/dolibarr-client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '0', 10);
    const limit = parseInt(searchParams.get('limit') || '25', 10);
    const orderId = searchParams.get('orderId');

    const client = createDolibarrClient();

    // If orderId is provided, fetch single purchase order with full details
    if (orderId) {
      const order = await client.getPurchaseOrderById(orderId);
      if (!order) {
        return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });
      }
      
      // Enrich with supplier name
      if (order.socid) {
        try {
          const supplier = await client.getThirdPartyById(order.socid);
          if (supplier) {
            order.supplier_name = supplier.name;
          }
        } catch (err) {
          console.error('Failed to fetch supplier:', err);
        }
      }
      
      // Enrich with project reference
      if (order.fk_projet) {
        try {
          const project = await client.getProjectById(order.fk_projet);
          if (project) {
            order.project_ref = project.ref;
          }
        } catch (err) {
          console.error('Failed to fetch project:', err);
        }
      }
      
      return NextResponse.json({ order });
    }

    // Otherwise, fetch paginated list of purchase orders
    const orders = await client.getPurchaseOrders({
      page,
      limit,
      sortfield: 't.rowid',
      sortorder: 'DESC',
    });

    // Enrich orders with supplier names and project references
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

    // Get total count (approximate based on batch size)
    const hasMore = orders.length >= limit;
    const total = hasMore ? (page + 2) * limit : page * limit + orders.length;

    return NextResponse.json({
      orders: enrichedOrders,
      pagination: {
        page,
        limit,
        total,
        hasMore,
      },
    });
  } catch (error: any) {
    console.error('[API] Purchase orders error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch purchase orders' },
      { status: 500 }
    );
  }
}
