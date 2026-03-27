/**
 * System Events Type Definitions
 * 
 * Enterprise-grade event tracking for OTS.
 * Covers all significant events across the platform for audit, debugging, compliance, and operational intelligence.
 */

// ============================================================================
// EVENT CATEGORIES
// ============================================================================

export type EventCategory =
  | 'AUTH'
  | 'PROJECT'
  | 'TASK'
  | 'PRODUCTION'
  | 'QC'
  | 'ENGINEERING'
  | 'FINANCIAL'
  | 'DOLIBARR'
  | 'PTS'
  | 'BUSINESS'
  | 'NOTIFICATION'
  | 'USER'
  | 'SYSTEM'
  | 'RISK'
  | 'KNOWLEDGE'
  | 'EXPORT';

// ============================================================================
// EVENT TYPES BY CATEGORY
// ============================================================================

// Authentication & Session Events
export type AuthEventType =
  | 'AUTH_LOGIN_SUCCESS'
  | 'AUTH_LOGIN_FAILED'
  | 'AUTH_LOGOUT'
  | 'AUTH_SESSION_EXPIRED'
  | 'AUTH_SESSION_REVOKED'
  | 'AUTH_PASSWORD_CHANGED'
  | 'AUTH_PASSWORD_RESET'
  | 'AUTH_ACCOUNT_LOCKED'
  | 'AUTH_ACCOUNT_UNLOCKED'
  | 'AUTH_ROLE_CHANGED'
  | 'AUTH_PERMISSION_CHANGED'
  | 'AUTH_API_KEY_CREATED'
  | 'AUTH_API_KEY_REVOKED';

// Project Lifecycle Events
export type ProjectEventType =
  | 'PROJECT_CREATED'
  | 'PROJECT_UPDATED'
  | 'PROJECT_STATUS_CHANGED'
  | 'PROJECT_PHASE_CHANGED'
  | 'PROJECT_ACTIVATED'
  | 'PROJECT_COMPLETED'
  | 'PROJECT_ON_HOLD'
  | 'PROJECT_CANCELLED'
  | 'PROJECT_REOPENED'
  | 'PROJECT_BUILDING_ADDED'
  | 'PROJECT_BUILDING_UPDATED'
  | 'PROJECT_BUILDING_REMOVED'
  | 'PROJECT_SCOPE_ADDED'
  | 'PROJECT_SCOPE_REMOVED'
  | 'PROJECT_SCHEDULE_CREATED'
  | 'PROJECT_SCHEDULE_UPDATED'
  | 'PROJECT_SCHEDULE_DELETED'
  | 'PROJECT_PAYMENT_CREATED'
  | 'PROJECT_PAYMENT_UPDATED'
  | 'PROJECT_PAYMENT_RECEIVED'
  | 'PROJECT_WIZARD_STARTED'
  | 'PROJECT_WIZARD_COMPLETED'
  | 'PROJECT_WIZARD_DRAFT_SAVED'
  | 'PROJECT_WIZARD_RESUMED'
  | 'PROJECT_ASSIGNED'
  | 'PROJECT_CLIENT_CHANGED'
  | 'PROJECT_CONTRACT_UPDATED'
  | 'PROJECT_DELETED'
  | 'PROJECT_RESTORED';

// Task Management Events
export type TaskEventType =
  | 'TASK_CREATED'
  | 'TASK_UPDATED'
  | 'TASK_STATUS_CHANGED'
  | 'TASK_ASSIGNED'
  | 'TASK_REASSIGNED'
  | 'TASK_PRIORITY_CHANGED'
  | 'TASK_COMPLETED'
  | 'TASK_APPROVED'
  | 'TASK_REJECTED'
  | 'TASK_DUPLICATED'
  | 'TASK_DELETED'
  | 'TASK_OVERDUE'
  | 'TASK_PRIVATE_TOGGLED'
  | 'TASK_COMMENT_ADDED'
  | 'TASK_ATTACHMENT_ADDED'
  | 'TASK_RELEASE_DATE_SET';

