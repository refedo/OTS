import db from '@/lib/db';

export type HierarchyNode = {
  id: string;
  name: string;
  email: string;
  position: string | null;
  role: { name: string };
  department: { name: string } | null;
  reportsToId: string | null;
  subordinates?: HierarchyNode[];
  _count?: { subordinates: number };
};

/**
 * Get all users with their subordinates count
 */
export async function getAllUsersWithSubordinates() {
  return await db.user.findMany({
    where: { status: 'active' },
    select: {
      id: true,
      name: true,
      email: true,
      position: true,
      reportsToId: true,
      role: { select: { name: true } },
      department: { select: { name: true } },
      _count: { select: { subordinates: true } },
    },
    orderBy: { name: 'asc' },
  });
}

/**
 * Get top-level managers (users who don't report to anyone)
 */
export async function getTopLevelManagers() {
  return await db.user.findMany({
    where: {
      status: 'active',
      reportsToId: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      position: true,
      reportsToId: true,
      role: { select: { name: true } },
      department: { select: { name: true } },
      _count: { select: { subordinates: true } },
    },
    orderBy: { name: 'asc' },
  });
}

/**
 * Get direct subordinates of a user
 */
export async function getSubordinates(userId: string) {
  return await db.user.findMany({
    where: {
      status: 'active',
      reportsToId: userId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      position: true,
      reportsToId: true,
      role: { select: { name: true } },
      department: { select: { name: true } },
      _count: { select: { subordinates: true } },
    },
    orderBy: { name: 'asc' },
  });
}

/**
 * Build hierarchical tree structure recursively
 */
export async function buildHierarchyTree(userId?: string): Promise<HierarchyNode[]> {
  let users: HierarchyNode[];

  if (userId) {
    // Get subordinates of specific user
    users = await getSubordinates(userId);
  } else {
    // Get top-level managers
    users = await getTopLevelManagers();
  }

  // Recursively fetch subordinates for each user
  const usersWithSubordinates = await Promise.all(
    users.map(async (user) => {
      const subordinates = await buildHierarchyTree(user.id);
      return {
        ...user,
        subordinates: subordinates.length > 0 ? subordinates : undefined,
      };
    })
  );

  return usersWithSubordinates;
}

/**
 * Get all subordinates of a user (recursively, flattened)
 */
export async function getAllSubordinatesFlat(userId: string): Promise<string[]> {
  const direct = await db.user.findMany({
    where: {
      status: 'active',
      reportsToId: userId,
    },
    select: { id: true },
  });

  const directIds = direct.map((u) => u.id);
  
  // Recursively get subordinates of subordinates
  const indirect = await Promise.all(
    directIds.map((id) => getAllSubordinatesFlat(id))
  );

  return [...directIds, ...indirect.flat()];
}

/**
 * Get reporting chain (path to top) for a user
 */
export async function getReportingChain(userId: string): Promise<HierarchyNode[]> {
  const chain: HierarchyNode[] = [];
  let currentUserId: string | null = userId;

  while (currentUserId) {
    const user = await db.user.findUnique({
      where: { id: currentUserId },
      select: {
        id: true,
        name: true,
        email: true,
        position: true,
        reportsToId: true,
        role: { select: { name: true } },
        department: { select: { name: true } },
        _count: { select: { subordinates: true } },
      },
    });

    if (!user) break;

    chain.push(user);
    currentUserId = user.reportsToId;
  }

  return chain;
}

/**
 * Check if user A reports to user B (directly or indirectly)
 */
export async function reportsTo(userAId: string, userBId: string): Promise<boolean> {
  const chain = await getReportingChain(userAId);
  return chain.some((user) => user.id === userBId);
}
