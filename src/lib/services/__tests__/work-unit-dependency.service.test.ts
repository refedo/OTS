import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock is hoisted to the top of the file, so mock functions must be created
// with vi.hoisted() to be accessible both inside the factory and in tests.
const { mockFindMany, mockFindUnique, mockCreate } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockFindUnique: vi.fn(),
  mockCreate: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    workUnit: { findUnique: mockFindUnique },
    workUnitDependency: {
      findUnique: mockFindUnique,
      findMany: mockFindMany,
      create: mockCreate,
    },
  },
}));

// Also mock @prisma/client so DependencyType enum resolves without a DB connection
vi.mock('@prisma/client', () => ({
  DependencyType: { FS: 'FS', SS: 'SS', FF: 'FF', SF: 'SF' },
}));

import { WorkUnitDependencyService } from '@/lib/services/work-unit-dependency.service';

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── wouldCreateCycle ─────────────────────────────────────────────────────────

describe('WorkUnitDependencyService.wouldCreateCycle', () => {

  it('returns false when there are no existing edges (isolated nodes)', async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await WorkUnitDependencyService.wouldCreateCycle('A', 'B');
    expect(result).toBe(false);
  });

  it('returns false for a linear chain that does not loop back to the source', async () => {
    // Existing: B→C.  Want to add A→B.
    // BFS from B finds C; from C finds nothing; A is never reached.
    mockFindMany
      .mockResolvedValueOnce([{ toWorkUnitId: 'C' }]) // outgoing from B
      .mockResolvedValueOnce([]);                       // outgoing from C

    const result = await WorkUnitDependencyService.wouldCreateCycle('A', 'B');
    expect(result).toBe(false);
  });

  it('returns true for a direct two-node cycle (B→A exists, want to add A→B)', async () => {
    // BFS from B immediately finds A (=== fromWorkUnitId) → cycle.
    mockFindMany.mockResolvedValueOnce([{ toWorkUnitId: 'A' }]);

    const result = await WorkUnitDependencyService.wouldCreateCycle('A', 'B');
    expect(result).toBe(true);
  });

  it('returns true for an indirect three-node cycle (B→C→A, want to add A→B)', async () => {
    mockFindMany
      .mockResolvedValueOnce([{ toWorkUnitId: 'C' }]) // outgoing from B
      .mockResolvedValueOnce([{ toWorkUnitId: 'A' }]); // outgoing from C

    const result = await WorkUnitDependencyService.wouldCreateCycle('A', 'B');
    expect(result).toBe(true);
  });

  it('returns false for a diamond shape with no path back to the source', async () => {
    // Existing: B→C, B→D, C→E, D→E.  Want to add A→B.
    mockFindMany
      .mockResolvedValueOnce([{ toWorkUnitId: 'C' }, { toWorkUnitId: 'D' }]) // from B
      .mockResolvedValueOnce([{ toWorkUnitId: 'E' }])                         // from C
      .mockResolvedValueOnce([{ toWorkUnitId: 'E' }])                         // from D
      .mockResolvedValueOnce([]);                                               // from E (visited once)

    const result = await WorkUnitDependencyService.wouldCreateCycle('A', 'B');
    expect(result).toBe(false);
  });

  it('handles cycles in existing graph without infinite looping (visited-set guard)', async () => {
    // Existing: B→C, C→B (a cycle between B and C, but A is not reachable).
    mockFindMany
      .mockResolvedValueOnce([{ toWorkUnitId: 'C' }]) // from B
      .mockResolvedValueOnce([{ toWorkUnitId: 'B' }]); // from C → B already visited

    const result = await WorkUnitDependencyService.wouldCreateCycle('A', 'B');
    expect(result).toBe(false);
  });
});

// ─── create — self-reference guard ───────────────────────────────────────────

describe('WorkUnitDependencyService.create — self-reference guard', () => {
  it('throws immediately when fromWorkUnitId === toWorkUnitId, with no DB calls', async () => {
    await expect(
      WorkUnitDependencyService.create({ fromWorkUnitId: 'X', toWorkUnitId: 'X' })
    ).rejects.toThrow('Cannot create dependency from a WorkUnit to itself');

    expect(mockFindUnique).not.toHaveBeenCalled();
    expect(mockFindMany).not.toHaveBeenCalled();
  });
});
