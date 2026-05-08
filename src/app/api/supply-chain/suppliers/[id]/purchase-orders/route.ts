import { NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import { z } from 'zod';
import { createDolibarrClient } from '@/lib/dolibarr/dolibarr-client';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  page:  z.coerce.number().min(0).default(0),
  limit: z.coerce.number().min(1).max(100).default(20),
});

// 30-second in-memory cache to avoid hammering Dolibarr on tab switches
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL_MS = 30_000;

export const GET = withApiContext(async (req, session, ctx) => {
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = parseInt(ctx?.params?.id ?? '', 10);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid supplier id' }, { status: 400 });

  const { searchParams } = new URL(req.url!);
  const { data } = querySchema.safeParse(Object.fromEntries(searchParams));
  const { page, limit } = data ?? { page: 0, limit: 20 };

  const cacheKey = `po:${id}:${page}:${limit}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  try {
    const client = createDolibarrClient();
    const orders = await client.getPurchaseOrders({
      limit,
      page,
      sortfield: 't.rowid',
      sortorder: 'DESC',
      sqlfilters: `(t.fk_soc:=:${id})`,
    });

    const result = { orders, total: orders.length, page, limit };
    cache.set(cacheKey, { data: result, ts: Date.now() });
    return NextResponse.json(result);
  } catch (error) {
    logger.error({ error, supplierId: id }, 'Failed to fetch purchase orders from Dolibarr');
    return NextResponse.json({ error: 'Failed to fetch purchase orders' }, { status: 502 });
  }
});
