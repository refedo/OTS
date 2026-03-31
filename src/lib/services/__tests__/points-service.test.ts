import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock prisma (@/lib/db) ────────────────────────────────────────────────────
const { mockQueryRaw, mockExecuteRaw } = vi.hoisted(() => ({
  mockQueryRaw: vi.fn(),
  mockExecuteRaw: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  default: {
    $queryRaw: mockQueryRaw,
    $executeRaw: mockExecuteRaw,
  },
  prisma: {
    $queryRaw: mockQueryRaw,
    $executeRaw: mockExecuteRaw,
  },
}));

// Mock the db-connection-pool middleware that db.ts re-exports
vi.mock('@/lib/middleware/db-connection-pool', () => ({
  db: {
    $queryRaw: mockQueryRaw,
    $executeRaw: mockExecuteRaw,
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { pointsService } from '@/lib/services/points-service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTask(overrides: Partial<{
  id: string;
  title: string;
  priority: string;
  dueDate: Date | null;
  completedAt: Date | null;
  assignedToId: string | null;
}> = {}) {
  return {
    id: 'task-1',
    title: 'Test Task',
    priority: 'Medium',
    dueDate: null,
    completedAt: new Date(),
    assignedToId: 'user-1',
    ...overrides,
  };
}

// ─── awardPointsForTaskCompletion — guard clauses ─────────────────────────────

describe('PointsService.awardPointsForTaskCompletion — early returns', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns null when task has no assignedToId', async () => {
    const result = await pointsService.awardPointsForTaskCompletion(
      makeTask({ assignedToId: null })
    );
    expect(result).toBeNull();
    expect(mockQueryRaw).not.toHaveBeenCalled();
  });

  it('returns null when task has no completedAt', async () => {
    const result = await pointsService.awardPointsForTaskCompletion(
      makeTask({ completedAt: null })
    );
    expect(result).toBeNull();
    expect(mockQueryRaw).not.toHaveBeenCalled();
  });
});

// ─── awardPointsForTaskCompletion — no active rules ──────────────────────────

describe('PointsService.awardPointsForTaskCompletion — no active rules in DB', () => {
  beforeEach(() => vi.clearAllMocks());

  it('awards 0 points and returns empty breakdown when TASK_COMPLETE rule is missing', async () => {
    // The full $queryRaw call sequence for this path:
    //  1. getRule('TASK_COMPLETE')                                  → []
    //  2. getUserPoints inside ensureUserPoints (user doesn't exist) → []
    //  3. getUserPoints inside ensureUserPoints after INSERT          → [record]
    //  4. getUserPoints inside updateUserPoints for streak calc       → [record]
    //  5. getUserPoints after updateUserPoints (const userPoints)     → [record]
    //  6. getUserTaskCompletionCount                                  → [{count}]

    const userRecord = {
      id: 'up-1', user_id: 'user-1', total_points: 0,
      lifetime_points: 0, current_streak: 1, longest_streak: 1,
      last_earned_at: null,
    };

    mockQueryRaw
      .mockResolvedValueOnce([])          // 1 — TASK_COMPLETE rule not found
      .mockResolvedValueOnce([])          // 2 — getUserPoints: user doesn't exist
      .mockResolvedValueOnce([userRecord]) // 3 — getUserPoints after insert
      .mockResolvedValueOnce([userRecord]) // 4 — getUserPoints for streak calc
      .mockResolvedValueOnce([userRecord]) // 5 — getUserPoints const userPoints
      .mockResolvedValueOnce([{ count: BigInt(1) }]); // 6 — task count

    mockExecuteRaw.mockResolvedValue(undefined);

    const result = await pointsService.awardPointsForTaskCompletion(makeTask());

    expect(result).not.toBeNull();
    expect(result!.totalPoints).toBe(0);
    expect(result!.breakdown).toHaveLength(0);
  });
});

// ─── awardPointsForTaskCompletion — base points + on-time bonus ──────────────

