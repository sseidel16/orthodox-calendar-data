/**
 * Movable Reference Resolver
 *
 * Computes the actual calendar dates for each movable reference symbol
 * for a given year. Runs separately for old and new calendars since
 * they use different Pascha dates.
 *
 * Symbols include PASCHA, Luke Sundays (L1-L15), Matthew gap Sundays (M15-M17),
 * Theophany/Elevation/Nativity Saturday/Sunday references, and ECUM4.
 */

import { findSundayInRange, findSaturdayInRange, utcDate, addDays, daysBetween } from './rules/dateUtils.js';

/**
 * A resolved set of movable references for one calendar (old or new).
 * Maps symbol -> Date. Some symbols may not exist in a given year (e.g., SUNaN).
 */
export type ResolvedReferences = Map<string, Date>;

/**
 * Resolve all movable reference dates for a year given a Pascha date.
 * This is called once per calendar system per year during context building.
 */
export function resolveMovableReferences(year: number, pascha: Date): ResolvedReferences {
    const refs: ResolvedReferences = new Map();

    refs.set('PASCHA', pascha);

    // ECUM4: Holy Fathers of 4th Ecumenical Council — Sunday between 7/13-7/19
    refs.set('ECUM4', findSundayInRange(year, 7, 13, 7, 19)!);

    // Theophany-related (cross-year: Dec 30 of prev year → Jan 5 of current year)
    const satbT = findSaturdayInRange(year - 1, 12, 30, 1, 5, true);
    if (satbT) refs.set('SATbT', satbT);
    const sunbT = findSundayInRange(year - 1, 12, 30, 1, 5, true);
    if (sunbT) refs.set('SUNbT', sunbT);

    // After Theophany (Jan 7-13)
    const sataT = findSaturdayInRange(year, 1, 7, 1, 13);
    if (sataT) refs.set('SATaT', sataT);
    const sunaT = findSundayInRange(year, 1, 7, 1, 13);
    if (sunaT) refs.set('SUNaT', sunaT);

    // Elevation of the Cross (Sep 14)
    const satbE = findSaturdayInRange(year, 9, 7, 9, 13);
    if (satbE) refs.set('SATbE', satbE);
    const sunbE = findSundayInRange(year, 9, 7, 9, 13);
    if (sunbE) refs.set('SUNbE', sunbE);

    const sataE = findSaturdayInRange(year, 9, 15, 9, 21);
    if (sataE) refs.set('SATaE', sataE);
    const sunaE = findSundayInRange(year, 9, 15, 9, 21);
    if (sunaE) refs.set('SUNaE', sunaE);

    // Luke Sundays (fixed date windows in Sep-Dec)
    setIfFound(refs, 'L1', findSundayInRange(year, 9, 22, 9, 28));
    setIfFound(refs, 'L2', findSundayInRange(year, 9, 29, 10, 5));
    setIfFound(refs, 'L3', findSundayInRange(year, 10, 6, 10, 10) ?? findSundayInRange(year, 10, 18, 10, 19));
    setIfFound(refs, 'L4', findSundayInRange(year, 10, 11, 10, 17));  // 7th Ecumenical Council
    setIfFound(refs, 'L5', findSundayInRange(year, 10, 30, 11, 5));
    setIfFound(refs, 'L6', findSundayInRange(year, 10, 20, 10, 26));
    setIfFound(refs, 'L7', findSundayInRange(year, 10, 27, 10, 29) ?? findSundayInRange(year, 11, 6, 11, 9));
    setIfFound(refs, 'L8', findSundayInRange(year, 11, 10, 11, 16));
    setIfFound(refs, 'L9', findSundayInRange(year, 11, 17, 11, 23));
    setIfFound(refs, 'L10', findSundayInRange(year, 12, 4, 12, 10));
    setIfFound(refs, 'L11', findSundayInRange(year, 12, 11, 12, 17));  // Holy Ancestors
    setIfFound(refs, 'L13', findSundayInRange(year, 11, 24, 11, 30));

    // Nativity-related (Dec 18-29)
    const satbN = findSaturdayInRange(year, 12, 18, 12, 24);
    if (satbN) refs.set('SATbN', satbN);
    const sunbN = findSundayInRange(year, 12, 18, 12, 24);
    if (sunbN) refs.set('SUNbN', sunbN);
    const sataN = findSaturdayInRange(year, 12, 26, 12, 29);
    if (sataN) refs.set('SATaN', sataN);
    const sunaN = findSundayInRange(year, 12, 26, 12, 29);
    if (sunaN) refs.set('SUNaN', sunaN);

    // Gap Sundays: dynamically assigned between SUNaT and PASCHA-70
    resolveGapSundays(refs, year);

    return refs;
}

