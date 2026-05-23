import { CalendarData } from '../types.js';
import { buildYearContext, generateDateRangeWithCtx } from '../engine/dateEngine.js';
import { CalendarOptions, resolveOptions } from '../options.js';
import { buildIndicatorMap, getMonthGrid } from './month.js';

/**
 * Generate full CalendarData for an entire year.
 * Builds a single YearContext and reuses it across all 12 months.
 * Pre-assigns note indicators globally so the same note text always gets the same symbol.
 */
export function getYearCalendar(year: number, options?: CalendarOptions): CalendarData {
    const opts = resolveOptions(options);
    const ctx = buildYearContext(year, opts.timezone);

    // Pre-scan the entire year to build a global indicator assignment map
    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year, 11, 31));
    const allDates = generateDateRangeWithCtx(start, end, ctx);
    const indicatorMap = buildIndicatorMap(allDates, opts.noteIndicators);

    const months = [];
    for (let month = 0; month < 12; month++) {
        months.push(getMonthGrid(month, year, ctx, opts.noteIndicators, indicatorMap));
    }
    return {
        year: String(year),
        months,
    };
}
