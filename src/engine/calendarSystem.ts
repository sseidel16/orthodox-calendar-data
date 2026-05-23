/**
 * CalendarSystem — polymorphic interface for Gregorian and Julian calendar computations.
 *
 * Both calendars share the same physical days (same day-of-week), but differ in:
 * - Date numbers (Julian is 13 days behind Gregorian)
 * - MM-DD keys for text/immovable lookups
 * - Fixed-date rule targets (shifted to their physical equivalents)
 *
 * All methods accept or return PhysicalDay. The calendar system handles
 * the conversion between calendar dates and physical dates internally.
 */

import { PhysicalDay } from './physicalDay.js';

export interface CalendarSystem {
    readonly name: 'gregorian' | 'julian';

    /** Days to shift fixed calendar dates forward to reach their physical date.
     *  0 for Gregorian (dates ARE physical), 13 for Julian (dates are 13 days behind). */
    readonly fixedDateShift: number;

    /** Get the calendar date number (1-31) for display, given a physical day. */
    getDateNumber(day: PhysicalDay): number;

    /** Get the calendar "MM-DD" string for text/immovable lookups, given a physical day. */
    getMMDD(day: PhysicalDay): string;

    /** Convert a calendar date (month 1-12, day 1-31) to a physical day. */
    toPhysicalDate(year: number, month: number, day: number): PhysicalDay;

    /**
     * Find the first occurrence of a day-of-week (0=Sun, 6=Sat) within a calendar date range.
     * Range is specified in calendar dates; result is a physical day.
     * @param crossYear - If true and endMonth < startMonth, end is in the following year.
     */
    findDayInRange(year: number, startMonth: number, startDay: number, endMonth: number, endDay: number, dow: number, crossYear?: boolean): PhysicalDay | null;

    /** Shorthand: find Sunday in calendar date range. */
    findSundayInRange(year: number, startMonth: number, startDay: number, endMonth: number, endDay: number, crossYear?: boolean): PhysicalDay | null;

    /** Shorthand: find Saturday in calendar date range. */
    findSaturdayInRange(year: number, startMonth: number, startDay: number, endMonth: number, endDay: number, crossYear?: boolean): PhysicalDay | null;
}

// ============================================================
// Shared implementation derived from toPhysicalDate
// ============================================================

function findDayInRange(cal: CalendarSystem, year: number, startMonth: number, startDay: number, endMonth: number, endDay: number, dow: number, crossYear?: boolean): PhysicalDay | null {
    const endYear = crossYear && endMonth < startMonth ? year + 1 : year;
    const start = cal.toPhysicalDate(year, startMonth, startDay);
    const end = cal.toPhysicalDate(endYear, endMonth, endDay);
    let current = start;
    while (current.isOnOrBefore(end)) {
        if (current.dayOfWeek() === dow) return current;
        current = current.addDays(1);
    }
    return null;
}

// ============================================================
// Helpers for extracting month/day from epoch ms (internal only)
// ============================================================

function formatMMDD(ms: number): string {
    const d = new Date(ms);
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${month}-${day}`;
}

// ============================================================
// Calendar instances — only toPhysicalDate / getDateNumber / getMMDD differ
// ============================================================

/** Gregorian calendar: physical dates = calendar dates */
export const GREGORIAN: CalendarSystem = {
    name: 'gregorian',
    fixedDateShift: 0,
    getDateNumber(day: PhysicalDay): number {
        return new Date(day._epochMs()).getUTCDate();
    },
    getMMDD(day: PhysicalDay): string {
        return formatMMDD(day._epochMs());
    },
    toPhysicalDate(year: number, month: number, day: number): PhysicalDay {
        return PhysicalDay.of(year, month, day);
    },
    findDayInRange(year, sm, sd, em, ed, dow, crossYear) {
        return findDayInRange(this, year, sm, sd, em, ed, dow, crossYear);
    },
    findSundayInRange(year, sm, sd, em, ed, crossYear) {
        return findDayInRange(this, year, sm, sd, em, ed, 0, crossYear);
    },
    findSaturdayInRange(year, sm, sd, em, ed, crossYear) {
        return findDayInRange(this, year, sm, sd, em, ed, 6, crossYear);
    },
};

/** Julian calendar: calendar dates are 13 days behind physical dates */
export const JULIAN: CalendarSystem = {
    name: 'julian',
    fixedDateShift: 13,
    getDateNumber(day: PhysicalDay): number {
        return new Date(day._epochMs() - 13 * 86_400_000).getUTCDate();
    },
    getMMDD(day: PhysicalDay): string {
        return formatMMDD(day._epochMs() - 13 * 86_400_000);
    },
    toPhysicalDate(year: number, month: number, day: number): PhysicalDay {
        return PhysicalDay.of(year, month, day).addDays(13);
    },
    findDayInRange(year, sm, sd, em, ed, dow, crossYear) {
        return findDayInRange(this, year, sm, sd, em, ed, dow, crossYear);
    },
    findSundayInRange(year, sm, sd, em, ed, crossYear) {
        return findDayInRange(this, year, sm, sd, em, ed, 0, crossYear);
    },
    findSaturdayInRange(year, sm, sd, em, ed, crossYear) {
        return findDayInRange(this, year, sm, sd, em, ed, 6, crossYear);
    },
};