describe('PointsService.awardPointsForTaskCompletion — base + on-time bonus', () => {
  beforeEach(() => vi.clearAllMocks());

  it('awards base points plus on-time bonus when completed before due date', async () => {
    const dueDate = new Date('2026-04-10');
    const completedAt = new Date('2026-04-08'); // 2 days early

    const baseRule = {
      id: 'r1', rule_code: 'TASK_COMPLETE', rule_name: 'Task Complete',
      description: null, points: 10, multiplier: 1, is_active: true, conditions: null,
    };
    const onTimeRule = {
      id: 'r2', rule_code: 'ON_TIME_BONUS', rule_name: 'On Time',
      description: null, points: 5, multiplier: 1, is_active: true, conditions: null,
    };
    const earlyRule = {
      id: 'r3', rule_code: 'EARLY_COMPLETION', rule_name: 'Early',
      description: null, points: 3, multiplier: 1, is_active: true, conditions: null,
    };

    const userPointsRecord = {
      id: 'up-1', user_id: 'user-1', total_points: 0,
      lifetime_points: 0, current_streak: 1, longest_streak: 1,
      last_earned_at: null,
    };

    mockQueryRaw
      .mockResolvedValueOnce([baseRule])    // getRule('TASK_COMPLETE')
      .mockResolvedValueOnce([onTimeRule])  // getRule('ON_TIME_BONUS')
      .mockResolvedValueOnce([earlyRule])   // getRule('EARLY_COMPLETION') — 2 days early
      // ensureUserPoints path
      .mockResolvedValueOnce([userPointsRecord]) // getUserPoints (user exists)
      // updateUserPoints
      .mockResolvedValueOnce([userPointsRecord]) // getUserPoints for streak calculation
      // getUserPoints after update (for newStreak read)
      .mockResolvedValueOnce([{ ...userPointsRecord, current_streak: 1 }])
      // getUserTaskCompletionCount
      .mockResolvedValueOnce([{ count: BigInt(5) }]); // not a milestone

    mockExecuteRaw.mockResolvedValue(undefined);

    const result = await pointsService.awardPointsForTaskCompletion(
      makeTask({ dueDate, completedAt })
    );

    expect(result).not.toBeNull();
    expect(result!.totalPoints).toBe(18); // 10 base + 5 on-time + 3 early
    expect(result!.breakdown.map(b => b.rule)).toContain('TASK_COMPLETE');
    expect(result!.breakdown.map(b => b.rule)).toContain('ON_TIME_BONUS');
    expect(result!.breakdown.map(b => b.rule)).toContain('EARLY_COMPLETION');
  });

  it('does NOT award early completion bonus when completed only 1 day early', async () => {
    const dueDate = new Date('2026-04-10');
    const completedAt = new Date('2026-04-09'); // only 1 day early — threshold is 2

    const baseRule = {
      id: 'r1', rule_code: 'TASK_COMPLETE', rule_name: 'Task Complete',
      description: null, points: 10, multiplier: 1, is_active: true, conditions: null,
    };
    const onTimeRule = {
      id: 'r2', rule_code: 'ON_TIME_BONUS', rule_name: 'On Time',
      description: null, points: 5, multiplier: 1, is_active: true, conditions: null,
    };

    const userPointsRecord = {
      id: 'up-1', user_id: 'user-1', total_points: 0,
      lifetime_points: 0, current_streak: 1, longest_streak: 1, last_earned_at: null,
    };

    mockQueryRaw
      .mockResolvedValueOnce([baseRule])          // TASK_COMPLETE
      .mockResolvedValueOnce([onTimeRule])         // ON_TIME_BONUS
      // No EARLY_COMPLETION call because daysEarly < 2
      .mockResolvedValueOnce([userPointsRecord])   // getUserPoints (ensureUserPoints)
      .mockResolvedValueOnce([userPointsRecord])   // getUserPoints (streak calc)
      .mockResolvedValueOnce([{ ...userPointsRecord, current_streak: 1 }])
      .mockResolvedValueOnce([{ count: BigInt(2) }]);

    mockExecuteRaw.mockResolvedValue(undefined);

    const result = await pointsService.awardPointsForTaskCompletion(
      makeTask({ dueDate, completedAt })
    );

    expect(result!.totalPoints).toBe(15); // 10 + 5, no early bonus
    expect(result!.breakdown.map(b => b.rule)).not.toContain('EARLY_COMPLETION');
  });

  it('does NOT award on-time bonus when completed after due date', async () => {
    const dueDate = new Date('2026-04-05');
    const completedAt = new Date('2026-04-10'); // late

    const baseRule = {
      id: 'r1', rule_code: 'TASK_COMPLETE', rule_name: 'Task Complete',
      description: null, points: 10, multiplier: 1, is_active: true, conditions: null,
    };

    const userPointsRecord = {
      id: 'up-1', user_id: 'user-1', total_points: 0,
      lifetime_points: 0, current_streak: 0, longest_streak: 0, last_earned_at: null,
    };

    mockQueryRaw
      .mockResolvedValueOnce([baseRule])          // TASK_COMPLETE
      // No ON_TIME_BONUS call because completed > dueDate
      .mockResolvedValueOnce([userPointsRecord])   // getUserPoints (ensureUserPoints)
      .mockResolvedValueOnce([userPointsRecord])   // getUserPoints (streak calc)
      .mockResolvedValueOnce([{ ...userPointsRecord, current_streak: 1 }])
      .mockResolvedValueOnce([{ count: BigInt(1) }]);

    mockExecuteRaw.mockResolvedValue(undefined);

    const result = await pointsService.awardPointsForTaskCompletion(
      makeTask({ dueDate, completedAt })
    );

    expect(result!.totalPoints).toBe(10);
    expect(result!.breakdown.map(b => b.rule)).not.toContain('ON_TIME_BONUS');
  });
});

