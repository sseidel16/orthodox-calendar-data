import { YearContext, buildYearContext, getPaschaOffsetFromCtx } from './yearContext.js';
import { dayOfYear, formatMMDD, applyMainTextRules } from './rules/index.js';

/**
 * Enriched date data returned by the range API.
 * This is the raw calendar data type — not a UI type.
 */
export type EnrichedDate = {
    date: Date;
    paschaOffset: number;
    newDate: number;
    oldDate: number;
    fasting: 'NONE' | 'DAIRY' | 'FISH' | 'OIL' | 'STRICT';
    moon: 'NONE' | 'NEW' | 'FIRST' | 'FULL' | 'LAST';
    notes: string[];
    mainText: {
        feast?: string[];   // [english, greek]
        saint?: string[];   // [english, greek]
        note?: string[];    // [english, greek]
    };
    lowerText: {
        tone?: string;
        readings: string[];
    };
};

/**
 * Generate enriched calendar data for a date range within a single year.
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
 * Generate enriched data for a single date using a prebuilt YearContext.
 */
function generateSingleDate(date: Date, ctx: YearContext): EnrichedDate {
    const paschaOffset = getPaschaOffsetFromCtx(date, ctx);
    const newDate = date.getUTCDate();
    const oldDate = getOldCalendarDate(date);
    const doy = dayOfYear(date);
    const mmdd = formatMMDD(date);

    // MainText
    const mainText = applyMainTextRules(
        mmdd,
        paschaOffset,
        ctx.drsAssignments,
        ctx.specialAssignments,
        ctx.movablesByOffset,
    );

    // Fasting
    const fasting = ctx.fastingMap.get(doy) ?? 'NONE';

    // Tone
    const tone = ctx.toneMap.get(doy);

    // Moon
    const moon = ctx.moonMap.get(doy) ?? 'NONE';

    // Notes
    const noteAssignment = ctx.noteAssignments.get(doy);
    const notes: string[] = noteAssignment ? [noteAssignment[0], noteAssignment[1]] : [];

    // Build lowerText
    const lowerText: { tone?: string; readings: string[] } = { readings: [] };
    if (tone) lowerText.tone = tone;

    return {
        date,
        paschaOffset,
        newDate,
        oldDate,
        fasting,
        moon,
        notes,
        mainText,
        lowerText,
    };
}

/**
 * Get the Julian (Old Calendar) date number for a Gregorian date.
 * The Julian calendar is 13 days behind in the 21st century.
 */
function getOldCalendarDate(date: Date): number {
    const julianDate = new Date(date);
    julianDate.setUTCDate(julianDate.getUTCDate() - 13);
    return julianDate.getUTCDate();
}

// Re-export for convenience
export { buildYearContext, type YearContext } from './yearContext.js';
