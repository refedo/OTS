import { NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { getCurrentUserPermissions } from '@/lib/permission-checker';
import { logActivity } from '@/lib/api-utils';
import {
  getMeetings,
  getMeetingStats,
  createMeeting,
  MEETING_CATEGORIES,
} from '@/lib/services/meeting.service';

const CATEGORY_VALUES = MEETING_CATEGORIES.map((c) => c.value) as [string, ...string[]];

const createSchema = z.object({
  category: z.enum(CATEGORY_VALUES as [typeof CATEGORY_VALUES[0], ...typeof CATEGORY_VALUES]),
  categoryCustom: z.string().max(150).optional().nullable(),
  subject: z.string().min(2).max(255),
  scheduledAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  location: z.string().max(255).optional().nullable(),
  agenda: z.string().optional().nullable(),
  isPrivate: z.boolean().optional(),
  departmentId: z.string().uuid().optional().nullable(),
  attendeeIds: z.array(z.string().uuid()).min(0),
  taskIds: z.array(z.string().uuid()).optional(),
  generateMeetLink: z.boolean().optional(),
});

export async function GET(req: Request) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userPermissions = await getCurrentUserPermissions();
  const canViewAll = userPermissions.includes('meetings.view_all');

  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('mode');

  if (mode === 'stats') {
    const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()), 10);
    const stats = await getMeetingStats(session.sub, canViewAll, year);
    return NextResponse.json(stats);
  }

  const category = searchParams.get('category') ?? undefined;
  const status = searchParams.get('status') ?? undefined;
  const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined;
  const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined;
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') ?? '50', 10);

  const result = await getMeetings({
    userId: session.sub,
    canViewAll,
    category,
    status,
    from,
    to,
    page,
    pageSize,
  });

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userPermissions = await getCurrentUserPermissions();
  if (!userPermissions.includes('meetings.create')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 });
  }

  const input = parsed.data;
  const meeting = await createMeeting({
    category: input.category as Parameters<typeof createMeeting>[0]['category'],
    categoryCustom: input.categoryCustom ?? undefined,
    subject: input.subject,
    scheduledAt: new Date(input.scheduledAt),
    endsAt: new Date(input.endsAt),
    location: input.location ?? undefined,
    agenda: input.agenda ?? undefined,
    isPrivate: input.isPrivate ?? false,
    departmentId: input.departmentId ?? undefined,
    attendeeIds: input.attendeeIds,
    taskIds: input.taskIds ?? [],
    generateMeetLink: input.generateMeetLink ?? false,
    organizerId: session.sub,
    createdById: session.sub,
  });

  await logActivity({
    action: 'CREATE',
    entityType: 'Meeting',
    entityId: meeting.id,
    entityName: meeting.subject,
    userId: session.sub,
  });

  return NextResponse.json(meeting, { status: 201 });
}