// Production Events
export type ProductionEventType =
  | 'PRODUCTION_LOG_CREATED'
  | 'PRODUCTION_LOG_UPDATED'
  | 'PRODUCTION_LOG_DELETED'
  | 'PRODUCTION_MASS_LOG'
  | 'PRODUCTION_IMPORT_STARTED'
  | 'PRODUCTION_IMPORT_COMPLETED'
  | 'PRODUCTION_IMPORT_FAILED'
  | 'ASSEMBLY_PART_CREATED'
  | 'ASSEMBLY_PART_UPDATED'
  | 'ASSEMBLY_PART_DELETED'
  | 'ASSEMBLY_PART_BULK_IMPORT'
  | 'WORK_ORDER_CREATED'
  | 'WORK_ORDER_UPDATED'
  | 'WORK_ORDER_STATUS_CHANGED'
  | 'WORK_ORDER_COMPLETED'
  | 'WORK_ORDER_ASSIGNED'
  | 'PRODUCTION_TARGET_SET'
  | 'PRODUCTION_TARGET_MET'
  | 'PRODUCTION_TARGET_MISSED';

// Quality Control Events
export type QCEventType =
  | 'QC_RFI_CREATED'
  | 'QC_RFI_UPDATED'
  | 'QC_RFI_STATUS_CHANGED'
  | 'QC_RFI_APPROVED'
  | 'QC_RFI_REJECTED'
  | 'QC_NCR_CREATED'
  | 'QC_NCR_UPDATED'
  | 'QC_NCR_STATUS_CHANGED'
  | 'QC_NCR_CLOSED'
  | 'QC_NCR_ESCALATED'
  | 'QC_MIR_CREATED'
  | 'QC_MIR_UPDATED'
  | 'QC_MIR_COMPLETED'
  | 'QC_MIR_ITEM_INSPECTED'
  | 'QC_MIR_ITEM_REJECTED'
  | 'QC_INSPECTION_PASSED'
  | 'QC_INSPECTION_FAILED';

// Engineering & Document Events
export type EngineeringEventType =
  | 'ENG_DOCUMENT_UPLOADED'
  | 'ENG_DOCUMENT_REVISED'
  | 'ENG_DOCUMENT_APPROVED'
  | 'ENG_DOCUMENT_REJECTED'
  | 'ENG_DOCUMENT_DELETED'
  | 'ENG_ITP_CREATED'
  | 'ENG_ITP_UPDATED'
  | 'ENG_ITP_APPROVED'
  | 'ENG_WPS_CREATED'
  | 'ENG_WPS_UPDATED'
  | 'ENG_WPS_APPROVED'
  | 'ENG_SUBMISSION_CREATED'
  | 'ENG_SUBMISSION_STATUS';

// Financial & ERP Integration Events
export type FinancialEventType =
  | 'FIN_SYNC_STARTED'
  | 'FIN_SYNC_COMPLETED'
  | 'FIN_SYNC_FAILED'
  | 'FIN_SYNC_PARTIAL'
  | 'FIN_INVOICE_SYNCED'
  | 'FIN_PAYMENT_SYNCED'
  | 'FIN_JOURNAL_GENERATED'
  | 'FIN_REPORT_GENERATED'
  | 'FIN_REPORT_EXPORTED'
  | 'FIN_ACCOUNT_MAPPING_CHANGED'
  | 'FIN_CONFIG_CHANGED'
  | 'FIN_BANK_SYNCED'
  | 'FIN_DATA_BACKFILLED'
  | 'FIN_CHART_ACCOUNT_CREATED'
  | 'FIN_CHART_ACCOUNT_UPDATED'
  | 'FIN_CHART_ACCOUNT_DELETED'
  | 'FIN_CHART_ACCOUNTS_CLEARED'
  | 'FIN_CHART_SYNCED'
  | 'FIN_PRODUCT_CATEGORY_CREATED'
  | 'FIN_PRODUCT_MAPPING_CHANGED'
  | 'FIN_SUPPLIER_CLASSIFIED';

// Dolibarr Integration Events
export type DolibarrEventType =
  | 'DOLIBARR_CONNECTED'
  | 'DOLIBARR_DISCONNECTED'
  | 'DOLIBARR_PRODUCT_SYNCED'
  | 'DOLIBARR_THIRDPARTY_SYNCED'
  | 'DOLIBARR_CONTACT_SYNCED'
  | 'DOLIBARR_SPEC_ASSIGNED'
  | 'DOLIBARR_SPEC_BULK_ASSIGNED'
  | 'DOLIBARR_API_ERROR'
  | 'DOLIBARR_API_RATE_LIMITED'
  | 'DOLIBARR_SYNC_HASH_MISMATCH';

