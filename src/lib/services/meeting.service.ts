import { randomUUID } from 'crypto';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { createGoogleMeetLink, deleteGoogleCalendarEvent } from './google-calendar.service';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const MEETING_CATEGORIES = [
  { value: 'sales', label: 'Sales Meeting' },
  { value: 'operations', label: 'Operations Meeting' },
  { value: 'project', label: 'Project Meeting' },
  { value: 'management_review', label: 'Management Review' },
  { value: 'hr', label: 'HR Meeting' },
  { value: 'quality_safety', label: 'Quality & Safety Meeting' },
  { value: 'board', label: 'Board Meeting' },
  { value: 'client', label: 'Client Meeting' },
  { value: 'supplier', label: 'Supplier Meeting' },
  { value: 'planning', label: 'Planning Session' },
  { value: 'other', label: 'Other' },
] as const;

export type MeetingCategory = (typeof MEETING_CATEGORIES)[number]['value'];
export type MeetingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type AttendeeStatus = 'invited' | 'accepted' | 'declined' | 'attended' | 'absent';

// ─────────────────────────────────────────────────────────────────────────────
// Input types
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateMeetingInput {
  category: MeetingCategory;
  categoryCustom?: string;
  subject: string;
  scheduledAt: Date;
  endsAt: Date;
  location?: string;
  agenda?: string;
  isPrivate?: boolean;
  departmentId?: string;
  attendeeIds: string[];
  taskIds?: string[];
  generateMeetLink?: boolean;
  organizerId: string;
  createdById: string;
}

