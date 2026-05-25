import { CalendarData, MonthData, GridData, BoxData, DateBox, EmptyBox, NoteBox, SplitBox } from '../types.js';
import { CalendarSystem, GREGORIAN, JULIAN } from '../engine/calendarSystem.js';
import { CalendarDate } from '../engine/calendarDate.js';
import { PhysicalDay } from '../engine/physicalDay.js';
import { EnrichedDateData, MoonPhase } from '../engine/enrichedTypes.js';
import { generateDataRange } from '../engine/dataEngine.js';
import { buildMoonMap } from '../engine/rules/moonRules.js';
import { dayOfYear } from '../engine/rules/dateUtils.js';
import { formatReadings } from '../engine/rules/readingsFormatter.js';

export type ReadingsLayoutOptions = {
    maxLines: number;
    maxLineWidth: number;
    charWidth?: (char: string) => number;
};

export type GenerateCalendarOptions = {
    calendar?: CalendarSystem;          // default: GREGORIAN
    secondaryCalendar?: CalendarSystem; // default: JULIAN
    timezone?: string;                  // for moon phases, default: 'America/Phoenix'
    noteIndicators?: string[];          // default: ['*', '†', '‡']
    readingsLayout?: ReadingsLayoutOptions; // if provided, readings are formatted/abbreviated to fit
};

const DEFAULTS = {
    calendar: GREGORIAN,
    secondaryCalendar: JULIAN,
    timezone: 'America/Phoenix',
    noteIndicators: ['*', '†', '‡'],
    readingsLayout: undefined as ReadingsLayoutOptions | undefined,
};

/** A single composite day combining primary, secondary, and moon data. */
export type CalendarDayData = {
    primaryData: EnrichedDateData;
    secondaryData: EnrichedDateData;
    moon: MoonPhase;
};

// ============================================================
// Public API
// ============================================================

/**
 * Generate composite calendar data for a range of dates.
 * This is the core function — calls the data layer for both calendars and adds moon phases.
 *
 * @param start - Start date in the primary calendar's coordinates
 * @param end - End date in the primary calendar's coordinates
 */
export function generateCalendarRange(
    start: CalendarDate,
    end: CalendarDate,
    options?: GenerateCalendarOptions,
): CalendarDayData[] {
    const opts = { ...DEFAULTS, ...options };

    // Primary calendar data
    const primaryData = generateDataRange(start, end, opts.calendar);

    // Determine physical day range for moon computation and secondary calendar conversion
    const physicalStart = opts.calendar.toPhysicalDate(start.year, start.month, start.day);
    const physicalEnd = opts.calendar.toPhysicalDate(end.year, end.month, end.day);

    // Secondary calendar data
    const secondaryStart = physicalToCalendarDate(physicalStart, opts.secondaryCalendar);
    const secondaryEnd = physicalToCalendarDate(physicalEnd, opts.secondaryCalendar);
    const secondaryData = generateDataRange(secondaryStart, secondaryEnd, opts.secondaryCalendar);

    // Moon phases — keyed by physical year
    const moonMaps = new Map<number, Map<number, MoonPhase>>();
    const startYear = physicalStart.year();
    const endYear = physicalEnd.year();
    for (let y = startYear; y <= endYear; y++) {
        moonMaps.set(y, buildMoonMap(y, opts.timezone));
    }

    // Assemble composite days
    const results: CalendarDayData[] = [];
    let currentPhysical = physicalStart;
    for (let i = 0; i < primaryData.length; i++) {
        const doy = dayOfYear(currentPhysical);
        const moonMap = moonMaps.get(currentPhysical.year())!;
        const moon: MoonPhase = moonMap.get(doy) ?? 'NONE';
        results.push({
            primaryData: primaryData[i],
            secondaryData: secondaryData[i],
            moon,
        });
        currentPhysical = currentPhysical.addDays(1);
    }

    return results;
}

/**
 * Generate a complete calendar for a year, with month grids and note indicators.
 * Calls generateCalendarRange internally.
 */
export function generateCalendarYear(year: number, options?: GenerateCalendarOptions): CalendarData {
    const opts = { ...DEFAULTS, ...options };

    const start: CalendarDate = { year, month: 1, day: 1 };
    const end: CalendarDate = { year, month: 12, day: 31 };
    const compositeDays = generateCalendarRange(start, end, opts);

    const months = buildMonths(compositeDays, year, opts);
    return { year: String(year), months };
}