// PTS Sync Events
export type PTSEventType =
  | 'PTS_SYNC_STARTED'
  | 'PTS_SYNC_COMPLETED'
  | 'PTS_SYNC_FAILED'
  | 'PTS_MAPPING_SAVED'
  | 'PTS_MAPPING_LOADED'
  | 'PTS_ASSEMBLY_SYNCED'
  | 'PTS_LOGS_SYNCED'
  | 'PTS_ITEMS_SKIPPED'
  | 'PTS_ROLLBACK_EXECUTED'
  | 'PTS_BUILDING_MAPPED';

// Business Planning Events
export type BusinessEventType =
  | 'BIZ_OBJECTIVE_CREATED'
  | 'BIZ_OBJECTIVE_UPDATED'
  | 'BIZ_OBJECTIVE_COMPLETED'
  | 'BIZ_OBJECTIVE_DELETED'
  | 'BIZ_STRATEGIC_OBJ_CREATED'
  | 'BIZ_STRATEGIC_OBJ_UPDATED'
  | 'BIZ_INITIATIVE_CREATED'
  | 'BIZ_INITIATIVE_UPDATED'
  | 'BIZ_INITIATIVE_STATUS'
  | 'BIZ_INITIATIVE_DELAYED'
  | 'BIZ_INITIATIVE_COMPLETED'
  | 'BIZ_KPI_CREATED'
  | 'BIZ_KPI_UPDATED'
  | 'BIZ_SWOT_UPDATED'
  | 'BIZ_PLAN_CREATED';

// Notification Events
export type NotificationEventType =
  | 'NOTIF_SENT'
  | 'NOTIF_READ'
  | 'NOTIF_DISMISSED'
  | 'NOTIF_WHATSAPP_SENT'
  | 'NOTIF_WHATSAPP_FAILED'
  | 'NOTIF_WHATSAPP_DELIVERED'
  | 'NOTIF_EMAIL_SENT'
  | 'NOTIF_EMAIL_FAILED'
  | 'NOTIF_DEADLINE_TRIGGERED'
  | 'NOTIF_AI_SUMMARY_GENERATED'
  | 'NOTIF_BATCH_SENT';

// User & RBAC Events
export type UserEventType =
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DEACTIVATED'
  | 'USER_REACTIVATED'
  | 'USER_DELETED'
  | 'USER_ADMIN_GRANTED'
  | 'USER_ADMIN_REVOKED'
  | 'ROLE_CREATED'
  | 'ROLE_UPDATED'
  | 'ROLE_DELETED'
  | 'ROLE_ASSIGNED'
  | 'ROLE_DUPLICATED'
  | 'PERMISSION_GRANTED'
  | 'PERMISSION_REVOKED'
  | 'PERMISSION_CLONED'
  | 'PBAC_RESTRICTION_CHANGED';

// System & Infrastructure Events
export type SystemEventType =
  | 'SYS_STARTUP'
  | 'SYS_SHUTDOWN'
  | 'SYS_VERSION_UPDATED'
  | 'SYS_DEPLOYMENT'
  | 'SYS_CRON_EXECUTED'
  | 'SYS_CRON_FAILED'
  | 'SYS_BACKUP_CREATED'
  | 'SYS_BACKUP_FAILED'
  | 'SYS_BACKUP_DELETED'
  | 'SYS_RESTORE_COMPLETED'
  | 'SYS_RESTORE_FAILED'
  | 'SYS_DB_CONNECTION_POOL'
  | 'SYS_MEMORY_WARNING'
  | 'SYS_MEMORY_CRITICAL'
  | 'SYS_PM2_RESTART'
  | 'SYS_ERROR_UNHANDLED'
  | 'SYS_API_ERROR'
  | 'SYS_RATE_LIMIT_HIT'
  | 'SYS_SLOW_QUERY'
  | 'SYS_DISK_SPACE_WARNING'
  | 'SYS_SSL_EXPIRY_WARNING'
  | 'SYS_CONFIG_CHANGED'
  | 'SYS_MAINTENANCE_STARTED'
  | 'SYS_MAINTENANCE_ENDED';

