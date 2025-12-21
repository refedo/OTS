/**
 * Risk Summary Builder for AI Assistant
 * 
 * Provides structured, pre-formatted risk summaries that the AI can use
 * to ensure consistent, accurate, and non-hallucinated responses.
 */

import prisma from '@/lib/db';

export interface FormattedRiskSummary {
  overview: string;
  criticalRisks: FormattedRisk[];
  highRisks: FormattedRisk[];
  affectedProjects: ProjectRiskCount[];
  recommendedActions: string[];
  generatedAt: string;
}

export interface FormattedRisk {
  id: string;
  severity: string;
  type: string;
  reason: string;
  recommendedAction: string;
  affectedProjectNumbers: string[];
  detectedAt: string;
}

export interface ProjectRiskCount {
  projectId: string;
  projectNumber: string;
  projectName: string;
  riskCount: number;
  criticalCount: number;
  highCount: number;
}

/**
 * Build a structured risk summary for AI consumption
 * This ensures the AI has pre-formatted, accurate data to report
 */
export async function buildRiskSummaryForAI(): Promise<FormattedRiskSummary> {
  const now = new Date();

  // Get all active risk events
  const riskEvents = await prisma.riskEvent.findMany({
    where: { resolvedAt: null },
    orderBy: [
      { severity: 'desc' },
      { detectedAt: 'desc' },
    ],
  });

  // Get project details for affected projects
  const allProjectIds = new Set<string>();
  riskEvents.forEach((r) => {
    const projectIds = r.affectedProjectIds as string[];
    projectIds.forEach((id) => allProjectIds.add(id));
  });

  const projects = await prisma.project.findMany({
    where: { id: { in: Array.from(allProjectIds) } },
    select: {
      id: true,
      projectNumber: true,
      name: true,
    },
  });

  const projectMap = new Map(projects.map((p) => [p.id, p]));

  // Format risks
  const formatRisk = (r: typeof riskEvents[0]): FormattedRisk => {
    const projectIds = r.affectedProjectIds as string[];
    const projectNumbers = projectIds
      .map((id) => projectMap.get(id)?.projectNumber || 'Unknown')
      .filter((n) => n !== 'Unknown');

    return {
      id: r.id,
      severity: r.severity,
      type: r.type,
      reason: r.reason,
      recommendedAction: r.recommendedAction,
      affectedProjectNumbers: projectNumbers,
      detectedAt: r.detectedAt.toISOString(),
    };
  };

  const criticalRisks = riskEvents
    .filter((r) => r.severity === 'CRITICAL')
    .map(formatRisk);

  const highRisks = riskEvents
    .filter((r) => r.severity === 'HIGH')
    .map(formatRisk);

  // Count risks per project
  const projectRiskCounts = new Map<string, { total: number; critical: number; high: number }>();
  
  riskEvents.forEach((r) => {
    const projectIds = r.affectedProjectIds as string[];
    projectIds.forEach((id) => {
      const current = projectRiskCounts.get(id) || { total: 0, critical: 0, high: 0 };
      current.total++;
      if (r.severity === 'CRITICAL') current.critical++;
      if (r.severity === 'HIGH') current.high++;
      projectRiskCounts.set(id, current);
    });
  });

  const affectedProjects: ProjectRiskCount[] = Array.from(projectRiskCounts.entries())
    .map(([id, counts]) => {
      const project = projectMap.get(id);
      return {
        projectId: id,
        projectNumber: project?.projectNumber || 'Unknown',
        projectName: project?.name || 'Unknown',
        riskCount: counts.total,
        criticalCount: counts.critical,
        highCount: counts.high,
      };
    })
    .sort((a, b) => b.criticalCount - a.criticalCount || b.riskCount - a.riskCount);

  // Collect unique recommended actions from critical and high risks
  const recommendedActions = [...new Set([
    ...criticalRisks.map((r) => r.recommendedAction),
    ...highRisks.map((r) => r.recommendedAction),
  ])];

  // Build overview text
  const severityCounts = {
    CRITICAL: riskEvents.filter((r) => r.severity === 'CRITICAL').length,
    HIGH: riskEvents.filter((r) => r.severity === 'HIGH').length,
    MEDIUM: riskEvents.filter((r) => r.severity === 'MEDIUM').length,
    LOW: riskEvents.filter((r) => r.severity === 'LOW').length,
  };

  const typeCounts = {
    DELAY: riskEvents.filter((r) => r.type === 'DELAY').length,
    BOTTLENECK: riskEvents.filter((r) => r.type === 'BOTTLENECK').length,
    DEPENDENCY: riskEvents.filter((r) => r.type === 'DEPENDENCY').length,
    OVERLOAD: riskEvents.filter((r) => r.type === 'OVERLOAD').length,
  };

  let overview = `As of ${now.toISOString()}, the Early Warning Engine has detected ${riskEvents.length} active risk(s).\n\n`;
  
  if (riskEvents.length === 0) {
    overview += 'No active risks detected. All operations are within normal parameters.';
  } else {
    overview += `**By Severity:**\n`;
    overview += `- CRITICAL: ${severityCounts.CRITICAL}\n`;
    overview += `- HIGH: ${severityCounts.HIGH}\n`;
    overview += `- MEDIUM: ${severityCounts.MEDIUM}\n`;
    overview += `- LOW: ${severityCounts.LOW}\n\n`;
    
    overview += `**By Type:**\n`;
    overview += `- DELAY (Late start/deadline): ${typeCounts.DELAY}\n`;
    overview += `- BOTTLENECK (Critical path): ${typeCounts.BOTTLENECK}\n`;
    overview += `- DEPENDENCY (Cascade risk): ${typeCounts.DEPENDENCY}\n`;
    overview += `- OVERLOAD (Capacity exceeded): ${typeCounts.OVERLOAD}\n\n`;
    
    overview += `**Affected Projects:** ${affectedProjects.length}\n`;
    overview += `**Immediate Attention Required:** ${severityCounts.CRITICAL + severityCounts.HIGH} risk(s)`;
  }

  return {
    overview,
    criticalRisks,
    highRisks,
    affectedProjects,
    recommendedActions,
    generatedAt: now.toISOString(),
  };
}

