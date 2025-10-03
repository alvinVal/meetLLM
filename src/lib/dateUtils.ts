import { format, parseISO, isValid, isSameDay, differenceInMinutes, addDays, startOfDay, endOfDay } from 'date-fns';

/**
 * Safely parse a date value that could be a Date object or ISO string
 */
export function safeParseDate(dateValue: Date | string): Date | null {
  try {
    if (typeof dateValue === 'string') {
      const parsed = parseISO(dateValue);
      return isValid(parsed) ? parsed : null;
    }
    return isValid(dateValue) ? dateValue : null;
  } catch {
    return null;
  }
}

/**
 * Format a date/string as time (e.g., "2:30 PM")
 */
export function formatTime(dateValue: Date | string): string {
  const date = safeParseDate(dateValue);
  if (!date) return 'Invalid time';
  return format(date, 'h:mm a');
}

/**
 * Format a date/string as date and time (e.g., "Oct 3, 2:30 PM")
 */
export function formatDateTime(dateValue: Date | string): string {
  const date = safeParseDate(dateValue);
  if (!date) return 'Invalid date';
  return format(date, 'MMM d, h:mm a');
}

/**
 * Format a date/string as short date (e.g., "Wed, Oct 3")
 */
export function formatShortDate(dateValue: Date | string): string {
  const date = safeParseDate(dateValue);
  if (!date) return 'Invalid date';
  return format(date, 'EEE, MMM d');
}

/**
 * Format a date/string as full date (e.g., "Wednesday, October 3, 2024")
 */
export function formatFullDate(dateValue: Date | string): string {
  const date = safeParseDate(dateValue);
  if (!date) return 'Invalid date';
  return format(date, 'EEEE, MMMM d, yyyy');
}

/**
 * Calculate duration between two dates in minutes
 */
export function getDurationMinutes(startTime: Date | string, endTime: Date | string): number {
  const start = safeParseDate(startTime);
  const end = safeParseDate(endTime);
  if (!start || !end) return 0;
  return differenceInMinutes(end, start);
}

/**
 * Format duration in a human-readable way
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}min`;
}

/**
 * Check if two dates are on the same day
 */
export function isSameDate(date1: Date | string, date2: Date | string): boolean {
  const d1 = safeParseDate(date1);
  const d2 = safeParseDate(date2);
  if (!d1 || !d2) return false;
  return isSameDay(d1, d2);
}

/**
 * Get relative date string (e.g., "Today", "Tomorrow", "Oct 5")
 */
export function getRelativeDateString(dateValue: Date | string): string {
  const date = safeParseDate(dateValue);
  if (!date) return 'Invalid date';
  
  const today = new Date();
  const tomorrow = addDays(today, 1);
  
  if (isSameDay(date, today)) {
    return 'Today';
  } else if (isSameDay(date, tomorrow)) {
    return 'Tomorrow';
  } else {
    return format(date, 'MMM d');
  }
}

/**
 * Check if a date is within a time range
 */
export function isDateInRange(
  dateToCheck: Date | string,
  rangeStart: Date | string,
  rangeEnd: Date | string
): boolean {
  const check = safeParseDate(dateToCheck);
  const start = safeParseDate(rangeStart);
  const end = safeParseDate(rangeEnd);
  
  if (!check || !start || !end) return false;
  
  return check >= start && check <= end;
}

/**
 * Get start and end of day for a given date
 */
export function getDayBounds(dateValue: Date | string): { start: Date; end: Date } | null {
  const date = safeParseDate(dateValue);
  if (!date) return null;
  
  return {
    start: startOfDay(date),
    end: endOfDay(date)
  };
}

/**
 * Convert a time string (HH:mm) to a Date object for today
 */
export function timeStringToDate(timeString: string, baseDate?: Date): Date | null {
  try {
    const [hours, minutes] = timeString.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return null;
    
    const date = baseDate ? new Date(baseDate) : new Date();
    date.setHours(hours, minutes, 0, 0);
    
    return date;
  } catch {
    return null;
  }
}

/**
 * Format a Date object to HH:mm string
 */
export function dateToTimeString(dateValue: Date | string): string {
  const date = safeParseDate(dateValue);
  if (!date) return '00:00';
  return format(date, 'HH:mm');
}
