import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { getCurrentUserPermissions } from '@/lib/permission-checker';

export async function GET() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userPermissions = await getCurrentUserPermissions();
  if (!userPermissions.includes('tasks.view_all') && !['CEO', 'Admin', 'Manager'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch all users with active status
  const users = await prisma.user.findMany({
    where: { status: 'active' },
    select: {
      id: true,
      name: true,
      position: true,
      department: { select: { name: true } },
    },
  });

  // Fetch all tasks (non-CEO tasks unless user is CEO)
  const isCeo = session.role === 'CEO';
  const tasks = await prisma.task.findMany({
    where: isCeo ? {} : { isCeoTask: false },
    select: {
      id: true,
      assignedToId: true,
      requesterId: true,
      status: true,
      priority: true,
      taskInputDate: true,
      dueDate: true,
      releaseDate: true,
      completedAt: true,
      createdAt: true,
    },
  });

  // Build per-member stats
  const memberStats = users.map((user) => {
    const assignedTasks = tasks.filter((t) => t.assignedToId === user.id);
    const totalAssigned = assignedTasks.length;
    const completedTasks = assignedTasks.filter((t) => t.status === 'Completed');
    const totalCompleted = completedTasks.length;
    const pendingTasks = assignedTasks.filter((t) => t.status === 'Pending').length;
    const inProgressTasks = assignedTasks.filter((t) => t.status === 'In Progress').length;

    // Success rate: completed / total assigned (only count tasks that have a due date for accuracy)
    const tasksWithDueDate = assignedTasks.filter((t) => t.dueDate);
    const completedOnTime = completedTasks.filter((t) => {
      if (!t.dueDate) return true; // no due date = on time
      const completionDate = t.completedAt || t.createdAt;
      return new Date(completionDate) <= new Date(t.dueDate);
    }).length;

    const successRate = totalCompleted > 0
      ? Math.round((completedOnTime / totalCompleted) * 100)
      : 0;

    // Schedule slips: tasks completed after due date, or overdue and not completed
    const overdueCompleted = completedTasks.filter((t) => {
      if (!t.dueDate) return false;
      const completionDate = t.completedAt || t.createdAt;
      return new Date(completionDate) > new Date(t.dueDate);
    }).length;

    const overdueActive = assignedTasks.filter((t) => {
      if (t.status === 'Completed') return false;
      if (!t.dueDate) return false;
      return new Date(t.dueDate) < new Date();
    }).length;

    const scheduleSlips = overdueCompleted + overdueActive;

    // Requested tasks (where this user is the requester)
    const requestedTasks = tasks.filter((t) => t.requesterId === user.id).length;

    return {
      id: user.id,
      name: user.name,
      position: user.position,
      department: user.department?.name || '-',
      totalAssigned,
      totalCompleted,
      pendingTasks,
      inProgressTasks,
      successRate,
      scheduleSlips,
      overdueActive,
      requestedTasks,
    };
  }).filter((m) => m.totalAssigned > 0 || m.requestedTasks > 0); // Only show members with tasks

  // Sort by total assigned descending
  memberStats.sort((a, b) => b.totalAssigned - a.totalAssigned);

  // Overall summary
  const totalTasks = tasks.length;
  const totalCompleted = tasks.filter((t) => t.status === 'Completed').length;
  const totalOverdue = tasks.filter((t) => {
    if (t.status === 'Completed') return false;
    if (!t.dueDate) return false;
    return new Date(t.dueDate) < new Date();
  }).length;
  const totalPending = tasks.filter((t) => t.status === 'Pending').length;
  const totalInProgress = tasks.filter((t) => t.status === 'In Progress').length;

  return NextResponse.json({
    summary: {
      totalTasks,
      totalCompleted,
      totalOverdue,
      totalPending,
      totalInProgress,
      completionRate: totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0,
    },
    members: memberStats,
  });
}
