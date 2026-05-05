/**
 * ToneRules — 8-tone cycle on Sundays.
 * Cycle starts at PaschaOffset +14 with "2nd Tone".
 * Continues from previous year at the start of the current year.
 */

import { dayOfYear, utcDate, getDow, addDays, formatMMDD, daysBetween } from './dateUtils.js';

const TONES = [
    '1st Tone', '2nd Tone', '3rd Tone', '4th Tone',
    'Plagal 1st Tone', 'Plagal 2nd Tone', 'Grave Tone', 'Plagal 4th Tone',
];

// Dates that suppress tone display (but don't affect cycle ordering)
const SUPPRESSED_DATES = new Set(['01-06', '08-06', '09-14', '12-25']);

export function buildToneMap(year: number, pascha: Date, prevPascha: Date): Map<number, string> {
    const map = new Map<number, string>();

    // The tone cycle resets at PaschaOffset +14 with index 1 (2nd Tone).
    // PaschaOffset +49 skips display but advances the cycle.
    // PaschaOffset -14 is the last Sunday with a tone before Pascha.
    // PaschaOffset +14 resumes.

    // Part 1: Beginning of year through PaschaOffset -14
    // These continue from the previous year's cycle.
    assignTonesFromPrevYear(map, year, pascha, prevPascha);

    // Part 2: PaschaOffset +14 through end of year
    assignTonesFromCurrentPascha(map, year, pascha);

    return map;
}

function assignTonesFromPrevYear(
    map: Map<number, string>,
    year: number,
    pascha: Date,
    prevPascha: Date,
): void {
    // Walk Sundays from prevPascha +14, tracking tone index.
    // Continue into the current year until we hit currentPascha offset -14.
    const startDate = addDays(prevPascha, 14);
    const lastToneDate = addDays(pascha, -14);
    let toneIdx = 1; // Starts at "2nd Tone" (index 1)

    const current = new Date(startDate);
    while (current.getTime() <= lastToneDate.getTime()) {
        if (getDow(current) === 0) { // Sunday
            const offset = daysBetween(prevPascha, current);

            if (current.getUTCFullYear() === year) {
                // This Sunday is in the current year — assign tone
                const mmdd = formatMMDD(current);
                const prevOffset49 = offset; // Check against previous year's Pentecost
                // PaschaOffset 49 from prevPascha suppresses display
                const isPrevPentecost = offset === 49;
                const isSuppressed = isPrevPentecost || SUPPRESSED_DATES.has(mmdd);

                if (!isSuppressed) {
                    const doy = dayOfYear(current);
                    map.set(doy, TONES[toneIdx]);
                }
            }

            // Always advance the cycle (even for suppressed/prev-year Sundays)
            toneIdx = (toneIdx + 1) % 8;
        }
        current.setUTCDate(current.getUTCDate() + 1);
    }
}

function assignTonesFromCurrentPascha(
    map: Map<number, string>,
    year: number,
    pascha: Date,
): void {
    // Start at PaschaOffset +14, assign "2nd Tone" (index 1), increment each Sunday
    let toneIdx = 1;
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
                const doy = dayOfYear(current);
                map.set(doy, TONES[toneIdx]);
            }

            // Always advance
            toneIdx = (toneIdx + 1) % 8;
        }
        current.setUTCDate(current.getUTCDate() + 1);
    }
}