/** Alias for backward compatibility. */
export const generateCalendar = generateCalendarYear;

/**
 * Generate composite calendar data for a single date.
 * Calls generateCalendarRange internally.
 */
export function generateCalendarDate(
    year: number,
    month: number,
    day: number,
    options?: GenerateCalendarOptions,
): CalendarDayData {
    const start: CalendarDate = { year, month, day };
    const results = generateCalendarRange(start, start, options);
    return results[0];
}

// ============================================================
// Internal helpers
// ============================================================

const MONTH_NAMES: [string, string][] = [
    ['January', 'Ἰανουάριος'],
    ['February', 'Φεβρουάριος'],
    ['March', 'Μάρτιος'],
    ['April', 'Ἀπρίλιος'],
    ['May', 'Μάϊος'],
    ['June', 'Ἰούνιος'],
    ['July', 'Ἰούλιος'],
    ['August', 'Αὔγουστος'],
    ['September', 'Σεπτέμβριος'],
    ['October', 'Ὀκτώβριος'],
    ['November', 'Νοέμβριος'],
    ['December', 'Δεκέμβριος'],
];

/** Convert a PhysicalDay to a CalendarDate in a given calendar system. */
function physicalToCalendarDate(day: PhysicalDay, cal: CalendarSystem): CalendarDate {
    const mmdd = cal.getMMDD(day);
    const [month, dayNum] = mmdd.split('-').map(Number);
    const physYear = day.year();
    const gregMonth = new Date(day._epochMs()).getUTCMonth() + 1;
    const calYear = (month === 12 && gregMonth === 1) ? physYear - 1 : physYear;
    return { year: calYear, month, day: dayNum };
}

/**
 * Split composite days into months and build MonthData[].
 * A new month starts when primaryData.date === 1 (except the very first day).
 */
function buildMonths(compositeDays: CalendarDayData[], year: number, opts: typeof DEFAULTS): MonthData[] {
    const monthChunks: CalendarDayData[][] = [];
    let currentChunk: CalendarDayData[] = [];

    for (let i = 0; i < compositeDays.length; i++) {
        if (i > 0 && compositeDays[i].primaryData.date === 1) {
            monthChunks.push(currentChunk);
            currentChunk = [];
        }
        currentChunk.push(compositeDays[i]);
    }
    if (currentChunk.length > 0) {
        monthChunks.push(currentChunk);
    }

    // Pre-scan entire year for global indicator assignment
    const indicatorMap = buildGlobalIndicatorMap(compositeDays, opts.noteIndicators);

    const months: MonthData[] = [];
    for (let m = 0; m < monthChunks.length; m++) {
        const chunk = monthChunks[m];
        const { dateBoxes, noteBoxes } = transformToUI(chunk, indicatorMap, opts.readingsLayout);
        const startDow = opts.calendar.toPhysicalDate(year, m + 1, 1).dayOfWeek();
        const grid = buildGrid(dateBoxes, noteBoxes, startDow);
        months.push({
            name: [MONTH_NAMES[m][0], MONTH_NAMES[m][1]],
            grid,
        });
    }

    return months;
}

/**
 * Build a global indicator assignment map from all composite days.
 * Scans for unique lengthy notes and assigns symbols in encounter order.
 */
function buildGlobalIndicatorMap(compositeDays: CalendarDayData[], noteIndicators: string[]): Map<string, string> {
    const map = new Map<string, string>();
    let idx = 0;
    for (const cd of compositeDays) {
        const notes = cd.primaryData.lengthyNotes;
        if (notes.length < 2) continue;
        const key = notes[0];
        if (map.has(key)) continue;
        if (idx >= noteIndicators.length) {
            console.warn(`Warning: note indicator wrap-around — "${key}" reuses symbol "${noteIndicators[idx % noteIndicators.length]}"`);
        }
        map.set(key, noteIndicators[idx % noteIndicators.length]);
        idx++;
    }
    return map;
}

type TransformResult = {
    dateBoxes: DateBox[];
    noteBoxes: NoteBox[];
};

/**
 * Transform CalendarDayData[] into UI DateBoxes and NoteBoxes.
 */
