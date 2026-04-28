export const MEETING_CATEGORIES = [
  { value: 'sales', label: 'Sales Meeting' },
  { value: 'operations', label: 'Operations Meeting' },
  { value: 'project', label: 'Project Meeting' },
  { value: 'management_review', label: 'Management Review' },
  { value: 'hr', label: 'HR Meeting' },
  { value: 'quality_safety', label: 'Quality & Safety Meeting' },
  { value: 'board', label: 'Board Meeting' },
  { value: 'client', label: 'Client Meeting' },
  { value: 'supplier', label: 'Supplier Meeting' },
  { value: 'planning', label: 'Planning Session' },
  { value: 'other', label: 'Other' },
] as const;

export type MeetingCategory = (typeof MEETING_CATEGORIES)[number]['value'];
export type MeetingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type AttendeeStatus = 'invited' | 'accepted' | 'declined' | 'attended' | 'absent';
