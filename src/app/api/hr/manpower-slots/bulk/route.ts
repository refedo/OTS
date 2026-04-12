/**
 * POST /api/hr/manpower-slots/bulk
 *
 * Bulk-create N manpower slots for an agency with a shared trade / hourly rate
 * and auto-incrementing slot codes. Accepts either:
 *   { agencyId, trade, hourlyRate, count, prefix, startNumber?, padWidth? }
 *     → generates codes like "SH-W04", "SH-W05", ...
 *   OR
 *   { agencyId, slots: [{ slotCode, trade, hourlyRate, notes? }, ...] }
 *     → creates each row as provided.
 *
 * The entire bulk is wrapped in a transaction: if ANY row fails (e.g.
 * duplicate slotCode), the whole request rolls back with HTTP 409.
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';

const generatedSchema = z.object({
  agencyId: z.string().uuid(),
  trade: z.string().min(1).max(120),
  hourlyRate: z.union([z.string(), z.number()]),
  count: z.number().int().min(1).max(100),
  prefix: z.string().min(1).max(30),
  startNumber: z.number().int().min(0).optional(),
  padWidth: z.number().int().min(1).max(6).optional(),
  notes: z.string().max(500).nullable().optional(),
});

const explicitSchema = z.object({
  agencyId: z.string().uuid(),
  slots: z
    .array(
      z.object({
        slotCode: z.string().min(1).max(40),
        trade: z.string().min(1).max(120),
        hourlyRate: z.union([z.string(), z.number()]),
        notes: z.string().max(500).nullable().optional(),
      }),
    )
    .min(1)
    .max(100),
});

export async function POST(req: Request) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!(await checkPermission('hr.manpowerSlot.manage'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();

  // Try explicit shape first (has `slots: [...]`)
  if (Array.isArray((body as Record<string, unknown>).slots)) {
    const parsed = explicitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { agencyId, slots } = parsed.data;
    try {
      const created = await prisma.$transaction(
        slots.map((s) =>
          prisma.manpowerSlot.create({
            data: {
              agencyId,
              slotCode: s.slotCode,
              trade: s.trade,
              hourlyRate: String(s.hourlyRate),
              notes: s.notes ?? null,
              createdById: session.sub,
            },
          }),
        ),
      );
      logger.info(
        { agencyId, count: created.length },
        '[HR] Bulk manpower slots created (explicit)',
      );
      return NextResponse.json({ created: created.length, slots: created }, { status: 201 });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Bulk create failed';
      if (msg.includes('Unique')) {
        return NextResponse.json(
          { error: 'One or more slot codes already exist — nothing created' },
          { status: 409 },
        );
      }
      logger.error({ error }, '[HR] Bulk slot create failed');
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  // Generated shape (count + prefix)
  const parsed = generatedSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { agencyId, trade, hourlyRate, count, prefix, startNumber, padWidth, notes } = parsed.data;
  const start = startNumber ?? 1;
  const pad = padWidth ?? 2;

  const rows = Array.from({ length: count }, (_, i) => {
    const num = (start + i).toString().padStart(pad, '0');
    return {
      agencyId,
      slotCode: `${prefix}${num}`,
      trade,
      hourlyRate: String(hourlyRate),
      notes: notes ?? null,
      createdById: session.sub,
    };
  });

  try {
    const created = await prisma.$transaction(
      rows.map((r) => prisma.manpowerSlot.create({ data: r })),
    );
    logger.info(
      { agencyId, count: created.length, prefix },
      '[HR] Bulk manpower slots created (generated)',
    );
    return NextResponse.json({ created: created.length, slots: created }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Bulk create failed';
    if (msg.includes('Unique')) {
      return NextResponse.json(
        {
          error:
            'One or more generated slot codes collide with existing codes. Try a higher startNumber or a different prefix.',
        },
        { status: 409 },
      );
    }
    logger.error({ error }, '[HR] Bulk slot create failed');
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
