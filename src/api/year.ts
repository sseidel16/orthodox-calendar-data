import { CalendarData } from '../types.js';
import { buildYearContext } from '../engine/dateEngine.js';
import { CalendarOptions, resolveOptions } from '../options.js';
import { getMonthGrid } from './month.js';

/**
 * Generate full CalendarData for an entire year.
 * Builds a single YearContext and reuses it across all 12 months.
 */
export function getYearCalendar(year: number, options?: CalendarOptions): CalendarData {
    const opts = resolveOptions(options);
    const ctx = buildYearContext(year, opts.timezone);
    const months = [];
    for (let month = 0; month < 12; month++) {
        months.push(getMonthGrid(month, year, ctx, opts.noteIndicators));
    }
    return {
        year: String(year),
        months,
    };
}
