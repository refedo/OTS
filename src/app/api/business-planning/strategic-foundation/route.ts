import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Fetch Strategic Foundation
export async function GET() {
  try {
    const foundation = await prisma.strategicFoundation.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(foundation || {});
  } catch (error) {
    console.error('Error fetching strategic foundation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch strategic foundation' },
      { status: 500 }
    );
  }
}

// POST - Create or Update Strategic Foundation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vision, mission, coreValues, bhag, threeYearOutlook, strategicPillars } = body;

    // Check if foundation exists
    const existing = await prisma.strategicFoundation.findFirst();

    let foundation;
    if (existing) {
      // Update existing
      foundation = await prisma.strategicFoundation.update({
        where: { id: existing.id },
        data: {
          vision,
          mission,
          coreValues,
          bhag,
          threeYearOutlook,
          strategicPillars,
        },
      });
    } else {
      // Create new
      foundation = await prisma.strategicFoundation.create({
        data: {
          vision,
          mission,
          coreValues,
          bhag,
          threeYearOutlook,
          strategicPillars,
        },
      });
    }

    return NextResponse.json(foundation);
  } catch (error) {
    console.error('Error saving strategic foundation:', error);
    return NextResponse.json(
      { error: 'Failed to save strategic foundation' },
      { status: 500 }
    );
  }
}
