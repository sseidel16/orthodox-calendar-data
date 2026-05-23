/**
 * Browser entry point.
 * Exposes the calendar library as `window.OrthodoxCalendar`.
 * Data is loaded from the same base path as the script.
 */

export { getDate, getDateRange, getDateRangeForYear } from './api/range.js';
export { getMonthGrid } from './api/month.js';
export { getYearCalendar } from './api/year.js';
export { buildYearContext, generateDateRangeWithCtx } from './engine/dateEngine.js';
export { GREGORIAN, JULIAN } from './engine/calendarSystem.js';
export { DEFAULT_OPTIONS } from './options.js';

export type { CalendarOptions } from './options.js';
export type { EnrichedDate, EnrichedDateData } from './engine/enrichedTypes.js';
export type { YearContext, CalendarContext } from './engine/yearContext.js';
export type { CalendarData, MonthData, GridData, BoxData, EmptyBox, NoteBox, SplitBox, DateBox } from './types.js';
