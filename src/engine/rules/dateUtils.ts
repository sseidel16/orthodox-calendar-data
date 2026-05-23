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

/** Create a PhysicalDay from year, 0-based month, day (legacy utcDate signature) */
export function utcDate(year: number, month: number, day: number): PhysicalDay {
    return PhysicalDay.of(year, month + 1, day);
}

/** Number of days in a year */
export function daysInYear(year: number): number {
    return isLeapYear(year) ? 366 : 365;
}

function isLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
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

/** Format a PhysicalDay as "MM-DD" string using physical (Gregorian) month/day. Internal use only. */
export function formatPhysicalMMDD(day: PhysicalDay): string {
    const d = new Date(day._epochMs());
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${m}-${dd}`;
}
