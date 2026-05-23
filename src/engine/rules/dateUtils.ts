/**
 * Shared date utilities for rule computation.
 * All functions operate on PhysicalDay (opaque physical day representation).
 */

import { PhysicalDay } from '../physicalDay.js';

/** Get 0-based day-of-year (Jan 1 = 0) */
export function dayOfYear(day: PhysicalDay): number {
    const ms = day._epochMs();
    const d = new Date(ms);
    const start = Date.UTC(d.getUTCFullYear(), 0, 1);
    return Math.floor((ms - start) / 86400000);
}

/** Get UTC day of week (0=Sunday) */
export function getDow(day: PhysicalDay): number {
    return day.dayOfWeek();
}

/** Create a PhysicalDay from year, 0-based month, day (legacy utcDate signature) */
export function utcDate(year: number, month: number, day: number): PhysicalDay {
    return PhysicalDay.of(year, month + 1, day);
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
export function findSundayInRange(year: number, startMonth: number, startDay: number, endMonth: number, endDay: number, crossYear?: boolean): PhysicalDay | null {
    return findDayInRange(year, startMonth, startDay, endMonth, endDay, 0, crossYear);
}

/** Find the Saturday that falls within a date range (inclusive). Returns null if none. */
export function findSaturdayInRange(year: number, startMonth: number, startDay: number, endMonth: number, endDay: number, crossYear?: boolean): PhysicalDay | null {
    return findDayInRange(year, startMonth, startDay, endMonth, endDay, 6, crossYear);
}

/** Find a specific day-of-week (0=Sun, 6=Sat) within a date range. */
function findDayInRange(year: number, startMonth: number, startDay: number, endMonth: number, endDay: number, dow: number, crossYear?: boolean): PhysicalDay | null {
    const endYear = crossYear && endMonth < startMonth ? year + 1 : year;
    const start = utcDate(year, startMonth - 1, startDay);
    const end = utcDate(endYear, endMonth - 1, endDay);
    let current = start;
    while (current.isOnOrBefore(end)) {
        if (current.dayOfWeek() === dow) return current;
        current = current.addDays(1);
    }
    return null;
}

/** Get the Nth Sunday of a given month (1-based N) */
export function getNthSundayOfMonth(year: number, month: number, n: number): PhysicalDay {
    const first = utcDate(year, month - 1, 1);
    let dow = first.dayOfWeek();
    // Days until first Sunday
    let daysUntilSunday = dow === 0 ? 0 : 7 - dow;
    let day = 1 + daysUntilSunday + (n - 1) * 7;
    return utcDate(year, month - 1, day);
}

/** Get date from a reference date + offset in days */
export function addDays(day: PhysicalDay, days: number): PhysicalDay {
    return day.addDays(days);
}

/** Compute days between two dates (target - reference) */
export function daysBetween(reference: PhysicalDay, target: PhysicalDay): number {
    return target.daysSince(reference);
}
