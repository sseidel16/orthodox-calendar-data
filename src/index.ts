// Public API exports — layered from lowest to highest
export { getDate, getDateRange, getDateRangeForYear } from './api/range.js';
export { getMonthGrid } from './api/month.js';
export { getYearCalendar } from './api/year.js';

// Lower-level access for callers that want to manage their own context
export { buildYearContext, generateDateRangeWithCtx } from './engine/dateEngine.js';

// Options
export type { CalendarOptions } from './options.js';
export { DEFAULT_OPTIONS } from './options.js';

// Types
export type { EnrichedDate, YearContext } from './engine/dateEngine.js';
export type {
    CalendarData,
    MonthData,
    GridData,
    BoxData,
    EmptyBox,
    NoteBox,
    SplitBox,
    DateBox,
    CalendarScriptSettings,
} from './types.js';
