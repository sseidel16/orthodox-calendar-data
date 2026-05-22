// Public API exports — layered from lowest to highest
export { getDate, getDateRange, getDateRangeForYear } from './api/range.js';
export { getMonthGrid } from './api/month.js';
export { getYearCalendar } from './api/year.js';

// Lower-level access for managing your own context
export { buildYearContext, generateDateRangeWithCtx } from './engine/dateEngine.js';

// Calendar systems
export { GREGORIAN, JULIAN } from './engine/calendarSystem.js';
export type { CalendarSystem } from './engine/calendarSystem.js';

// Options
export type { CalendarOptions } from './options.js';
export { DEFAULT_OPTIONS } from './options.js';

// Data types
export type { EnrichedDate, EnrichedDateData, FastingLevel, MoonPhase } from './engine/enrichedTypes.js';
export type { YearContext, CalendarContext } from './engine/yearContext.js';
export type { ResolvedReferences } from './engine/movableResolver.js';

// UI types
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
