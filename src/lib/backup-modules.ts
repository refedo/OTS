export type BackupModule = {
  id: string;
  label: string;
  tables: string[];
};

export const BACKUP_MODULES: BackupModule[] = [
  {
    id: 'users',
    label: 'Users & Roles',
    tables: ['role', 'user', 'department', 'password_reset_token', 'user_dashboard_widgets', 'user_notification_preferences', 'push_subscriptions'],
  },
  {
    id: 'projects',
    label: 'Projects & Buildings',
    tables: ['client', 'project', 'building', 'scope_schedule', 'project_assignment', 'project_plan', 'planner_project', 'planner_task'],
  },
  {
    id: 'tasks',
    label: 'Tasks',
    tables: ['task', 'task_attachments', 'task_audit_log'],
  },
  {
    id: 'production',
    label: 'Production',
    tables: ['assembly_part', 'production_log', 'processing_teams', 'processing_locations', 'work_order', 'work_order_part'],
  },
  {
    id: 'quality',
    label: 'Quality Control',
    tables: ['itp', 'itp_activity', 'wps', 'wps_pass', 'rfi_request', 'rfi_production_log', 'ncr_report', 'material_inspection', 'material_inspection_receipts', 'material_inspection_receipt_items', 'material_inspection_receipt_attachments', 'welding_inspection', 'dimensional_inspection', 'ndt_inspection'],
  },
  {
    id: 'documents',
    label: 'Documents',
    tables: ['document_category', 'document', 'document_reference', 'document_submission', 'document_revision'],
  },
  {
    id: 'business',
    label: 'Business Planning',
    tables: ['strategic_foundation', 'swot_analysis', 'annual_plans', 'strategic_objectives', 'company_objective', 'key_results', 'key_result_progress', 'kpi_definition', 'kpi_score', 'kpi_target', 'kpi_manual_entry', 'kpi_history', 'kpi_alert', 'balanced_scorecard_kpis', 'bsc_kpi_measurements', 'annual_initiatives', 'initiative_objectives', 'initiative', 'initiative_milestone', 'initiative_task', 'department_plans', 'department_objectives', 'department_kpis', 'department_kpi_measurements', 'department_initiatives', 'weekly_issues'],
  },
  {
    id: 'operations',
    label: 'Operations Control',
    tables: ['operation_event', 'operation_stage_config', 'operation_event_audit', 'work_units', 'work_unit_dependencies', 'resource_capacities', 'dependency_blueprints', 'dependency_blueprint_steps', 'risk_events'],
  },
  {
    id: 'ai_knowledge',
    label: 'AI & Knowledge Center',
    tables: ['ai_interactions', 'knowledge_entry', 'knowledge_application', 'risk_pattern', 'risk_pattern_entry'],
  },
  {
    id: 'supply_chain',
    label: 'Supply Chain',
    tables: ['lcr_entries', 'lcr_alias_map', 'lcr_sync_logs'],
  },
  {
    id: 'backlog',
    label: 'Product Backlog',
    tables: ['product_backlog_item'],
  },
  {
    id: 'notifications',
    label: 'Notifications',
    tables: ['notifications'],
  },
  {
    id: 'system',
    label: 'System & Audit Logs',
    tables: ['system_settings', 'system_versions', 'audit_log', 'entity_version', 'system_event', 'pts_sync_configs', 'pts_sync_logs', 'pts_sync_batch'],
  },
];

export function getTablesForModules(moduleIds: string[]): string[] {
  return BACKUP_MODULES
    .filter(m => moduleIds.includes(m.id))
    .flatMap(m => m.tables);
}
