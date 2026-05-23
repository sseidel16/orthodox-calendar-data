import { EnrichedDate, EnrichedDateData } from './enrichedTypes.js';
import { YearContext, CalendarContext, buildYearContext } from './yearContext.js';
import { dayOfYear } from './rules/dateUtils.js';
import { applyTextRules } from './rules/textRules.js';

/**
 * Generate enriched calendar data for a date range within a single year.
 * Builds a YearContext internally — use generateDateRangeWithCtx for efficiency
 * when generating multiple ranges within the same year.
 */
export function generateDateRange(start: Date, end: Date, year: number, timezone?: string): EnrichedDate[] {
    const ctx = buildYearContext(year, timezone);
    return generateDateRangeWithCtx(start, end, ctx);
}

/**
 * Generate enriched calendar data for a date range using a prebuilt YearContext.
 */
export function generateDateRangeWithCtx(start: Date, end: Date, ctx: YearContext): EnrichedDate[] {
    const results: EnrichedDate[] = [];
    const current = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
    const endUTC = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());

    while (current.getTime() <= endUTC) {
        results.push(generateSingleDate(new Date(current), ctx));
        current.setUTCDate(current.getUTCDate() + 1);
    }

    return results;
}

/**
 * Generate enriched data for a single physical date.
 * Both calendar systems are enriched from the same physical date —
 * the CalendarSystem handles translating to calendar-specific date numbers and MM-DD keys.
 */
function generateSingleDate(date: Date, ctx: YearContext): EnrichedDate {
    const doy = dayOfYear(date);

    const newData = enrichForCalendar(date, ctx.newCalendar);
    const oldData = enrichForCalendar(date, ctx.oldCalendar);

    // Moon phase is physical — keyed by the actual date's day-of-year
    const moon = ctx.moonMap.get(doy) ?? 'NONE';

    return { date, moon, oldData, newData };
}

/**
 * Enrich a single physical date for one calendar system.
 * The CalendarSystem provides the date number and MM-DD for lookups.
 * Fasting/tone/note maps are keyed by physical day-of-year (already correct day-of-week).
 */
function enrichForCalendar(physicalDate: Date, calCtx: CalendarContext): EnrichedDateData {
    const dateNum = calCtx.calendar.getDateNumber(physicalDate);
    const doy = dayOfYear(physicalDate);
    const mmdd = calCtx.calendar.getMMDD(physicalDate);

    // Fasting: precomputed per physical day-of-year
    const fasting = calCtx.fastingMap.get(doy) ?? 'NONE';

    // Tone: precomputed per physical day-of-year (only Sundays have entries)
    const tone = calCtx.toneMap.get(doy);

    // Lengthy notes: precomputed per physical day-of-year
    const noteAssignment = calCtx.noteMap.get(doy);
    const lengthyNotes: string[] = noteAssignment ? [noteAssignment[0], noteAssignment[1]] : [];

    // Feast/Saint/Note text: uses calendar-specific MM-DD for lookups
    const textResult = applyTextRules(mmdd, calCtx.movableTextMap, calCtx.specialTextMap, calCtx.ecum4Mmdd);

    // Readings: precomputed per calendar MM-DD
    const readings = calCtx.readingsMap.get(mmdd) ?? [];

    const result: EnrichedDateData = {
        date: dateNum,
        fasting,
        lengthyNotes,
        readings,
    };

    if (tone) result.tone = tone;
    if (textResult.feast) result.feast = textResult.feast;
    if (textResult.saint) result.saint = textResult.saint;
    if (textResult.note) result.note = textResult.note;

    return result;
}

// Re-exports for public API
export { buildYearContext } from './yearContext.js';
export type { YearContext } from './yearContext.js';
export type { EnrichedDate, EnrichedDateData } from './enrichedTypes.js';
