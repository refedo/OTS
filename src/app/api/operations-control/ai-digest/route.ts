/**
 * AI Risk Digest API Route
 * 
 * GET /api/operations-control/ai-digest - Get AI-generated risk digest
 * POST /api/operations-control/ai-digest - Generate new AI digest
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';

// Helper to get reference name
async function getReferenceName(referenceModule: string, referenceId: string): Promise<string> {
  try {
    switch (referenceModule) {
      case 'Task':
        const task = await prisma.task.findUnique({
          where: { id: referenceId },
          select: { title: true },
        });
        return task?.title || referenceId;
      case 'WorkOrder':
        const workOrder = await prisma.workOrder.findUnique({
          where: { id: referenceId },
          select: { workOrderNumber: true },
        });
        return workOrder?.workOrderNumber || referenceId;
      case 'RFIRequest':
        const rfi = await prisma.rFIRequest.findUnique({
          where: { id: referenceId },
          select: { rfiNumber: true },
        });
        return rfi?.rfiNumber || referenceId;
      case 'DocumentSubmission':
        const doc = await prisma.documentSubmission.findUnique({
          where: { id: referenceId },
          select: { submissionNumber: true, title: true },
        });
        return doc?.submissionNumber || doc?.title || referenceId;
      case 'AssemblyPart':
        const part = await prisma.assemblyPart.findUnique({
          where: { id: referenceId },
          select: { partDesignation: true, name: true },
        });
        return part?.partDesignation || part?.name || referenceId;
      default:
        return referenceId;
    }
  } catch {
    return referenceId;
  }
}

// Build AI-friendly risk summary
async function buildRiskDigest() {
  // Get all active risks
  const risks = await prisma.riskEvent.findMany({
    where: { resolvedAt: null },
    orderBy: [
      { severity: 'desc' },
      { detectedAt: 'desc' },
    ],
  });

  // Get affected work units with details
  const allWorkUnitIds = new Set<string>();
  risks.forEach(r => {
    const ids = r.affectedWorkUnitIds as string[];
    ids.forEach(id => allWorkUnitIds.add(id));
  });

  const workUnits = await prisma.workUnit.findMany({
    where: { id: { in: Array.from(allWorkUnitIds) } },
    include: {
      project: { select: { projectNumber: true, name: true } },
      owner: { select: { name: true } },
    },
  });

  // Enrich work units with reference names
  const enrichedWorkUnits = await Promise.all(
    workUnits.map(async wu => ({
      ...wu,
      referenceName: await getReferenceName(wu.referenceModule, wu.referenceId),
    }))
  );

  const workUnitMap = new Map(enrichedWorkUnits.map(wu => [wu.id, wu]));

  // Get project details
  const allProjectIds = new Set<string>();
  risks.forEach(r => {
    const ids = r.affectedProjectIds as string[];
    ids.forEach(id => allProjectIds.add(id));
  });

  const projects = await prisma.project.findMany({
    where: { id: { in: Array.from(allProjectIds) } },
    select: {
      id: true,
      projectNumber: true,
      name: true,
      client: { select: { name: true } },
    },
  });

  const projectMap = new Map(projects.map(p => [p.id, p]));

  // Build digest sections
  const criticalRisks = risks.filter(r => r.severity === 'CRITICAL');
  const highRisks = risks.filter(r => r.severity === 'HIGH');
  const mediumRisks = risks.filter(r => r.severity === 'MEDIUM');
  const lowRisks = risks.filter(r => r.severity === 'LOW');

  // Helper to enrich text with names
  const enrichText = (text: string, workUnitIds: string[]) => {
    let enrichedText = text;
    
    // Extract Module:ID patterns from text
    const moduleIdPattern = /(Task|WorkOrder|RFIRequest|DocumentSubmission|AssemblyPart):([a-f0-9-]{36})/gi;
    const matches = [...text.matchAll(moduleIdPattern)];
    
    // Replace Module:ID patterns
    for (const match of matches) {
      const module = match[1];
      const refId = match[2];
      
      // Find work unit with this reference
      const wu = Array.from(workUnitMap.values()).find(
        w => w.referenceId === refId && w.referenceModule === module
      );
      
      if (wu) {
        enrichedText = enrichedText.replace(
          new RegExp(`${module}:${refId}`, 'gi'),
          `${module} "${wu.referenceName}"`
        );
      }
    }
    
    // Replace WorkUnit IDs with names
    workUnitIds.forEach(id => {
      const wu = workUnitMap.get(id);
      if (wu) {
        // Replace WorkUnit "id" pattern
        enrichedText = enrichedText.replace(
          new RegExp(`WorkUnit\\s*["']${id}["']`, 'gi'),
          `${wu.referenceModule} "${wu.referenceName}"`
        );
        
        // Replace bare UUIDs that match work unit IDs
        enrichedText = enrichedText.replace(
          new RegExp(`"${id}"`, 'g'),
          `"${wu.referenceName}"`
        );
        
        // Replace bare UUID (only if it's a standalone UUID)
        enrichedText = enrichedText.replace(
          new RegExp(`\\b${id}\\b`, 'g'),
          `"${wu.referenceName}"`
        );
      }
    });
    
    return enrichedText;
  };

  // Format risks with human-readable names
  const formatRisk = (risk: typeof risks[0]) => {
    const projectIds = risk.affectedProjectIds as string[];
    const workUnitIds = risk.affectedWorkUnitIds as string[];
    
    const projectNames = projectIds
      .map(id => projectMap.get(id))
      .filter(Boolean)
      .map(p => `${p!.projectNumber} (${p!.name})`);

    const workUnitNames = workUnitIds
      .map(id => workUnitMap.get(id))
      .filter(Boolean)
      .map(wu => `${wu!.referenceName} [${wu!.type}]`);

    // Enrich both reason and recommendedAction
    const enrichedReason = enrichText(risk.reason, workUnitIds);
    const enrichedAction = enrichText(risk.recommendedAction, workUnitIds);

    return {
      id: risk.id,
      severity: risk.severity,
      type: risk.type,
      reason: enrichedReason,
      recommendedAction: enrichedAction,
      affectedProjects: projectNames,
      affectedWorkUnits: workUnitNames,
      detectedAt: risk.detectedAt,
    };
  };

  // Build executive summary
  const executiveSummary = {
    totalActiveRisks: risks.length,
    criticalCount: criticalRisks.length,
    highCount: highRisks.length,
    affectedProjectCount: projects.length,
    topConcerns: criticalRisks.slice(0, 3).map(formatRisk),
  };

  // Build detailed sections
  const sections = {
    critical: criticalRisks.map(formatRisk),
    high: highRisks.map(formatRisk),
    medium: mediumRisks.map(formatRisk),
    low: lowRisks.map(formatRisk),
  };

  // Build AI prompt context
  const aiContext = `
# Operations Control Risk Digest
Generated: ${new Date().toISOString()}

## Executive Summary
- Total Active Risks: ${executiveSummary.totalActiveRisks}
- Critical Risks: ${executiveSummary.criticalCount}
- High Risks: ${executiveSummary.highCount}
- Affected Projects: ${executiveSummary.affectedProjectCount}

## Critical Risks (Immediate Attention Required)
${sections.critical.length === 0 ? 'None' : sections.critical.map((r, i) => `
${i + 1}. [${r.type}] ${r.reason}
   - Projects: ${r.affectedProjects.join(', ')}
   - Work Units: ${r.affectedWorkUnits.join(', ')}
   - Recommended: ${r.recommendedAction}
`).join('')}

## High Priority Risks
${sections.high.length === 0 ? 'None' : sections.high.map((r, i) => `
${i + 1}. [${r.type}] ${r.reason}
   - Projects: ${r.affectedProjects.join(', ')}
   - Recommended: ${r.recommendedAction}
`).join('')}

## Medium Priority Risks
${sections.medium.length === 0 ? 'None' : `${sections.medium.length} items requiring attention`}

## Low Priority Risks
${sections.low.length === 0 ? 'None' : `${sections.low.length} items for monitoring`}
`.trim();

  return {
    executiveSummary,
    sections,
    aiContext,
    generatedAt: new Date().toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const cookieName = process.env.COOKIE_NAME || 'ots_session';
    const store = await cookies();
    const token = store.get(cookieName)?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const digest = await buildRiskDigest();
    return NextResponse.json(digest);
  } catch (error) {
    console.error('Error generating AI digest:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate AI digest' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieName = process.env.COOKIE_NAME || 'ots_session';
    const store = await cookies();
    const token = store.get(cookieName)?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate fresh digest
    const digest = await buildRiskDigest();

    // Optionally send to AI for analysis (if AI endpoint is configured)
    // This is a placeholder for future AI integration
    const aiAnalysis = {
      generated: true,
      timestamp: new Date().toISOString(),
      recommendations: digest.sections.critical.map(r => r.recommendedAction),
    };

    return NextResponse.json({
      ...digest,
      aiAnalysis,
    });
  } catch (error) {
    console.error('Error generating AI digest:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate AI digest' },
      { status: 500 }
    );
  }
}
