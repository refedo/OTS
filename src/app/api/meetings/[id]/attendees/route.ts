import { NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { updateAttendeeStatus } from '@/lib/services/meeting.service';

const statusSchema = z.object({
  status: z.enum(['invited', 'accepted', 'declined', 'attended', 'absent']),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: meetingId } = await params;
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 });
  }

  await updateAttendeeStatus(meetingId, session.sub, parsed.data.status);
  return NextResponse.json({ success: true });
}
