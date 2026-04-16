import { logger } from '@/lib/logger';

const log = logger.child({ module: 'OpsAgentParsers' });

export interface OpsBriefItem {
  entityType: string;
  entityId: string;
  label: string;
  reason: string;
}

export interface OpsModuleItems {
  [key: string]: unknown;
}

export interface OpsBrief {
  summary: string;
  earlyWarning: {
    red: OpsBriefItem[];
    amber: OpsBriefItem[];
    green: OpsBriefItem[];
  };
  modules: {
    tasks: { total: number; critical: number; stale: number; blocked: number; items: OpsModuleItems[] };
    projects: { total: number; atRisk: number; onTrack: number; items: OpsModuleItems[] };
    hr: { otPending: number; agencyUnreconciled: number; headcountGaps: number; items: OpsModuleItems[] };
    pipeline: { stalled: number; items: OpsModuleItems[] };
  };
  recommendedActions: Array<{ priority: string; action: string; relatedEntity: string }>;
  actionsExecuted: OpsModuleItems[];
}

const EMPTY_BRIEF: OpsBrief = {
  summary: 'Unable to parse agent output.',
  earlyWarning: { red: [], amber: [], green: [] },
  modules: {
    tasks: { total: 0, critical: 0, stale: 0, blocked: 0, items: [] },
    projects: { total: 0, atRisk: 0, onTrack: 0, items: [] },
    hr: { otPending: 0, agencyUnreconciled: 0, headcountGaps: 0, items: [] },
    pipeline: { stalled: 0, items: [] },
  },
  recommendedActions: [],
  actionsExecuted: [],
};

export function parseAgentBrief(rawText: string): OpsBrief {
  if (!rawText || !rawText.trim()) {
    log.warn({}, 'Agent produced empty output');
    return EMPTY_BRIEF;
  }

  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    log.warn({ rawText: rawText.slice(0, 200) }, 'No JSON found in agent output');
    return { ...EMPTY_BRIEF, summary: rawText.slice(0, 300) };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as Partial<OpsBrief>;
    return {
      summary: parsed.summary ?? 'No summary provided.',
      earlyWarning: parsed.earlyWarning ?? { red: [], amber: [], green: [] },
      modules: parsed.modules ?? EMPTY_BRIEF.modules,
      recommendedActions: parsed.recommendedActions ?? [],
      actionsExecuted: parsed.actionsExecuted ?? [],
    };
  } catch (error) {
    log.error({ error, rawText: rawText.slice(0, 300) }, 'Failed to parse agent JSON output');
    return { ...EMPTY_BRIEF, summary: rawText.slice(0, 300) };
  }
}
