import type Anthropic from '@anthropic-ai/sdk';

export const OPS_AGENT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'get_stale_tasks',
    description:
      'Returns all tasks that are overdue or have had no activity past the configured staleness threshold. Groups by severity and assignee. Call this first in every run.',
    input_schema: {
      type: 'object',
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
    name: 'get_project_health',
    description:
      'Returns all active projects with pipeline stage, days since last progress, tonnage completion, scheduled delivery date, and days until delivery. Use to identify projects at risk.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_pipeline_stalls',
    description:
      'Returns pipeline stages where jobs have not advanced past the configured threshold days. Includes job ID, current stage, days stuck, and responsible team.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_hr_flags',
    description:
      'Returns HR issues: overtime requests pending approval past the threshold, agency slot hours not reconciled for the current month, and headcount gaps on active production jobs.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_project_status',
    description:
      'Returns project status issues: projects with no status update past threshold, erection crews with no progress events, and stage regressions since the last run.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_recent_system_events',
    description:
      'Returns the last N system events for context. Use to detect repeated failures, missing expected events, or unusual activity. Call this last.',
    input_schema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max events to return. Default 50.' },
      },
      required: [],
    },
  },
  {
    name: 'flag_record',
    description:
      '[ANNOTATE/FULL_ACTOR only] Sets a risk flag with severity and a note on an OTS entity. Do NOT call in READ_ONLY mode — include findings in the brief text instead.',
    input_schema: {
      type: 'object',
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
    name: 'create_followup_task',
    description:
      '[ANNOTATE/FULL_ACTOR only] Creates a follow-up task in OTS assigned to the responsible user. Use when a stale item has a clear owner and action.',
    input_schema: {
      type: 'object',
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
    name: 'trigger_escalation',
    description:
      '[FULL_ACTOR only] Triggers the approval escalation workflow for a blocked or overdue item. Only call if mode is FULL_ACTOR.',
    input_schema: {
      type: 'object',
      properties: {
        entity_type: { type: 'string' },
        entity_id: { type: 'string' },
        reason: { type: 'string' },
      },
      required: ['entity_type', 'entity_id', 'reason'],
    },
  },
];

export type OpsToolName = (typeof OPS_AGENT_TOOLS)[number]['name'];
