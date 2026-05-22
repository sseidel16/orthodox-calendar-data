/**
 * ToneRules — 8-tone cycle on Sundays per CalendarRules.md § ToneRules.
 *
 * The cycle begins at PASCHA+14 with "2nd Tone" and advances each Sunday.
 * PASCHA+49 (Pentecost) skips display but still advances the cycle.
 * Certain fixed dates (01/06, 08/06, 09/14, 12/25) suppress display without
 * affecting the cycle position.
 *
 * At the start of the year, tones continue from the previous year's cycle
 * (which started at prev PASCHA+14) until the current year's PASCHA-14.
 */

import { dayOfYear, utcDate, getDow, addDays, formatMMDD, daysBetween } from './dateUtils.js';

const TONES = [
    '1st Tone', '2nd Tone', '3rd Tone', '4th Tone',
    'Plagal 1st Tone', 'Plagal 2nd Tone', 'Grave Tone', 'Plagal 4th Tone',
];

/** Fixed dates where tone is not displayed even if it's a Sunday */
const SUPPRESSED_DATES = new Set(['01-06', '08-06', '09-14', '12-25']);

/**
 * Build a tone map for the entire year. Returns a Map keyed by day-of-year (0-based).
 * Only Sundays that display a tone will have entries.
 */
export function buildToneMap(year: number, pascha: Date, prevPascha: Date): Map<number, string> {
    const map = new Map<number, string>();

    // Part 1: Jan 1 through PASCHA-14 — continuing from previous year's cycle
    assignTonesFromPrevYear(map, year, pascha, prevPascha);

    // Part 2: PASCHA+14 through Dec 31 — fresh cycle starting with "2nd Tone"
    assignTonesFromCurrentPascha(map, year, pascha);

    return map;
}

/**
 * Walk Sundays from previous year's PASCHA+14 through current year's PASCHA-14,
 * tracking the tone cycle. Only assign tones for Sundays that fall in the current year.
 */
function assignTonesFromPrevYear(map: Map<number, string>, year: number, pascha: Date, prevPascha: Date): void {
    const startDate = addDays(prevPascha, 14);
    const lastToneDate = addDays(pascha, -14); // last Sunday with a tone before reset
    let toneIdx = 1; // cycle starts at "2nd Tone" (index 1)

    const current = new Date(startDate);
    while (current.getTime() <= lastToneDate.getTime()) {
        if (getDow(current) === 0) { // Sunday
            const offset = daysBetween(prevPascha, current);

            // Only assign if this Sunday is in the current year
            if (current.getUTCFullYear() === year) {
                const mmdd = formatMMDD(current);
                const isPrevPentecost = offset === 49;
                const isSuppressed = isPrevPentecost || SUPPRESSED_DATES.has(mmdd);

                if (!isSuppressed) {
                    map.set(dayOfYear(current), TONES[toneIdx]);
                }
            }

            // Always advance cycle (even for suppressed or previous-year Sundays)
            toneIdx = (toneIdx + 1) % 8;
        }
        current.setUTCDate(current.getUTCDate() + 1);
    }
}

/**
 * Walk Sundays from PASCHA+14 through end of year.
 * Fresh cycle starting at tone index 1 ("2nd Tone").
 */
function assignTonesFromCurrentPascha(map: Map<number, string>, year: number, pascha: Date): void {
    let toneIdx = 1; // "2nd Tone" at PASCHA+14
    const startDate = addDays(pascha, 14);
    const yearEnd = utcDate(year, 11, 31);

    const current = new Date(startDate);
    while (current.getTime() <= yearEnd.getTime()) {
        if (getDow(current) === 0) { // Sunday
            const offset = daysBetween(pascha, current);
            const mmdd = formatMMDD(current);
            const isPentecost = offset === 49;
            const isSuppressed = isPentecost || SUPPRESSED_DATES.has(mmdd);

            if (!isSuppressed) {
                map.set(dayOfYear(current), TONES[toneIdx]);
            }

            // Always advance cycle regardless of suppression
            toneIdx = (toneIdx + 1) % 8;
        }
        current.setUTCDate(current.getUTCDate() + 1);
    }
}
