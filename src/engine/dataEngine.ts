import { CalendarDate } from './calendarDate.js';
import { CalendarSystem } from './calendarSystem.js';
import { EnrichedDateData } from './enrichedTypes.js';
import { PhysicalDay } from './physicalDay.js';
import { CalendarContext, buildCalendarContextForYear } from './yearContext.js';
import { dayOfYear } from './rules/dateUtils.js';
import { applyTextRules } from './rules/textRules.js';

/**
 * Generate EnrichedDateData for a single calendar date in a specific calendar system.
 */
export function generateData(
    year: number,
    month: number,
    day: number,
    cal: CalendarSystem,
): EnrichedDateData {
    const physical = cal.toPhysicalDate(year, month, day);
    const ctx = buildCalendarContextForYear(physical.year(), cal);
    return enrichForCalendar(physical, ctx);
}

/**
 * Generate EnrichedDateData for a range of calendar dates in a specific calendar system.
 * Handles cross-year ranges by splitting into per-year chunks internally.
 *
 * @param start - Start date in the calendar's coordinate system
 * @param end - End date in the calendar's coordinate system
 * @param cal - The calendar system to compute for
 * @returns One EnrichedDateData per day in the range (inclusive)
 * @throws If range spans more than 5 years
 */
export function generateDataRange(
    start: CalendarDate,
    end: CalendarDate,
    cal: CalendarSystem,
): EnrichedDateData[] {
    if (end.year - start.year > 5) {
        throw new Error('Range cannot span more than 5 years');
    }

    const startPhysical = cal.toPhysicalDate(start.year, start.month, start.day);
    const endPhysical = cal.toPhysicalDate(end.year, end.month, end.day);

    // Split by physical year for context building
    const startYear = startPhysical.year();
    const endYear = endPhysical.year();

    const results: EnrichedDateData[] = [];

    for (let year = startYear; year <= endYear; year++) {
        const ctx = buildCalendarContextForYear(year, cal);

        // Determine chunk bounds within this physical year
        const chunkStart = year === startYear ? startPhysical : PhysicalDay.of(year, 1, 1);
        const chunkEnd = year === endYear ? endPhysical : PhysicalDay.of(year, 12, 31);

        let current = chunkStart;
        while (current.isOnOrBefore(chunkEnd)) {
            results.push(enrichForCalendar(current, ctx));
            current = current.addDays(1);
        }
    }

    return results;
}

/**
 * Generate EnrichedDateData for a single physical day using a prebuilt context.
 */
export function enrichForCalendar(day: PhysicalDay, calCtx: CalendarContext): EnrichedDateData {
    const dateNum = calCtx.calendar.getDateNumber(day);
    const doy = dayOfYear(day);
    const mmdd = calCtx.calendar.getMMDD(day);

    const fasting = calCtx.fastingMap.get(doy) ?? 'NONE';
    const tone = calCtx.toneMap.get(doy);
    const noteAssignment = calCtx.noteMap.get(doy);
    const lengthyNotes: string[] = noteAssignment ? [noteAssignment[0], noteAssignment[1]] : [];
    const textResult = applyTextRules(mmdd, calCtx.movableTextMap, calCtx.specialTextMap, calCtx.ecum4Mmdd);
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
