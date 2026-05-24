// Calendar UI layer
export { generateCalendar, generateCalendarYear, generateCalendarRange, generateCalendarDate } from './api/calendar.js';
export type { GenerateCalendarOptions, CalendarDayData } from './api/calendar.js';

// Data engine
export { generateData, generateDataRange } from './engine/dataEngine.js';
export type { CalendarDate } from './engine/calendarDate.js';

// Calendar systems
export { GREGORIAN, JULIAN } from './engine/calendarSystem.js';
export type { CalendarSystem } from './engine/calendarSystem.js';
export { PhysicalDay } from './engine/physicalDay.js';

// Data types
export type { EnrichedDateData, FastingLevel, MoonPhase } from './engine/enrichedTypes.js';

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
