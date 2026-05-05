import { parsePaschaDates } from './parser.js';

let paschaDatesCache: Map<number, Date> | null = null;

function getPaschaDates(): Map<number, Date> {
    if (!paschaDatesCache) {
        paschaDatesCache = parsePaschaDates();
    }
    return paschaDatesCache;
}

export function getPaschaDate(year: number): Date {
    const dates = getPaschaDates();
    const date = dates.get(year);
    if (!date) {
        throw new Error(`Pascha date not available for year ${year}`);
    }
    return date;
}

/**
 * Calculate the PaschaOffset for a given date.
 * Dates early in the year use the previous year's Pascha.
 * The cutover to current year's Pascha occurs at offset -84.
 */
export function getPaschaOffset(date: Date, year: number): number {
    const currentPascha = getPaschaDate(year);
    const prevPascha = getPaschaDate(year - 1);

    const diffFromCurrent = daysBetween(currentPascha, date);
    const diffFromPrev = daysBetween(prevPascha, date);

    // If diffFromCurrent >= -84, use current year's Pascha
    if (diffFromCurrent >= -84) {
        return diffFromCurrent;
    }
    // Otherwise use previous year's Pascha
    return diffFromPrev;
}

function daysBetween(reference: Date, target: Date): number {
    const msPerDay = 86400000;
    const refTime = Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate());
    const targetTime = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate());
    return Math.round((targetTime - refTime) / msPerDay);
}