function transformToUI(chunk: CalendarDayData[], indicatorMap: Map<string, string>, readingsLayout?: ReadingsLayoutOptions): TransformResult {
    const noteMap = new Map<string, [string, string]>();
    for (const cd of chunk) {
        const notes = cd.primaryData.lengthyNotes;
        if (notes.length < 2) continue;
        if (!noteMap.has(notes[0])) {
            noteMap.set(notes[0], [notes[0], notes[1]]);
        }
    }

    const dateBoxes: DateBox[] = chunk.map((cd) => {
        const primary = cd.primaryData;
        const secondary = cd.secondaryData;

        const isFeast = primary.feast !== undefined;
        const isSecondaryFeast = isFeast && secondary.feast !== undefined;

        const mainText: DateBox['mainText'] = {};
        if (primary.feast) mainText.feast = primary.feast;
        if (primary.saint) mainText.saint = primary.saint;
        if (primary.note) mainText.note = primary.note;

        const box: DateBox = {
            type: 'DATE',
            date: primary.date,
            secondaryDate: secondary.date,
            background: primary.fasting === 'NONE' ? 'STANDARD' : 'FASTING',
            moon: cd.moon,
            fasting: primary.fasting,
            isFeast,
            isSecondaryFeast,
            mainText,
            lowerText: {
                readings: readingsLayout ? formatReadings(primary.readings, readingsLayout) : primary.readings,
                ...(primary.tone ? { tone: primary.tone } : {}),
            },
        };

        if (primary.lengthyNotes.length >= 2) {
            const indicator = indicatorMap.get(primary.lengthyNotes[0]);
            if (indicator) box.note = indicator;
        }

        return box;
    });

    const noteBoxes: NoteBox[] = [];
    for (const [key, text] of noteMap) {
        const indicator = indicatorMap.get(key);
        if (indicator) {
            noteBoxes.push({ type: 'NOTE', note: indicator, text });
        }
    }

    return { dateBoxes, noteBoxes };
}

/**
 * Build a 5x7 grid from DateBoxes and NoteBoxes.
 * @param startDow - day-of-week (0=Sun) the first day of the month falls on.
 */
function buildGrid(dateBoxes: DateBox[], noteBoxes: NoteBox[], startDow: number): GridData {
    const daysInMonth = dateBoxes.length;

    const totalPositions = startDow + daysInMonth;
    const overflow = Math.max(0, totalPositions - 35);

    const splitAtPosition = new Map<number, SplitBox>();
    const datesConsumedBySplit = new Set<number>();

    for (let i = 0; i < overflow; i++) {
        const overflowPos = 35 + i;
        const overflowDateIdx = overflowPos - startDow;
        const row5Pos = overflowPos - 7;
        const row5DateIdx = row5Pos - startDow;

        splitAtPosition.set(row5Pos, {
            type: 'SPLIT',
            top: dateBoxes[row5DateIdx],
            bottom: dateBoxes[overflowDateIdx],
        });
        datesConsumedBySplit.add(row5DateIdx);
        datesConsumedBySplit.add(overflowDateIdx);
    }

    const contentCells = (daysInMonth - overflow * 2) + overflow;
    const noteCount = noteBoxes.length;
    const availableForNotes = 35 - contentCells;
    const notesToPlace = Math.min(noteCount, Math.max(0, availableForNotes));
    const notesBefore = Math.min(notesToPlace, startDow);
    const notesAfter = notesToPlace - notesBefore;

    const cells: BoxData[] = [];

    let notesPlacedBefore = 0;
    for (let i = 0; i < startDow; i++) {
        if (i >= startDow - notesBefore) {
            cells.push(noteBoxes[notesPlacedBefore]);
            notesPlacedBefore++;
        } else {
            cells.push({ type: 'EMPTY' } as EmptyBox);
        }
    }

    let dateIdx = 0;
    for (let pos = startDow; pos < 35; pos++) {
        if (splitAtPosition.has(pos)) {
            cells.push(splitAtPosition.get(pos)!);
            dateIdx++;
        } else {
            while (datesConsumedBySplit.has(dateIdx) && dateIdx < daysInMonth) {
                dateIdx++;
            }
            if (dateIdx < daysInMonth) {
                cells.push(dateBoxes[dateIdx]);
                dateIdx++;
            } else {
                break;
            }
        }
    }

    for (let i = 0; i < notesAfter; i++) {
        cells.push(noteBoxes[notesBefore + i]);
    }

    while (cells.length < 35) {
        cells.push({ type: 'EMPTY' } as EmptyBox);
    }

    const grid: GridData = [];
    for (let row = 0; row < 5; row++) {
        grid.push(cells.slice(row * 7, (row + 1) * 7));
    }

    return grid;
}
