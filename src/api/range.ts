import { EnrichedDate, generateDateRange, buildYearContext, generateDateRangeWithCtx } from '../engine/dateEngine.js';
import { CalendarOptions, resolveOptions } from '../options.js';

/**
 * Get enriched calendar data for a range of dates (inclusive).
 * Handles cross-year ranges by splitting into per-year chunks.
 */
export function getDateRange(start: Date, end: Date, options?: CalendarOptions): EnrichedDate[] {
    const opts = resolveOptions(options);
    const startYear = start.getUTCFullYear();
    const endYear = end.getUTCFullYear();

    if (startYear === endYear) {
        return generateDateRange(start, end, startYear, opts.timezone);
    }

    const results: EnrichedDate[] = [];
    for (let year = startYear; year <= endYear; year++) {
        const chunkStart = year === startYear ? start : new Date(Date.UTC(year, 0, 1));
        const chunkEnd = year === endYear ? end : new Date(Date.UTC(year, 11, 31));
        results.push(...generateDateRange(chunkStart, chunkEnd, year, opts.timezone));
    }
    return results;
}

/**
 * Get enriched calendar data for a single date.
 */
export function getDate(date: Date, options?: CalendarOptions): EnrichedDate {
    const opts = resolveOptions(options);
    const year = date.getUTCFullYear();
    const results = generateDateRange(date, date, year, opts.timezone);
    return results[0];
}

export function getDateRangeForYear(start: Date, end: Date, year: number, options?: CalendarOptions): EnrichedDate[] {
    const opts = resolveOptions(options);
    return generateDateRange(start, end, year, opts.timezone);
}

