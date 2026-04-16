export const OPS_AGENT_TOOLS = [
  {
    type: 'custom' as const,
    name: 'get_stale_tasks',
    description:
      'Returns all tasks that are overdue or have had no activity logged past the configured staleness threshold. Groups by severity and assignee. Use this first in every run. Do NOT call this more than once per session.',
    input_schema: {
      type: 'object' as const,
      properties: {
        include_details: {
          type: 'boolean',
          description: 'If true, include full task metadata. Default true.',
        },
      },
      required: [],
    },
  },
  {
    type: 'custom' as const,
    name: 'get_project_health',
    description:
      'Returns all active projects with their current pipeline stage, days since last progress event, tonnage completion percentage, scheduled delivery date, and days until delivery. Use to identify projects at risk of missing delivery. Do NOT call more than once per session.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    type: 'custom' as const,
    name: 'get_pipeline_stalls',
    description:
      'Returns PEB pipeline stages (11 stages) where jobs have not advanced past the configured threshold days. Includes job ID, current stage, days stuck, and responsible team. Use alongside get_project_health.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    type: 'custom' as const,
    name: 'get_hr_flags',
    description:
      'Returns HR issues: overtime requests pending approval past the configured hour threshold, agency slot hours not reconciled for the current month, and headcount gaps on active production jobs.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    type: 'custom' as const,
    name: 'get_project_status',
    description:
      'Returns project status tracker issues: projects with no status update past threshold, erection crews deployed with no progress events fired, and stage regressions detected since the last run.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    type: 'custom' as const,
    name: 'get_recent_system_events',
    description:
      'Returns the last N system events for context. Use to detect patterns such as repeated failures, missing expected events, or unusual activity. Call this last, after all module tools.',
    input_schema: {
      type: 'object' as const,
      properties: {
        limit: { type: 'number', description: 'Max events to return. Default 50.' },
      },
      required: [],
    },
  },
  {
    type: 'custom' as const,
    name: 'flag_record',
    description:
      '[LEVEL 2+ ONLY] Sets a risk flag with severity and a note on an OTS entity (task, project, HR request, pipeline stage). Only call this if your current mode is ANNOTATE or FULL_ACTOR. If mode is READ_ONLY, do NOT call this — instead include the recommendation in your brief text only.',
    input_schema: {
      type: 'object' as const,
      properties: {
        entity_type: { type: 'string', enum: ['task', 'project', 'hr_request', 'pipeline_stage'] },
        entity_id: { type: 'string', description: 'The OTS record ID' },
        entity_label: { type: 'string', description: 'Human-readable name for display' },
        severity: { type: 'string', enum: ['RED', 'AMBER', 'GREEN'] },
        note: { type: 'string', description: 'Explanation of why this is flagged' },
        module: { type: 'string', enum: ['tasks', 'projects', 'hr', 'pipeline'] },
      },
      required: ['entity_type', 'entity_id', 'entity_label', 'severity', 'note', 'module'],
    },
  },
  {
    type: 'custom' as const,
    name: 'create_followup_task',
    description:
      '[LEVEL 2+ ONLY] Creates a follow-up task in OTS assigned to the responsible user. Use only when a stale item has a clear owner and action. Only call if mode is ANNOTATE or FULL_ACTOR.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        assigned_to: { type: 'string', description: 'userId of the responsible person' },
        related_entity_type: { type: 'string' },
        related_entity_id: { type: 'string' },
        priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
      },
      required: ['title', 'description', 'assigned_to', 'priority'],
    },
  },
  {
    type: 'custom' as const,
    name: 'trigger_escalation',
    description:
      '[LEVEL 3 ONLY] Triggers the approval escalation workflow for a blocked or overdue item. Only call if mode is FULL_ACTOR and the workflow engine is available. Check mode before calling.',
    input_schema: {
      type: 'object' as const,
      properties: {
        entity_type: { type: 'string' },
        entity_id: { type: 'string' },
        reason: { type: 'string' },
      },
      required: ['entity_type', 'entity_id', 'reason'],
    },
  },
] as const;

export type OpsToolName = (typeof OPS_AGENT_TOOLS)[number]['name'];
