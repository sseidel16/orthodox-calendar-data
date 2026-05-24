import { parsePaschaDates } from '../data/parser.js';
import { TextMovableEntry, TextSpecialEntry } from '../data/parser.js';
import { ResolvedReferences, resolveMovableReferences } from './movableResolver.js';
import { FastingLevel, MoonPhase } from './enrichedTypes.js';
import { CalendarSystem, GREGORIAN, JULIAN } from './calendarSystem.js';
import { PhysicalDay } from './physicalDay.js';
import { buildFastingMap } from './rules/fastingRules.js';
import { buildToneMap } from './rules/toneRules.js';
import { buildNoteMap } from './rules/noteRules.js';
import { buildMoonMap } from './rules/moonRules.js';
import { buildMovableTextMap, buildSpecialTextMap } from './rules/textRules.js';
import { buildReadingsMap } from './rules/readingsRules.js';

/**
 * Precomputed context for a single calendar system (old or new) within a year.
 * All maps are keyed by physical day-of-year for O(1) per-date lookups.
 */
export type CalendarContext = {
    calendar: CalendarSystem;
    pascha: PhysicalDay;                                  // calendar-specific Pascha (for movable reference resolution)
    references: ResolvedReferences;                    // resolved movable reference dates
    prevReferences: ResolvedReferences;                // previous year's references
    fastingMap: Map<number, FastingLevel>;             // physical day-of-year -> fasting level
    toneMap: Map<number, string>;                      // physical day-of-year -> tone (Sundays only)
    noteMap: Map<number, [string, string]>;            // physical day-of-year -> [english, greek] lengthy note
    movableTextMap: Map<string, TextMovableEntry[]>;   // calendar "MM-DD" -> movable text entries
    specialTextMap: Map<string, TextSpecialEntry[]>;   // calendar "MM-DD" -> special text entries
    readingsMap: Map<string, string[]>;                // calendar "MM-DD" -> formatted reading strings
    ecum4Mmdd: string | null;                          // calendar MM-DD of ECUM4 (for feast override logic)
};

/**
 * Precomputed context for the full year (both calendars).
 * Moon phases are physical — shared across both calendar systems.
 */
export type YearContext = {
    year: number;
    newCalendar: CalendarContext;
    oldCalendar: CalendarContext;
    moonMap: Map<number, MoonPhase>;
};

// Lazy-loaded Pascha date cache
// Lazy-loaded Pascha date cache — stores calendar dates, not physical dates.
// The conversion to physical is done via the CalendarSystem at lookup time.
type PaschaCalendarDates = {
    gregorian: { year: number; month: number; day: number };
    julian: { year: number; month: number; day: number };
};

let paschaCache: Map<number, PaschaCalendarDates> | null = null;

function getPaschaData(): Map<number, PaschaCalendarDates> {
    if (!paschaCache) {
        paschaCache = new Map();
        for (const entry of parsePaschaDates()) {
            paschaCache.set(entry.year, {
                gregorian: entry.gregorian,
                julian: entry.julian,
            });
        }
    }
    return paschaCache;
}

/** Get the physical Pascha date for a given year and calendar system. */
export function getPaschaForYear(year: number, cal: CalendarSystem): PhysicalDay {
    const data = getPaschaData();
    const entry = data.get(year);
    if (!entry) throw new Error(`Pascha date not available for year ${year}`);
    const calDate = cal.name === 'gregorian' ? entry.gregorian : entry.julian;
    return cal.toPhysicalDate(calDate.year, calDate.month, calDate.day);
}

/**
 * Build a CalendarContext for one calendar system.
 *
 * @param physicalPascha - Gregorian Pascha (same physical Sunday for both calendars).
 *   Used for fasting/tone/note maps which depend on correct day-of-week.
 * @param calendarPascha - Calendar-specific Pascha (Julian for old, Gregorian for new).
 *   Used for resolving movable text references to calendar-specific MM-DD strings.
 * @param calSystem - The calendar system (Gregorian or Julian) for date number/MM-DD logic.
 */
function buildCalendarContext(
    year: number,
    physicalPascha: PhysicalDay,
    prevPhysicalPascha: PhysicalDay,
    calendarPascha: PhysicalDay,
    prevCalRefs: ResolvedReferences,
    calSystem: CalendarSystem,
): CalendarContext {
    const references = resolveMovableReferences(year, calendarPascha, calSystem);
    const ecum4 = references.get('ECUM4');

    // Determine which gap Sunday symbols were assigned (for readings epistle copying)
    const gapPatterns: Record<number, string[]> = {
        1: ['L15'], 2: ['L12', 'L15'], 3: ['L12', 'L15', 'M17'],
        4: ['L12', 'L14', 'L15', 'M17'], 5: ['L12', 'L14', 'M16', 'L15', 'M17'],
        6: ['L12', 'L14', 'M15', 'M16', 'L15', 'M17'],
    };
    const gapSymbols = ['L12', 'L14', 'L15', 'M15', 'M16', 'M17'];
    const resolvedGaps = gapSymbols.filter(s => references.has(s));
    const gapCount = resolvedGaps.length;
    const gapSundaySymbols = gapPatterns[gapCount] ?? [];

    return {
        calendar: calSystem,
        pascha: calendarPascha,
        references,
        prevReferences: prevCalRefs,
        fastingMap: buildFastingMap(year, physicalPascha, calSystem.fixedDateShift),
        toneMap: buildToneMap(year, physicalPascha, prevPhysicalPascha),
        noteMap: buildNoteMap(year, physicalPascha),
        movableTextMap: buildMovableTextMap(year, references, prevCalRefs, calSystem),
        specialTextMap: buildSpecialTextMap(year, calSystem),
        readingsMap: buildReadingsMap(year, references, prevCalRefs, physicalPascha, gapSundaySymbols, calSystem),
        ecum4Mmdd: ecum4 ? calSystem.getMMDD(ecum4) : null,
    };
}

/**
 * Build a CalendarContext for one calendar system for one year.
 * This is the core precomputation unit — all rule maps keyed by physical day-of-year or calendar MM-DD.
 */
export function buildCalendarContextForYear(year: number, cal: CalendarSystem): CalendarContext {
    const pascha = getPaschaForYear(year, cal);
    const prevPascha = getPaschaForYear(year - 1, cal);
    const prevRefs = resolveMovableReferences(year - 1, prevPascha, cal);

    return buildCalendarContext(year, pascha, prevPascha, pascha, prevRefs, cal);
}

/**
 * Build a full YearContext for a given year.
 * Called once, then reused for all date generation within that year.
 */
export function buildYearContext(year: number, timezone?: string): YearContext {
    const newCalendar = buildCalendarContextForYear(year, GREGORIAN);
    const oldCalendar = buildCalendarContextForYear(year, JULIAN);

    const moonMap = buildMoonMap(year, timezone);

    return { year, newCalendar, oldCalendar, moonMap };
}