// Early Warning & Risk Events
export type RiskEventType =
  | 'RISK_WARNING_TRIGGERED'
  | 'RISK_WARNING_RESOLVED'
  | 'RISK_WARNING_ESCALATED'
  | 'RISK_CAPACITY_OVERLOAD'
  | 'RISK_CAPACITY_RECOVERED'
  | 'RISK_DEPENDENCY_BLOCKED'
  | 'RISK_DEPENDENCY_RESOLVED'
  | 'RISK_SCHEDULE_SLIP'
  | 'RISK_BUDGET_OVERRUN';

// Knowledge Center Events
export type KnowledgeEventType =
  | 'KC_ENTRY_CREATED'
  | 'KC_ENTRY_UPDATED'
  | 'KC_ENTRY_DELETED'
  | 'KC_ENTRY_LINKED'
  | 'KC_ENTRY_VIEWED';

// Data Export & Report Events
export type ExportEventType =
  | 'EXPORT_EXCEL_GENERATED'
  | 'EXPORT_PDF_GENERATED'
  | 'EXPORT_CSV_GENERATED'
  | 'DATA_BULK_DELETE'
  | 'DATA_BULK_UPDATE';

// Combined Event Type
export type EventType =
  | AuthEventType
  | ProjectEventType
  | TaskEventType
  | ProductionEventType
  | QCEventType
  | EngineeringEventType
  | FinancialEventType
  | DolibarrEventType
  | PTSEventType
  | BusinessEventType
  | NotificationEventType
  | UserEventType
  | SystemEventType
  | RiskEventType
  | KnowledgeEventType
  | ExportEventType;

// ============================================================================
// SEVERITY LEVELS
// ============================================================================

export type EventSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

// ============================================================================
// INTERFACES
// ============================================================================

export interface FieldChange {
  old: unknown;
  new: unknown;
}

export interface SystemEventParams {
  eventType: EventType;
  eventCategory: EventCategory;
  severity?: EventSeverity;
  
  // Who
  userId?: string;
  userName?: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  
  // What
  entityType?: string;
  entityId?: string;
  entityName?: string;
  
  // Context
  projectId?: string;
  projectNumber?: string;
  buildingId?: string;
  
  // Details
  summary: string;
  details?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  changedFields?: Record<string, FieldChange>;
  
  // Timing
  duration?: number;
  
  // Correlation
  correlationId?: string;
  parentEventId?: string;
  sessionId?: string;
}

export interface SystemEventRecord extends SystemEventParams {
  id: string;
  createdAt: Date;
}

