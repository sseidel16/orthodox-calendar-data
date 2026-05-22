/**
 * CalendarSystem — polymorphic interface for Gregorian and Julian calendar computations.
 *
 * Both calendars share the same physical days (same day-of-week), but differ in:
 * - Date numbers (Julian is 13 days behind Gregorian)
 * - MM-DD keys for text/immovable lookups
 * - Fixed-date rule targets (shifted to their physical equivalents)
 */

import { formatMMDD } from './rules/dateUtils.js';

export interface CalendarSystem {
    readonly name: 'gregorian' | 'julian';

    /** Days to shift fixed calendar dates forward to reach their physical date.
     *  0 for Gregorian (dates ARE physical), 13 for Julian (dates are 13 days behind). */
    readonly fixedDateShift: number;

    /** Get the calendar date number (1-31) for display, given a physical date. */
    getDateNumber(physicalDate: Date): number;

    /** Get the calendar "MM-DD" string for text/immovable lookups, given a physical date. */
    getMMDD(physicalDate: Date): string;
}

/** Gregorian calendar: physical dates = calendar dates */
export const GREGORIAN: CalendarSystem = {
    name: 'gregorian',
    fixedDateShift: 0,
    getDateNumber(physicalDate: Date): number {
        return physicalDate.getUTCDate();
    },
    getMMDD(physicalDate: Date): string {
        return formatMMDD(physicalDate);
    },
};

/** Julian calendar: calendar dates are 13 days behind physical dates */
export const JULIAN: CalendarSystem = {
    name: 'julian',
    fixedDateShift: 13,
    getDateNumber(physicalDate: Date): number {
        const julian = new Date(physicalDate);
        julian.setUTCDate(julian.getUTCDate() - 13);
        return julian.getUTCDate();
    },
    getMMDD(physicalDate: Date): string {
        const julian = new Date(physicalDate);
        julian.setUTCDate(julian.getUTCDate() - 13);
        return formatMMDD(julian);
    },
};
