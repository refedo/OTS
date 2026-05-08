import { NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import { z } from 'zod';
import {
  linkClientToDolibarrCustomer,
  getClientsForLinking,
} from '@/lib/services/financial/customer-portal.service';

export const dynamic = 'force-dynamic';

const linkSchema = z.object({
  client_id: z.string().uuid(),
});

export const GET = withApiContext(async (req, session) => {
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url!);
  const search = searchParams.get('search') ?? '';
  const clients = await getClientsForLinking(search);
  return NextResponse.json(clients);
});

export const POST = withApiContext(async (req, session, ctx) => {
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dolibarrId = parseInt(ctx?.params?.id ?? '', 10);
  if (isNaN(dolibarrId)) return NextResponse.json({ error: 'Invalid customer id' }, { status: 400 });

  const body = await req.json();
  const parsed = linkSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });

  await linkClientToDolibarrCustomer(parsed.data.client_id, dolibarrId);
  return NextResponse.json({ ok: true });
});