export interface EventFilter {
  eventType?: EventType;
  eventCategory?: EventCategory;
  severity?: EventSeverity;
  userId?: string;
  entityType?: string;
  entityId?: string;
  projectId?: string;
  correlationId?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

export interface EventStats {
  todayCount: number;
  totalCount: number;
  byCategory: { category: EventCategory; count: number }[];
  byType: { eventType: EventType; count: number }[];
  bySeverity: { severity: EventSeverity; count: number }[];
  errorRate: number;
  recentErrors: SystemEventRecord[];
}

// ============================================================================
// CATEGORY MAPPING
// ============================================================================

export const EVENT_TYPE_TO_CATEGORY: Record<string, EventCategory> = {
  // Auth events
  AUTH_LOGIN_SUCCESS: 'AUTH',
  AUTH_LOGIN_FAILED: 'AUTH',
  AUTH_LOGOUT: 'AUTH',
  AUTH_SESSION_EXPIRED: 'AUTH',
  AUTH_SESSION_REVOKED: 'AUTH',
  AUTH_PASSWORD_CHANGED: 'AUTH',
  AUTH_PASSWORD_RESET: 'AUTH',
  AUTH_ACCOUNT_LOCKED: 'AUTH',
  AUTH_ACCOUNT_UNLOCKED: 'AUTH',
  AUTH_ROLE_CHANGED: 'AUTH',
  AUTH_PERMISSION_CHANGED: 'AUTH',
  AUTH_API_KEY_CREATED: 'AUTH',
  AUTH_API_KEY_REVOKED: 'AUTH',
  
  // Project events
  PROJECT_CREATED: 'PROJECT',
  PROJECT_UPDATED: 'PROJECT',
  PROJECT_STATUS_CHANGED: 'PROJECT',
  PROJECT_PHASE_CHANGED: 'PROJECT',
  PROJECT_ACTIVATED: 'PROJECT',
  PROJECT_COMPLETED: 'PROJECT',
  PROJECT_ON_HOLD: 'PROJECT',
  PROJECT_CANCELLED: 'PROJECT',
  PROJECT_REOPENED: 'PROJECT',
  PROJECT_BUILDING_ADDED: 'PROJECT',
  PROJECT_BUILDING_UPDATED: 'PROJECT',
  PROJECT_BUILDING_REMOVED: 'PROJECT',
  PROJECT_SCOPE_ADDED: 'PROJECT',
  PROJECT_SCOPE_REMOVED: 'PROJECT',
  PROJECT_SCHEDULE_CREATED: 'PROJECT',
  PROJECT_SCHEDULE_UPDATED: 'PROJECT',
  PROJECT_SCHEDULE_DELETED: 'PROJECT',
  PROJECT_PAYMENT_CREATED: 'PROJECT',
  PROJECT_PAYMENT_UPDATED: 'PROJECT',
  PROJECT_PAYMENT_RECEIVED: 'PROJECT',
  PROJECT_WIZARD_STARTED: 'PROJECT',
  PROJECT_WIZARD_COMPLETED: 'PROJECT',
  PROJECT_WIZARD_DRAFT_SAVED: 'PROJECT',
  PROJECT_WIZARD_RESUMED: 'PROJECT',
  PROJECT_ASSIGNED: 'PROJECT',
  PROJECT_CLIENT_CHANGED: 'PROJECT',
  PROJECT_CONTRACT_UPDATED: 'PROJECT',
  PROJECT_DELETED: 'PROJECT',
  PROJECT_RESTORED: 'PROJECT',
  
  // Task events
  TASK_CREATED: 'TASK',
  TASK_UPDATED: 'TASK',
  TASK_STATUS_CHANGED: 'TASK',
  TASK_ASSIGNED: 'TASK',
  TASK_REASSIGNED: 'TASK',
  TASK_PRIORITY_CHANGED: 'TASK',
  TASK_COMPLETED: 'TASK',
  TASK_APPROVED: 'TASK',
  TASK_REJECTED: 'TASK',
  TASK_DUPLICATED: 'TASK',
  TASK_DELETED: 'TASK',
  TASK_OVERDUE: 'TASK',
  TASK_PRIVATE_TOGGLED: 'TASK',
  TASK_COMMENT_ADDED: 'TASK',
  TASK_ATTACHMENT_ADDED: 'TASK',
  TASK_RELEASE_DATE_SET: 'TASK',
  
  // Production events
  PRODUCTION_LOG_CREATED: 'PRODUCTION',
  PRODUCTION_LOG_UPDATED: 'PRODUCTION',
  PRODUCTION_LOG_DELETED: 'PRODUCTION',
  PRODUCTION_MASS_LOG: 'PRODUCTION',
  PRODUCTION_IMPORT_STARTED: 'PRODUCTION',
  PRODUCTION_IMPORT_COMPLETED: 'PRODUCTION',
  PRODUCTION_IMPORT_FAILED: 'PRODUCTION',
  ASSEMBLY_PART_CREATED: 'PRODUCTION',
  ASSEMBLY_PART_UPDATED: 'PRODUCTION',
  ASSEMBLY_PART_DELETED: 'PRODUCTION',
  ASSEMBLY_PART_BULK_IMPORT: 'PRODUCTION',
  WORK_ORDER_CREATED: 'PRODUCTION',
  WORK_ORDER_UPDATED: 'PRODUCTION',
  WORK_ORDER_STATUS_CHANGED: 'PRODUCTION',
  WORK_ORDER_COMPLETED: 'PRODUCTION',
  WORK_ORDER_ASSIGNED: 'PRODUCTION',
  PRODUCTION_TARGET_SET: 'PRODUCTION',
  PRODUCTION_TARGET_MET: 'PRODUCTION',
  PRODUCTION_TARGET_MISSED: 'PRODUCTION',
  
  // QC events
  QC_RFI_CREATED: 'QC',
  QC_RFI_UPDATED: 'QC',
  QC_RFI_STATUS_CHANGED: 'QC',
  QC_RFI_APPROVED: 'QC',
  QC_RFI_REJECTED: 'QC',
  QC_NCR_CREATED: 'QC',
  QC_NCR_UPDATED: 'QC',
  QC_NCR_STATUS_CHANGED: 'QC',
  QC_NCR_CLOSED: 'QC',
  QC_NCR_ESCALATED: 'QC',
  QC_MIR_CREATED: 'QC',
  QC_MIR_UPDATED: 'QC',
  QC_MIR_COMPLETED: 'QC',
  QC_MIR_ITEM_INSPECTED: 'QC',
  QC_MIR_ITEM_REJECTED: 'QC',
  QC_INSPECTION_PASSED: 'QC',
  QC_INSPECTION_FAILED: 'QC',
  
  // Engineering events
  ENG_DOCUMENT_UPLOADED: 'ENGINEERING',
  ENG_DOCUMENT_REVISED: 'ENGINEERING',
  ENG_DOCUMENT_APPROVED: 'ENGINEERING',
  ENG_DOCUMENT_REJECTED: 'ENGINEERING',
  ENG_DOCUMENT_DELETED: 'ENGINEERING',
  ENG_ITP_CREATED: 'ENGINEERING',
  ENG_ITP_UPDATED: 'ENGINEERING',
  ENG_ITP_APPROVED: 'ENGINEERING',
  ENG_WPS_CREATED: 'ENGINEERING',
  ENG_WPS_UPDATED: 'ENGINEERING',
  ENG_WPS_APPROVED: 'ENGINEERING',
  ENG_SUBMISSION_CREATED: 'ENGINEERING',
  ENG_SUBMISSION_STATUS: 'ENGINEERING',
  
  // Financial events
  FIN_SYNC_STARTED: 'FINANCIAL',
  FIN_SYNC_COMPLETED: 'FINANCIAL',
  FIN_SYNC_FAILED: 'FINANCIAL',
  FIN_SYNC_PARTIAL: 'FINANCIAL',
  FIN_INVOICE_SYNCED: 'FINANCIAL',
  FIN_PAYMENT_SYNCED: 'FINANCIAL',
  FIN_JOURNAL_GENERATED: 'FINANCIAL',
  FIN_REPORT_GENERATED: 'FINANCIAL',
  FIN_REPORT_EXPORTED: 'FINANCIAL',
  FIN_ACCOUNT_MAPPING_CHANGED: 'FINANCIAL',
  FIN_CONFIG_CHANGED: 'FINANCIAL',
  FIN_BANK_SYNCED: 'FINANCIAL',
  FIN_DATA_BACKFILLED: 'FINANCIAL',
  FIN_CHART_ACCOUNT_CREATED: 'FINANCIAL',
  FIN_CHART_ACCOUNT_UPDATED: 'FINANCIAL',
  FIN_CHART_ACCOUNT_DELETED: 'FINANCIAL',
  FIN_CHART_ACCOUNTS_CLEARED: 'FINANCIAL',
  FIN_CHART_SYNCED: 'FINANCIAL',
  FIN_PRODUCT_CATEGORY_CREATED: 'FINANCIAL',
  FIN_PRODUCT_MAPPING_CHANGED: 'FINANCIAL',
  FIN_SUPPLIER_CLASSIFIED: 'FINANCIAL',
  
  // Dolibarr events
  DOLIBARR_CONNECTED: 'DOLIBARR',
  DOLIBARR_DISCONNECTED: 'DOLIBARR',
  DOLIBARR_PRODUCT_SYNCED: 'DOLIBARR',
  DOLIBARR_THIRDPARTY_SYNCED: 'DOLIBARR',
  DOLIBARR_CONTACT_SYNCED: 'DOLIBARR',
  DOLIBARR_SPEC_ASSIGNED: 'DOLIBARR',
  DOLIBARR_SPEC_BULK_ASSIGNED: 'DOLIBARR',
  DOLIBARR_API_ERROR: 'DOLIBARR',
  DOLIBARR_API_RATE_LIMITED: 'DOLIBARR',
  DOLIBARR_SYNC_HASH_MISMATCH: 'DOLIBARR',
  
  // PTS events
  PTS_SYNC_STARTED: 'PTS',
  PTS_SYNC_COMPLETED: 'PTS',
  PTS_SYNC_FAILED: 'PTS',
  PTS_MAPPING_SAVED: 'PTS',
  PTS_MAPPING_LOADED: 'PTS',
  PTS_ASSEMBLY_SYNCED: 'PTS',
  PTS_LOGS_SYNCED: 'PTS',
  PTS_ITEMS_SKIPPED: 'PTS',
  PTS_ROLLBACK_EXECUTED: 'PTS',
  PTS_BUILDING_MAPPED: 'PTS',
  
  // Business events
  BIZ_OBJECTIVE_CREATED: 'BUSINESS',
  BIZ_OBJECTIVE_UPDATED: 'BUSINESS',
  BIZ_OBJECTIVE_COMPLETED: 'BUSINESS',
  BIZ_OBJECTIVE_DELETED: 'BUSINESS',
  BIZ_STRATEGIC_OBJ_CREATED: 'BUSINESS',
  BIZ_STRATEGIC_OBJ_UPDATED: 'BUSINESS',
  BIZ_INITIATIVE_CREATED: 'BUSINESS',
  BIZ_INITIATIVE_UPDATED: 'BUSINESS',
  BIZ_INITIATIVE_STATUS: 'BUSINESS',
  BIZ_INITIATIVE_DELAYED: 'BUSINESS',
  BIZ_INITIATIVE_COMPLETED: 'BUSINESS',
  BIZ_KPI_CREATED: 'BUSINESS',
  BIZ_KPI_UPDATED: 'BUSINESS',
  BIZ_SWOT_UPDATED: 'BUSINESS',
  BIZ_PLAN_CREATED: 'BUSINESS',
  
  // Notification events
  NOTIF_SENT: 'NOTIFICATION',
  NOTIF_READ: 'NOTIFICATION',
  NOTIF_DISMISSED: 'NOTIFICATION',
  NOTIF_WHATSAPP_SENT: 'NOTIFICATION',
  NOTIF_WHATSAPP_FAILED: 'NOTIFICATION',
  NOTIF_WHATSAPP_DELIVERED: 'NOTIFICATION',
  NOTIF_EMAIL_SENT: 'NOTIFICATION',
  NOTIF_EMAIL_FAILED: 'NOTIFICATION',
  NOTIF_DEADLINE_TRIGGERED: 'NOTIFICATION',
  NOTIF_AI_SUMMARY_GENERATED: 'NOTIFICATION',
  NOTIF_BATCH_SENT: 'NOTIFICATION',
  
  // User events
  USER_CREATED: 'USER',
  USER_UPDATED: 'USER',
  USER_DEACTIVATED: 'USER',
  USER_REACTIVATED: 'USER',
  USER_DELETED: 'USER',
  USER_ADMIN_GRANTED: 'USER',
  USER_ADMIN_REVOKED: 'USER',
  ROLE_CREATED: 'USER',
  ROLE_UPDATED: 'USER',
  ROLE_DELETED: 'USER',
  ROLE_ASSIGNED: 'USER',
  ROLE_DUPLICATED: 'USER',
  PERMISSION_GRANTED: 'USER',
  PERMISSION_REVOKED: 'USER',
  PERMISSION_CLONED: 'USER',
  PBAC_RESTRICTION_CHANGED: 'USER',
  
  // System events
  SYS_STARTUP: 'SYSTEM',
  SYS_SHUTDOWN: 'SYSTEM',
  SYS_VERSION_UPDATED: 'SYSTEM',
  SYS_DEPLOYMENT: 'SYSTEM',
  SYS_CRON_EXECUTED: 'SYSTEM',
  SYS_CRON_FAILED: 'SYSTEM',
  SYS_BACKUP_CREATED: 'SYSTEM',
  SYS_BACKUP_FAILED: 'SYSTEM',
  SYS_BACKUP_DELETED: 'SYSTEM',
  SYS_RESTORE_COMPLETED: 'SYSTEM',
  SYS_RESTORE_FAILED: 'SYSTEM',
  SYS_DB_CONNECTION_POOL: 'SYSTEM',
  SYS_MEMORY_WARNING: 'SYSTEM',
  SYS_MEMORY_CRITICAL: 'SYSTEM',
  SYS_PM2_RESTART: 'SYSTEM',
  SYS_ERROR_UNHANDLED: 'SYSTEM',
  SYS_API_ERROR: 'SYSTEM',
  SYS_RATE_LIMIT_HIT: 'SYSTEM',
  SYS_SLOW_QUERY: 'SYSTEM',
  SYS_DISK_SPACE_WARNING: 'SYSTEM',
  SYS_SSL_EXPIRY_WARNING: 'SYSTEM',
  SYS_CONFIG_CHANGED: 'SYSTEM',
  SYS_MAINTENANCE_STARTED: 'SYSTEM',
  SYS_MAINTENANCE_ENDED: 'SYSTEM',
  
  // Risk events
  RISK_WARNING_TRIGGERED: 'RISK',
  RISK_WARNING_RESOLVED: 'RISK',
  RISK_WARNING_ESCALATED: 'RISK',
  RISK_CAPACITY_OVERLOAD: 'RISK',
  RISK_CAPACITY_RECOVERED: 'RISK',
  RISK_DEPENDENCY_BLOCKED: 'RISK',
  RISK_DEPENDENCY_RESOLVED: 'RISK',
  RISK_SCHEDULE_SLIP: 'RISK',
  RISK_BUDGET_OVERRUN: 'RISK',
  
  // Knowledge events
  KC_ENTRY_CREATED: 'KNOWLEDGE',
  KC_ENTRY_UPDATED: 'KNOWLEDGE',
  KC_ENTRY_DELETED: 'KNOWLEDGE',
  KC_ENTRY_LINKED: 'KNOWLEDGE',
  KC_ENTRY_VIEWED: 'KNOWLEDGE',
  
  // Export events
  EXPORT_EXCEL_GENERATED: 'EXPORT',
  EXPORT_PDF_GENERATED: 'EXPORT',
  EXPORT_CSV_GENERATED: 'EXPORT',
  DATA_BULK_DELETE: 'EXPORT',
  DATA_BULK_UPDATE: 'EXPORT',
};

// ============================================================================
// UI HELPERS
// ============================================================================

export const SEVERITY_COLORS: Record<EventSeverity, string> = {
  INFO: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  WARNING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  ERROR: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  CRITICAL: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
};

export const CATEGORY_COLORS: Record<EventCategory, string> = {
  AUTH: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  PROJECT: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
  TASK: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  PRODUCTION: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  QC: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  ENGINEERING: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
  FINANCIAL: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
  DOLIBARR: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  PTS: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300',
  BUSINESS: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
  NOTIFICATION: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-300',
  USER: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
  SYSTEM: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  RISK: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  KNOWLEDGE: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-300',
  EXPORT: 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-300',
};

export const EVENT_TYPE_COLORS: Record<string, string> = {
  // Created events - green
  created: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  CREATED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  
  // Updated events - blue
  updated: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  UPDATED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  
  // Deleted events - red
  deleted: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  DELETED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  
  // Synced events - cyan
  synced: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
  SYNCED: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
  
  // Approved events - emerald
  approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
  APPROVED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
  
  // Rejected events - orange
  rejected: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  REJECTED: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  
  // Failed events - red
  FAILED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  
  // Completed events - green
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  
  // Started events - blue
  STARTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  
  // Login events - gray
  LOGIN: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  LOGOUT: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
};

// Helper to get color for event type based on keywords
export function getEventTypeColor(eventType: string): string {
  const type = eventType.toUpperCase();
  
  if (type.includes('CREATED') || type.includes('CREATE')) {
    return EVENT_TYPE_COLORS.CREATED;
  }
  if (type.includes('DELETED') || type.includes('DELETE') || type.includes('REMOVED')) {
    return EVENT_TYPE_COLORS.DELETED;
  }
  if (type.includes('UPDATED') || type.includes('UPDATE') || type.includes('CHANGED')) {
    return EVENT_TYPE_COLORS.UPDATED;
  }
  if (type.includes('FAILED') || type.includes('ERROR')) {
    return EVENT_TYPE_COLORS.FAILED;
  }
  if (type.includes('COMPLETED') || type.includes('SUCCESS') || type.includes('APPROVED')) {
    return EVENT_TYPE_COLORS.COMPLETED;
  }
  if (type.includes('STARTED') || type.includes('START')) {
    return EVENT_TYPE_COLORS.STARTED;
  }
  if (type.includes('SYNC')) {
    return EVENT_TYPE_COLORS.SYNCED;
  }
  if (type.includes('REJECTED') || type.includes('REJECT')) {
    return EVENT_TYPE_COLORS.REJECTED;
  }
  if (type.includes('LOGIN') || type.includes('LOGOUT')) {
    return EVENT_TYPE_COLORS.LOGIN;
  }
  
  return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
}
