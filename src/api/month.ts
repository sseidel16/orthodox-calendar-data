import { BoxData, DateBox, EmptyBox, GridData, MonthData, NoteBox, SplitBox } from '../types.js';
import { EnrichedDate } from '../engine/enrichedTypes.js';
import { buildYearContext, generateDateRangeWithCtx } from '../engine/dateEngine.js';
import { YearContext } from '../engine/yearContext.js';
import { CalendarOptions, resolveOptions, DEFAULT_OPTIONS } from '../options.js';

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

/**
 * Generate a full MonthData grid for a given month.
 *
 * @param ctxOrOptions - Either a prebuilt YearContext or CalendarOptions.
 * @param indicators - Custom note indicators (used when passing a YearContext directly).
 * @param indicatorMap - Pre-assigned indicator map for consistent symbols across months.
 *   If not provided, one is built from this month's data alone.
 */
export function getMonthGrid(month: number, year: number, ctxOrOptions?: YearContext | CalendarOptions, indicators?: string[], indicatorMap?: Map<string, string>): MonthData {
    let yearCtx: YearContext;
    let noteIndicators = indicators ?? DEFAULT_OPTIONS.noteIndicators;

    if (ctxOrOptions && 'year' in ctxOrOptions && 'newCalendar' in ctxOrOptions) {
        yearCtx = ctxOrOptions as YearContext;
    } else {
        const opts = resolveOptions(ctxOrOptions as CalendarOptions | undefined);
        yearCtx = buildYearContext(year, opts.timezone);
        noteIndicators = opts.noteIndicators;
    }

    const start = new Date(Date.UTC(year, month, 1));
    const end = new Date(Date.UTC(year, month + 1, 0));
    const enrichedDates = generateDateRangeWithCtx(start, end, yearCtx);

    // Build a local indicator map if none was provided globally
    const map = indicatorMap ?? buildIndicatorMap(enrichedDates, noteIndicators);
    const { dateBoxes, noteBoxes } = transformToUI(enrichedDates, map);
    const grid = buildGrid(dateBoxes, noteBoxes, year, month);

    return {
        name: [MONTH_NAMES[month][0], MONTH_NAMES[month][1]],
        grid,
    };
}

type TransformResult = {
    dateBoxes: DateBox[];
    noteBoxes: NoteBox[];
};

/**
 * Build an indicator assignment map from a set of enriched dates.
 * Scans for unique lengthy notes and assigns symbols in encounter order.
 * Warns on wrap-around if more unique notes exist than available indicators.
 */
export function buildIndicatorMap(enrichedDates: EnrichedDate[], noteIndicators: string[]): Map<string, string> {
    const map = new Map<string, string>();
    let idx = 0;
    for (const ed of enrichedDates) {
        const notes = ed.newData.lengthyNotes;
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

/**
 * Transform EnrichedDate[] into UI DateBoxes and NoteBoxes.
 * Merges oldData/newData into the single DateBox structure.
 */
function transformToUI(enrichedDates: EnrichedDate[], indicatorMap: Map<string, string>): TransformResult {
    // Collect unique lengthy notes present in this month
    const noteMap = new Map<string, [string, string]>();
    for (const ed of enrichedDates) {
        const notes = ed.newData.lengthyNotes;
        if (notes.length < 2) continue;
        if (!noteMap.has(notes[0])) {
            noteMap.set(notes[0], [notes[0], notes[1]]);
        }
    }

    // Build DateBoxes
    // Build DateBoxes
    const dateBoxes: DateBox[] = enrichedDates.map((ed) => {
        const nd = ed.newData;
        const od = ed.oldData;

        const hasNewFeast = nd.feast !== undefined;
        const hasOldFeast = od.feast !== undefined;
        const showOldFeast = hasNewFeast && hasOldFeast;

        const mainText: DateBox['mainText'] = {};
        if (nd.feast) mainText.feast = nd.feast;
        if (nd.saint) mainText.saint = nd.saint;
        if (nd.note) mainText.note = nd.note;

        const box: DateBox = {
            type: 'DATE',
            newDate: nd.date,
            oldDate: od.date,
            background: nd.fasting === 'NONE' ? 'STANDARD' : 'FASTING',
            moon: ed.moon,
            fasting: nd.fasting,
            newFeast: hasNewFeast,
            oldFeast: showOldFeast,
            mainText,
            lowerText: {
                readings: nd.readings,
                ...(nd.tone ? { tone: nd.tone } : {}),
            },
        };

        if (nd.lengthyNotes.length >= 2) {
            const indicator = indicatorMap.get(nd.lengthyNotes[0]);
            if (indicator) box.note = indicator;
        }

        return box;
    });

    // Build NoteBoxes for notes present in this month
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
 */
function buildGrid(dateBoxes: DateBox[], noteBoxes: NoteBox[], year: number, month: number): GridData {
    const firstDay = new Date(Date.UTC(year, month, 1));
    const startDow = firstDay.getUTCDay();
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
