/**
 * Shared date utilities for rule computation.
 * All functions operate on UTC dates.
 */

/** Get 0-based day-of-year (Jan 1 = 0) */
export function dayOfYear(date: Date): number {
    const start = Date.UTC(date.getUTCFullYear(), 0, 1);
    const current = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    return Math.floor((current - start) / 86400000);
}

/** Format a date as "MM-DD" to match Immovables.csv keys */
export function formatMMDD(date: Date): string {
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${m}-${d}`;
}

/** Get UTC day of week (0=Sunday) */
export function getDow(date: Date): number {
    return date.getUTCDay();
}

/** Create a UTC date */
export function utcDate(year: number, month: number, day: number): Date {
    return new Date(Date.UTC(year, month, day));
}

/** Number of days in a year */
export function daysInYear(year: number): number {
    return isLeapYear(year) ? 366 : 365;
}

export function isLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/**
 * Find the Sunday that falls within a date range (inclusive). Returns null if none.
 * If crossYear is true, handles ranges that span Dec→Jan (uses year for start, year+1 or year for end).
 */
export function findSundayInRange(year: number, startMonth: number, startDay: number, endMonth: number, endDay: number, crossYear?: boolean): Date | null {
    return findDayInRange(year, startMonth, startDay, endMonth, endDay, 0, crossYear);
}

/** Find the Saturday that falls within a date range (inclusive). Returns null if none. */
export function findSaturdayInRange(year: number, startMonth: number, startDay: number, endMonth: number, endDay: number, crossYear?: boolean): Date | null {
    return findDayInRange(year, startMonth, startDay, endMonth, endDay, 6, crossYear);
}

/** Find a specific day-of-week (0=Sun, 6=Sat) within a date range. */
function findDayInRange(year: number, startMonth: number, startDay: number, endMonth: number, endDay: number, dow: number, crossYear?: boolean): Date | null {
    const startYear = year;
    const endYear = crossYear && endMonth < startMonth ? year + 1 : year;
    const start = utcDate(startYear, startMonth - 1, startDay);
    const end = utcDate(endYear, endMonth - 1, endDay);
    const current = new Date(start);
    while (current.getTime() <= end.getTime()) {
        if (current.getUTCDay() === dow) return new Date(current);
        current.setUTCDate(current.getUTCDate() + 1);
    }
    return null;
}

/** Get the Nth Sunday of a given month (1-based N) */
export function getNthSundayOfMonth(year: number, month: number, n: number): Date {
    const first = utcDate(year, month - 1, 1);
    let dow = first.getUTCDay();
    // Days until first Sunday
    let daysUntilSunday = dow === 0 ? 0 : 7 - dow;
    let day = 1 + daysUntilSunday + (n - 1) * 7;
    return utcDate(year, month - 1, day);
}

/** Get date from a reference date + offset in days */
export function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setUTCDate(result.getUTCDate() + days);
    return result;
}

/** Compute days between two dates (target - reference) */
export function daysBetween(reference: Date, target: Date): number {
    const refTime = Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate());
    const targetTime = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate());
    return Math.round((targetTime - refTime) / 86400000);
}
