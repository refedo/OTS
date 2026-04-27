import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const categories = await prisma.imsCategory.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        nameAr: true,
        level: true,
        description: true,
        _count: { select: { documents: true } },
      },
      orderBy: [{ level: 'asc' }, { code: 'asc' }],
    });

    return NextResponse.json(categories);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch IMS categories');
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}