/**
 * Get a plain-text risk report suitable for AI context
 */
export async function getRiskReportText(): Promise<string> {
  const summary = await buildRiskSummaryForAI();

  let report = `# EARLY WARNING ENGINE RISK REPORT\n`;
  report += `Generated: ${summary.generatedAt}\n\n`;
  report += `## OVERVIEW\n${summary.overview}\n\n`;

  if (summary.criticalRisks.length > 0) {
    report += `## CRITICAL RISKS (Immediate Action Required)\n`;
    summary.criticalRisks.forEach((r, i) => {
      report += `\n### Risk ${i + 1}: ${r.type}\n`;
      report += `- **ID:** ${r.id}\n`;
      report += `- **Affected Projects:** ${r.affectedProjectNumbers.join(', ') || 'N/A'}\n`;
      report += `- **Detected:** ${r.detectedAt}\n`;
      report += `- **Reason:** ${r.reason}\n`;
      report += `- **Recommended Action:** ${r.recommendedAction}\n`;
    });
    report += '\n';
  }

  if (summary.highRisks.length > 0) {
    report += `## HIGH PRIORITY RISKS\n`;
    summary.highRisks.forEach((r, i) => {
      report += `\n### Risk ${i + 1}: ${r.type}\n`;
      report += `- **ID:** ${r.id}\n`;
      report += `- **Affected Projects:** ${r.affectedProjectNumbers.join(', ') || 'N/A'}\n`;
      report += `- **Detected:** ${r.detectedAt}\n`;
      report += `- **Reason:** ${r.reason}\n`;
      report += `- **Recommended Action:** ${r.recommendedAction}\n`;
    });
    report += '\n';
  }

  if (summary.affectedProjects.length > 0) {
    report += `## PROJECTS AT RISK\n`;
    summary.affectedProjects.forEach((p) => {
      report += `- **${p.projectNumber}** (${p.projectName}): ${p.riskCount} risk(s)`;
      if (p.criticalCount > 0) report += ` [${p.criticalCount} CRITICAL]`;
      if (p.highCount > 0) report += ` [${p.highCount} HIGH]`;
      report += '\n';
    });
    report += '\n';
  }

  if (summary.recommendedActions.length > 0) {
    report += `## RECOMMENDED ACTIONS\n`;
    summary.recommendedActions.forEach((action, i) => {
      report += `${i + 1}. ${action}\n`;
    });
  }

  return report;
}

export default { buildRiskSummaryForAI, getRiskReportText };