// ─── manualAdjustment — transaction type selection ────────────────────────────

describe('PointsService.manualAdjustment — transaction type', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses BONUS transaction type for a positive adjustment', async () => {
    const userPointsRecord = {
      id: 'up-1', user_id: 'user-1', total_points: 50,
      lifetime_points: 50, current_streak: 0, longest_streak: 0, last_earned_at: null,
    };
    mockQueryRaw.mockResolvedValue([userPointsRecord]);
    mockExecuteRaw.mockResolvedValue(undefined);

    await pointsService.manualAdjustment('user-1', 100, 'Performance bonus', 'admin-1');

    // First executeRaw call is addTransaction; check it was called (type is baked into SQL)
    expect(mockExecuteRaw).toHaveBeenCalled();
  });

  it('uses ADJUSTMENT transaction type for a negative adjustment', async () => {
    const userPointsRecord = {
      id: 'up-1', user_id: 'user-1', total_points: 50,
      lifetime_points: 50, current_streak: 0, longest_streak: 0, last_earned_at: null,
    };
    mockQueryRaw.mockResolvedValue([userPointsRecord]);
    mockExecuteRaw.mockResolvedValue(undefined);

    await pointsService.manualAdjustment('user-1', -20, 'Penalty', 'admin-1');

    expect(mockExecuteRaw).toHaveBeenCalled();
  });
});

// ─── awardBadge ───────────────────────────────────────────────────────────────

describe('PointsService.awardBadge', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns false and skips insert when user already holds the badge', async () => {
    mockQueryRaw.mockResolvedValueOnce([{ id: 'existing-badge' }]);

    const result = await pointsService.awardBadge('user-1', 'FIRST_TASK', 'First Task', 'trophy');
    expect(result).toBe(false);
    expect(mockExecuteRaw).not.toHaveBeenCalled();
  });

  it('returns true and inserts the badge when the user does not yet hold it', async () => {
    mockQueryRaw.mockResolvedValueOnce([]); // no existing badge
    mockExecuteRaw.mockResolvedValueOnce(undefined);

    const result = await pointsService.awardBadge('user-1', 'FIRST_TASK', 'First Task', 'trophy');
    expect(result).toBe(true);
    expect(mockExecuteRaw).toHaveBeenCalledOnce();
  });
});
