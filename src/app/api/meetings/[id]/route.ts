import { NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { getCurrentUserPermissions } from '@/lib/permission-checker';
import { logActivity } from '@/lib/api-utils';
import {
  getMeetingById,
  updateMeeting,
  deleteMeeting,
  MEETING_CATEGORIES,
} from '@/lib/services/meeting.service';

const CATEGORY_VALUES = MEETING_CATEGORIES.map((c) => c.value) as [string, ...string[]];

const updateSchema = z.object({
  category: z.enum(CATEGORY_VALUES as [typeof CATEGORY_VALUES[0], ...typeof CATEGORY_VALUES]).optional(),
  categoryCustom: z.string().max(150).optional().nullable(),
  subject: z.string().min(2).max(255).optional(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).optional(),
  scheduledAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  location: z.string().max(255).optional().nullable(),
  meetLink: z.string().url().max(500).optional().nullable(),
  agenda: z.string().optional().nullable(),
  minutes: z.string().optional().nullable(),
  decisions: z.string().optional().nullable(),
  isPrivate: z.boolean().optional(),
  departmentId: z.string().uuid().optional().nullable(),
  attendeeIds: z.array(z.string().uuid()).optional(),
  taskIds: z.array(z.string().uuid()).optional(),
});

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userPermissions = await getCurrentUserPermissions();
  const canViewAll = userPermissions.includes('meetings.view_all');

  const meeting = await getMeetingById(id, session.sub, canViewAll);
  if (!meeting) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(meeting);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userPermissions = await getCurrentUserPermissions();
  const canViewAll = userPermissions.includes('meetings.view_all');
  const canEditAll = userPermissions.includes('meetings.edit_all');
  const canEdit = userPermissions.includes('meetings.edit');

  const existing = await getMeetingById(id, session.sub, canViewAll);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const isOrganizer = existing.organizerId === session.sub;
  if (!canEditAll && !(canEdit && isOrganizer)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 });
  }

  const input = parsed.data;
  const { meeting } = await updateMeeting(id, {
    ...input,
    category: input.category as Parameters<typeof updateMeeting>[1]['category'],
    categoryCustom: input.categoryCustom ?? undefined,
    location: input.location ?? undefined,
    meetLink: input.meetLink ?? undefined,
    agenda: input.agenda ?? undefined,
    minutes: input.minutes ?? undefined,
    decisions: input.decisions ?? undefined,
    departmentId: input.departmentId ?? undefined,
    scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
    endsAt: input.endsAt ? new Date(input.endsAt) : undefined,
    updatedById: session.sub,
  });

  await logActivity({
    action: 'UPDATE',
    entityType: 'Meeting',
    entityId: id,
    entityName: meeting.subject,
    userId: session.sub,
  });

  return NextResponse.json(meeting);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userPermissions = await getCurrentUserPermissions();
  const canViewAll = userPermissions.includes('meetings.view_all');
  const canDelete = userPermissions.includes('meetings.delete');

  const existing = await getMeetingById(id, session.sub, canViewAll);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (!canDelete && existing.organizerId !== session.sub) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await deleteMeeting(id, session.sub);

  await logActivity({
    action: 'DELETE',
    entityType: 'Meeting',
    entityId: id,
    entityName: existing.subject,
    userId: session.sub,
  });

  return NextResponse.json({ success: true });
}
