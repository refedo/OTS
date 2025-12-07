import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Fetch SWOT Analysis by year
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');

    if (year) {
      const swot = await prisma.swotAnalysis.findUnique({
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
    console.error('Error fetching SWOT analysis:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SWOT analysis' },
      { status: 500 }
    );
  }
}

// POST - Create or Update SWOT Analysis
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { year, strengths, weaknesses, opportunities, threats, strategies } = body;

    // Check if SWOT for this year exists
    const existing = await prisma.swotAnalysis.findUnique({
      where: { year: parseInt(year) },
    });

    let swot;
    if (existing) {
      // Update existing
      swot = await prisma.swotAnalysis.update({
        where: { year: parseInt(year) },
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
    console.error('Error saving SWOT analysis:', error);
    return NextResponse.json(
      { error: 'Failed to save SWOT analysis' },
      { status: 500 }
    );
  }
}

// DELETE - Delete SWOT Analysis
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');

    if (!year) {
      return NextResponse.json(
        { error: 'Year parameter is required' },
        { status: 400 }
      );
    }

    await prisma.swotAnalysis.delete({
      where: { year: parseInt(year) },
    });

    return NextResponse.json({ message: 'SWOT analysis deleted successfully' });
  } catch (error) {
    console.error('Error deleting SWOT analysis:', error);
    return NextResponse.json(
      { error: 'Failed to delete SWOT analysis' },
      { status: 500 }
    );
  }
}
