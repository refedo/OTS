// Date utilities for the Detailed Project Planner
// Saudi work week: Saturday (6) through Thursday (4), Friday (5) is weekend

/**
 * Check if a date is a working day (Saudi work week: Sat-Thu)
 * Friday (day 5) is the weekend
 */
export function isWorkingDay(date: Date): boolean {
  return date.getDay() !== 5; // 5 = Friday
}

/**
 * Check if a date is a weekend (Friday in Saudi calendar)
 */
export function isWeekend(date: Date): boolean {
  return date.getDay() === 5;
}

/**
 * Get the next working day from a given date
 */
export function nextWorkingDay(date: Date): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  while (!isWorkingDay(next)) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

/**
 * Calculate working days between two dates (inclusive of start, exclusive of end)
 */
export function workingDaysBetween(start: Date, end: Date): number {
  if (end <= start) return 0;
  let count = 0;
  const current = new Date(start);
  while (current < end) {
    if (isWorkingDay(current)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}

/**
 * Calculate calendar days between two dates
 */
export function daysBetween(start: Date, end: Date): number {
  const msPerDay = 86400000;
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((endUtc - startUtc) / msPerDay);
}

/**
 * Add working days to a date and return the end date
 */
export function addWorkingDays(start: Date, days: number): Date {
  if (days <= 0) return new Date(start);
  const result = new Date(start);
  let remaining = days;
  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    if (isWorkingDay(result)) {
      remaining--;
    }
  }
  return result;
}

/**
 * Calculate duration in working days from start and end dates
 * Returns decimal precision like MS Project (e.g., 7.38 days)
 */
export function calculateDuration(start: Date, end: Date): number {
  const calendarDays = daysBetween(start, end);
  if (calendarDays <= 0) return 0;
  
  // Count working days
  const wDays = workingDaysBetween(start, end);
  
  // Calculate the fractional part based on calendar days vs working days ratio
  // MS Project uses a 6-day work week for Saudi, so 1 week = 6 working days
  const weeks = Math.floor(calendarDays / 7);
  const remainingCalDays = calendarDays % 7;
  
  let remainingWorkDays = 0;
  const tempDate = new Date(start);
  tempDate.setDate(tempDate.getDate() + weeks * 7);
  for (let i = 0; i < remainingCalDays; i++) {
    if (isWorkingDay(tempDate)) {
      remainingWorkDays++;
    }
    tempDate.setDate(tempDate.getDate() + 1);
  }
  
  return wDays;
}

/**
 * Format date as "ddd M/D/YY" (e.g., "Mon 1/19/26")
 */
export function formatDateMSProject(date: Date | string | null): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayName = days[d.getDay()];
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const year = d.getFullYear() % 100;
  
  return `${dayName} ${month}/${day}/${year}`;
}

/**
 * Format duration as "X.XX days" or "0 days" for milestones
 */
export function formatDuration(days: number | null): string {
  if (days === null || days === undefined) return '';
  if (days === 0) return '0 days';
  return `${Number(days).toFixed(2)} days`;
}

/**
 * Parse a date string to Date object (handles various formats)
 */
export function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Get date as YYYY-MM-DD string for API/DB
 */
export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Get the start of the month for a given date
 */
export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Get the end of the month for a given date
 */
export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/**
 * Get month name and year string (e.g., "January 2026")
 */
export function getMonthYearLabel(date: Date): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Generate an array of dates between start and end (inclusive)
 */
export function getDateRange(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(start);
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

/**
 * Check if two dates are the same calendar day
 */
export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}