/**
 * Resolve a movable reference + offset to a specific date.
 * Returns null if the reference symbol doesn't exist for this year.
 *
 * Example: resolveDate(refs, 'PASCHA', -7) returns Palm Sunday's date.
 */
export function resolveDate(refs: ResolvedReferences, reference: string, offset: number): Date | null {
    const baseDate = refs.get(reference);
    if (!baseDate) return null;
    return addDays(baseDate, offset);
}


/**
 * Resolve a movable entry (reference+offset) to ALL valid dates within the target year.
 *
 * For PASCHA references, two boundary rules apply:
 * - Previous year's PASCHA (positive offsets): valid from 01/01 through PASCHA-70 (non-inclusive)
 * - Current year's PASCHA (negative offsets going forward): valid from SUNaT (non-inclusive) onward
 * There is an overlap between SUNaT and PASCHA-70 where both cycles are valid.
 *
 * For non-PASCHA references (SUNbT, L1, etc.), boundary is not applied — they resolve
 * from whichever set has them in-year.
 *
 * Returns an array of 0, 1, or 2 dates.
 */
export function resolveDatesForYear(
    reference: string,
    offset: number,
    year: number,
    currentRefs: ResolvedReferences,
    prevRefs: ResolvedReferences,
): Date[] {
    const applyBoundary = reference === 'PASCHA';
    const results: Date[] = [];

    if (applyBoundary) {
        const sunaT = currentRefs.get('SUNaT');
        const pascha = currentRefs.get('PASCHA');
        const pascha70 = pascha ? addDays(pascha, -70) : null;

        // Current year's PASCHA: valid if date is after SUNaT (non-inclusive)
        const fromCurrent = resolveDate(currentRefs, reference, offset);
        if (fromCurrent && fromCurrent.getUTCFullYear() === year) {
            if (!sunaT || fromCurrent.getTime() > sunaT.getTime()) {
                results.push(fromCurrent);
            }
        }

        // Previous year's PASCHA: valid if date is before PASCHA-70 (non-inclusive)
        const fromPrev = resolveDate(prevRefs, reference, offset);
        if (fromPrev && fromPrev.getUTCFullYear() === year) {
            if (!pascha70 || fromPrev.getTime() < pascha70.getTime()) {
                results.push(fromPrev);
            }
        }
    } else {
        // Non-PASCHA references: resolve from whichever set has them in-year
        const fromCurrent = resolveDate(currentRefs, reference, offset);
        if (fromCurrent && fromCurrent.getUTCFullYear() === year) {
            results.push(fromCurrent);
        }

        const fromPrev = resolveDate(prevRefs, reference, offset);
        if (fromPrev && fromPrev.getUTCFullYear() === year) {
            // Avoid duplicates if both resolve to the same date
            if (!results.some(d => d.getTime() === fromPrev.getTime())) {
                results.push(fromPrev);
            }
        }
    }

    return results;
}

// ============================================================
// Internal helpers
// ============================================================

function setIfFound(refs: ResolvedReferences, symbol: string, date: Date | null): void {
    if (date) refs.set(symbol, date);
}

/**
 * Assign gap Sunday references (L12, L14, L15, M15, M16, M17).
 * Gap Sundays are the Sundays strictly between SUNaT and PASCHA-70.
 * The number of available Sundays varies by year (1-6), and each count
 * has a specific assignment pattern from the rules.
 */
function resolveGapSundays(refs: ResolvedReferences, year: number): void {
    const sunaT = refs.get('SUNaT');
    const pascha = refs.get('PASCHA');
    if (!sunaT || !pascha) return;

    const paschaM70 = addDays(pascha, -70);

    // Collect all Sundays strictly between SUNaT and PASCHA-70
    const gapSundays: Date[] = [];
    const current = addDays(sunaT, 1);
    while (current.getTime() < paschaM70.getTime()) {
        if (current.getUTCDay() === 0) {
            gapSundays.push(new Date(current));
        }
        current.setUTCDate(current.getUTCDate() + 1);
    }

    // Assignment patterns — which symbols get assigned based on available count
    const patterns: Record<number, string[]> = {
        1: ['L15'],
        2: ['L12', 'L15'],
        3: ['L12', 'L15', 'M17'],
        4: ['L12', 'L14', 'L15', 'M17'],
        5: ['L12', 'L14', 'M16', 'L15', 'M17'],
        6: ['L12', 'L14', 'M15', 'M16', 'L15', 'M17'],
    };

    const count = Math.min(gapSundays.length, 6);
    const pattern = patterns[count];
    if (!pattern) return;

    for (let i = 0; i < pattern.length; i++) {
        refs.set(pattern[i], gapSundays[i]);
    }
}
