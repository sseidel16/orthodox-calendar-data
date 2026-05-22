import { parsePaschaDates } from '../data/parser.js';
import { TextMovableEntry, TextSpecialEntry } from '../data/parser.js';
import { ResolvedReferences, resolveMovableReferences } from './movableResolver.js';
import { FastingLevel, MoonPhase } from './enrichedTypes.js';
import { CalendarSystem, GREGORIAN, JULIAN } from './calendarSystem.js';
import { buildFastingMap } from './rules/fastingRules.js';
import { buildToneMap } from './rules/toneRules.js';
import { buildNoteMap } from './rules/noteRules.js';
import { buildMoonMap } from './rules/moonRules.js';
import { buildMovableTextMap, buildSpecialTextMap } from './rules/textRules.js';
import { formatMMDD } from './rules/dateUtils.js';

/**
 * Precomputed context for a single calendar system (old or new) within a year.
 * All maps are keyed by physical day-of-year for O(1) per-date lookups.
 */
export type CalendarContext = {
    calendar: CalendarSystem;
    pascha: Date;                                      // calendar-specific Pascha (for movable reference resolution)
    references: ResolvedReferences;                    // resolved movable reference dates
    prevReferences: ResolvedReferences;                // previous year's references
    fastingMap: Map<number, FastingLevel>;             // physical day-of-year -> fasting level
    toneMap: Map<number, string>;                      // physical day-of-year -> tone (Sundays only)
    noteMap: Map<number, [string, string]>;            // physical day-of-year -> [english, greek] lengthy note
    movableTextMap: Map<string, TextMovableEntry[]>;   // calendar "MM-DD" -> movable text entries
    specialTextMap: Map<string, TextSpecialEntry[]>;   // calendar "MM-DD" -> special text entries
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
let paschaCache: Map<number, { newPascha: Date; oldPascha: Date }> | null = null;

function getPaschaData(): Map<number, { newPascha: Date; oldPascha: Date }> {
    if (!paschaCache) {
        paschaCache = new Map();
        for (const entry of parsePaschaDates()) {
            paschaCache.set(entry.year, {
                newPascha: entry.newPaschaDate,
                oldPascha: entry.oldPaschaDate,
            });
        }
    }
    return paschaCache;
}

/** Get Pascha dates (old and new calendar) for a given year. */
export function getPaschaForYear(year: number): { newPascha: Date; oldPascha: Date } {
    const data = getPaschaData();
    const entry = data.get(year);
    if (!entry) throw new Error(`Pascha date not available for year ${year}`);
    return entry;
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
    physicalPascha: Date,
    prevPhysicalPascha: Date,
    calendarPascha: Date,
    prevCalRefs: ResolvedReferences,
    calSystem: CalendarSystem,
): CalendarContext {
    const references = resolveMovableReferences(year, calendarPascha);
    const ecum4 = references.get('ECUM4');

    return {
        calendar: calSystem,
        pascha: calendarPascha,
        references,
        prevReferences: prevCalRefs,
        fastingMap: buildFastingMap(year, physicalPascha, calSystem.fixedDateShift),
        toneMap: buildToneMap(year, physicalPascha, prevPhysicalPascha),
        noteMap: buildNoteMap(year, physicalPascha),
        movableTextMap: buildMovableTextMap(year, references),
        specialTextMap: buildSpecialTextMap(year),
        ecum4Mmdd: ecum4 ? formatMMDD(ecum4) : null,
    };
}

/**
 * Build a full YearContext for a given year.
 * Called once, then reused for all date generation within that year.
 */
export function buildYearContext(year: number, timezone?: string): YearContext {
    const { newPascha, oldPascha } = getPaschaForYear(year);
    const prevYear = getPaschaForYear(year - 1);

    const prevNewRefs = resolveMovableReferences(year - 1, prevYear.newPascha);
    const prevOldRefs = resolveMovableReferences(year - 1, prevYear.oldPascha);

    // Both calendars share the same physical Pascha Sunday.
    // New calendar uses Gregorian dates; old calendar uses Julian dates (shifted -13).
    const newCalendar = buildCalendarContext(year, newPascha, prevYear.newPascha, newPascha, prevNewRefs, GREGORIAN);
    const oldCalendar = buildCalendarContext(year, newPascha, prevYear.newPascha, oldPascha, prevOldRefs, JULIAN);

    const moonMap = buildMoonMap(year, timezone);

    return { year, newCalendar, oldCalendar, moonMap };
}
