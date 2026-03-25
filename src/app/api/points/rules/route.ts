import { NextRequest, NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import prisma from '@/lib/db';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

interface PointRule {
  id: string;
  rule_code: string;
  rule_name: string;
  description: string | null;
  points: number;
  multiplier: number;
  is_active: boolean;
  conditions: Record<string, unknown> | null;
}

// GET /api/points/rules - Get all point rules
export const GET = withApiContext(async (req, session) => {
  const rules = await prisma.$queryRaw<PointRule[]>`
    SELECT id, rule_code, rule_name, description, points, multiplier, is_active, conditions
    FROM point_rules
    ORDER BY rule_code
  `;

  return NextResponse.json(rules.map(rule => ({
    ...rule,
    points: Number(rule.points),
    multiplier: Number(rule.multiplier)
  })));
});

// POST /api/points/rules - Create new rule (admin only)
const createRuleSchema = z.object({
  ruleCode: z.string().min(1).max(50),
  ruleName: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  points: z.number().int(),
  multiplier: z.number().min(0).max(10).default(1),
  isActive: z.boolean().default(true),
  conditions: z.record(z.unknown()).optional()
});

export const POST = withApiContext(async (req, session) => {
  if (!['Admin', 'CEO'].includes(session!.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createRuleSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { ruleCode, ruleName, description, points, multiplier, isActive, conditions } = parsed.data;
  const id = uuidv4();
  const conditionsJson = conditions ? JSON.stringify(conditions) : null;

  await prisma.$executeRaw`
    INSERT INTO point_rules (id, rule_code, rule_name, description, points, multiplier, is_active, conditions)
    VALUES (${id}, ${ruleCode}, ${ruleName}, ${description || null}, ${points}, ${multiplier}, ${isActive}, ${conditionsJson})
  `;

  return NextResponse.json({ id, success: true }, { status: 201 });
});

// PUT /api/points/rules - Update rule (admin only)
const updateRuleSchema = z.object({
  id: z.string().uuid(),
  ruleName: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  points: z.number().int().optional(),
  multiplier: z.number().min(0).max(10).optional(),
  isActive: z.boolean().optional()
});

export const PUT = withApiContext(async (req, session) => {
  if (!['Admin', 'CEO'].includes(session!.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateRuleSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { id, ruleName, description, points, multiplier, isActive } = parsed.data;

  // Build dynamic update
  const updates: string[] = [];
  const values: unknown[] = [];

  if (ruleName !== undefined) {
    updates.push('rule_name = ?');
    values.push(ruleName);
  }
  if (description !== undefined) {
    updates.push('description = ?');
    values.push(description);
  }
  if (points !== undefined) {
    updates.push('points = ?');
    values.push(points);
  }
  if (multiplier !== undefined) {
    updates.push('multiplier = ?');
    values.push(multiplier);
  }
  if (isActive !== undefined) {
    updates.push('is_active = ?');
    values.push(isActive);
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  // Use individual updates since Prisma raw doesn't support dynamic SQL well
  if (ruleName !== undefined) {
    await prisma.$executeRaw`UPDATE point_rules SET rule_name = ${ruleName} WHERE id = ${id}`;
  }
  if (description !== undefined) {
    await prisma.$executeRaw`UPDATE point_rules SET description = ${description} WHERE id = ${id}`;
  }
  if (points !== undefined) {
    await prisma.$executeRaw`UPDATE point_rules SET points = ${points} WHERE id = ${id}`;
  }
  if (multiplier !== undefined) {
    await prisma.$executeRaw`UPDATE point_rules SET multiplier = ${multiplier} WHERE id = ${id}`;
  }
  if (isActive !== undefined) {
    await prisma.$executeRaw`UPDATE point_rules SET is_active = ${isActive} WHERE id = ${id}`;
  }

  return NextResponse.json({ success: true });
});