export interface UpdateMeetingInput {
  category?: MeetingCategory;
  categoryCustom?: string;
  subject?: string;
  status?: MeetingStatus;
  scheduledAt?: Date;
  endsAt?: Date;
  location?: string;
  meetLink?: string;
  agenda?: string;
  minutes?: string;
  decisions?: string;
  isPrivate?: boolean;
  departmentId?: string;
  attendeeIds?: string[];
  taskIds?: string[];
  updatedById: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared select
// ─────────────────────────────────────────────────────────────────────────────

const meetingSelect = {
  id: true,
  category: true,
  categoryCustom: true,
  subject: true,
  status: true,
  scheduledAt: true,
  endsAt: true,
  location: true,
  meetLink: true,
  googleEventId: true,
  agenda: true,
  minutes: true,
  decisions: true,
  isPrivate: true,
  departmentId: true,
  organizerId: true,
  createdAt: true,
  updatedAt: true,
  organizer: { select: { id: true, name: true, position: true } },
  department: { select: { id: true, name: true } },
  attendees: {
    select: {
      id: true,
      userId: true,
      status: true,
      isRequired: true,
      user: { select: { id: true, name: true, position: true } },
    },
  },
  tasks: {
    select: {
      id: true,
      taskId: true,
      notes: true,
      task: { select: { id: true, title: true, status: true, priority: true } },
    },
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────────────────────

export async function getMeetings(params: {
  userId: string;
  canViewAll: boolean;
  category?: string;
  status?: string;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
}) {
  const { userId, canViewAll, category, status, from, to, page = 1, pageSize = 50 } = params;

  const where: Parameters<typeof prisma.meeting.findMany>[0]['where'] = {
    deletedAt: null,
  };

  if (!canViewAll) {
    where.OR = [
      { isPrivate: false },
      { organizerId: userId },
      { attendees: { some: { userId } } },
    ];
  }

  if (category) where.category = category;
  if (status) where.status = status;
  if (from || to) {
    where.scheduledAt = {};
    if (from) where.scheduledAt.gte = from;
    if (to) where.scheduledAt.lte = to;
  }

  const [meetings, total] = await Promise.all([
    prisma.meeting.findMany({
      where,
      select: meetingSelect,
      orderBy: { scheduledAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.meeting.count({ where }),
  ]);

  return { meetings, total, page, pageSize };
}

export async function getMeetingById(id: string, userId: string, canViewAll: boolean) {
  const meeting = await prisma.meeting.findFirst({
    where: {
      id,
      deletedAt: null,
      ...(!canViewAll && {
        OR: [
          { isPrivate: false },
          { organizerId: userId },
          { attendees: { some: { userId } } },
        ],
      }),
    },
    select: meetingSelect,
  });
  return meeting;
}

export async function getMeetingStats(userId: string, canViewAll: boolean, year: number) {
  const start = new Date(`${year}-01-01T00:00:00.000Z`);
  const end = new Date(`${year + 1}-01-01T00:00:00.000Z`);

  const where: Parameters<typeof prisma.meeting.findMany>[0]['where'] = {
    deletedAt: null,
    scheduledAt: { gte: start, lt: end },
  };

  if (!canViewAll) {
    where.OR = [
      { isPrivate: false },
      { organizerId: userId },
      { attendees: { some: { userId } } },
    ];
  }

  const meetings = await prisma.meeting.findMany({
    where,
    select: { category: true, categoryCustom: true, status: true },
  });

  const byCategory: Record<string, number> = {};
  const byStatus: Record<string, number> = {};

  for (const m of meetings) {
    const label = m.category === 'other' ? (m.categoryCustom ?? 'Other') : m.category;
    byCategory[label] = (byCategory[label] ?? 0) + 1;
    byStatus[m.status] = (byStatus[m.status] ?? 0) + 1;
  }

  return { total: meetings.length, byCategory, byStatus };
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────────────────

export async function createMeeting(input: CreateMeetingInput) {
  const {
    attendeeIds,
    taskIds = [],
    generateMeetLink,
    organizerId,
    createdById,
    ...data
  } = input;

  let meetLink: string | undefined;
  let googleEventId: string | undefined;

  if (generateMeetLink) {
    const attendeeEmails = await getAttendeeEmails(attendeeIds);
    const result = await createGoogleMeetLink({
      summary: data.subject,
      description: data.agenda,
      startTime: data.scheduledAt,
      endTime: data.endsAt,
      attendeeEmails,
    });
    if (result) {
      meetLink = result.meetLink;
      googleEventId = result.googleEventId;
    }
  }

  const meeting = await prisma.meeting.create({
    data: {
      ...data,
      meetLink,
      googleEventId,
      organizerId,
      createdById,
      attendees: {
        create: attendeeIds.map((userId) => ({ id: randomUUID(), userId, status: 'invited' })),
      },
      tasks: {
        create: taskIds.map((taskId) => ({ id: randomUUID(), taskId })),
      },
    },
    select: meetingSelect,
  });

  logger.info({ meetingId: meeting.id, category: meeting.category }, 'Meeting created');
  return meeting;
}

export async function updateMeeting(id: string, input: UpdateMeetingInput) {
  const { attendeeIds, taskIds, updatedById, ...data } = input;

  const existing = await prisma.meeting.findUnique({ where: { id }, select: { googleEventId: true } });

  const updates: Parameters<typeof prisma.meeting.update>[0]['data'] = {
    ...data,
    updatedById,
  };

  if (attendeeIds !== undefined) {
    updates.attendees = {
      deleteMany: {},
      create: attendeeIds.map((userId) => ({ id: randomUUID(), userId, status: 'invited' })),
    };
  }

  if (taskIds !== undefined) {
    updates.tasks = {
      deleteMany: {},
      create: taskIds.map((taskId) => ({ id: randomUUID(), taskId })),
    };
  }

  const meeting = await prisma.meeting.update({
    where: { id },
    data: updates,
    select: meetingSelect,
  });

  logger.info({ meetingId: id, updatedById }, 'Meeting updated');
  return { meeting, previousGoogleEventId: existing?.googleEventId };
}

export async function deleteMeeting(id: string, deletedById: string) {
  const existing = await prisma.meeting.findUnique({
    where: { id },
    select: { googleEventId: true },
  });

  await prisma.meeting.update({
    where: { id },
    data: { deletedAt: new Date(), deletedById },
  });

  if (existing?.googleEventId) {
    await deleteGoogleCalendarEvent(existing.googleEventId);
  }

  logger.info({ meetingId: id, deletedById }, 'Meeting soft-deleted');
}

export async function updateAttendeeStatus(meetingId: string, userId: string, status: AttendeeStatus) {
  await prisma.meetingAttendee.update({
    where: { meetingId_userId: { meetingId, userId } },
    data: { status },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function getAttendeeEmails(userIds: string[]): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { email: true },
  });
  return users.map((u) => u.email);
}
