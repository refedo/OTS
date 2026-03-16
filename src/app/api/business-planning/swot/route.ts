import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { withApiContext } from '@/lib/api-utils';

// GET - Fetch SWOT Analysis by year
export const GET = withApiContext(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');

    if (year) {
      const swot = await prisma.swotAnalysis.findFirst({
        where: { year: parseInt(year) },
      });
      return NextResponse.json(swot || null);
    }

    // Get all SWOT analyses
    const swots = await prisma.swotAnalysis.findMany({
      orderBy: { year: 'desc' },
    });

    return NextResponse.json(swots);
  } catch (error) {
    logger.error({ error }, 'Error fetching SWOT analysis');
    return NextResponse.json(
      { error: 'Failed to fetch SWOT analysis' },
      { status: 500 }
    );
  }
});

// POST - Create or Update SWOT Analysis
export const POST = withApiContext(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { year, strengths, weaknesses, opportunities, threats, strategies } = body;

    // Check if SWOT for this year exists
    const existing = await prisma.swotAnalysis.findFirst({
      where: { year: parseInt(year) },
    });

    let swot;
    if (existing) {
      // Update existing
      swot = await prisma.swotAnalysis.update({
        where: { id: existing.id },
        data: {
          strengths,
          weaknesses,
          opportunities,
          threats,
          strategies,
        },
      });
    } else {
      // Create new
      swot = await prisma.swotAnalysis.create({
        data: {
          year: parseInt(year),
          strengths,
          weaknesses,
          opportunities,
          threats,
          strategies,
        },
      });
    }

    return NextResponse.json(swot);
  } catch (error) {
    logger.error({ error }, 'Error saving SWOT analysis');
    return NextResponse.json(
      { error: 'Failed to save SWOT analysis' },
      { status: 500 }
    );
  }
});

// DELETE - Delete SWOT Analysis
export const DELETE = withApiContext(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');

    if (!year) {
      return NextResponse.json(
        { error: 'Year parameter is required' },
        { status: 400 }
      );
    }

    const existing = await prisma.swotAnalysis.findFirst({
      where: { year: parseInt(year) },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'SWOT analysis not found' },
        { status: 404 }
      );
    }

    await prisma.swotAnalysis.delete({
      where: { id: existing.id },
    });

    return NextResponse.json({ message: 'SWOT analysis deleted successfully' });
  } catch (error) {
    logger.error({ error }, 'Error deleting SWOT analysis');
    return NextResponse.json(
      { error: 'Failed to delete SWOT analysis' },
      { status: 500 }
    );
  }
});
