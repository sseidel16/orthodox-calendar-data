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
 */
export function getMonthGrid(month: number, year: number, ctxOrOptions?: YearContext | CalendarOptions, indicators?: string[]): MonthData {
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

    const monthName = MONTH_NAMES[month][0];
    const { dateBoxes, noteBoxes } = transformToUI(enrichedDates, noteIndicators, monthName);
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
 * Transform EnrichedDate[] into UI DateBoxes and NoteBoxes.
 * Merges oldData/newData into the single DateBox structure.
 */
function transformToUI(enrichedDates: EnrichedDate[], noteIndicators: string[], monthName: string): TransformResult {
    // Collect unique lengthy notes (from newData — the primary calendar for display)
    const noteMap = new Map<string, { text: [string, string]; dateIndices: number[] }>();

    for (let i = 0; i < enrichedDates.length; i++) {
        const notes = enrichedDates[i].newData.lengthyNotes;
        if (notes.length < 2) continue;
        const key = notes[0];
        const existing = noteMap.get(key);
        if (existing) {
            existing.dateIndices.push(i);
        } else {
            noteMap.set(key, { text: [notes[0], notes[1]], dateIndices: [i] });
        }
    }

    // Assign indicators
    const indicatorAssignments = new Map<string, string>();
    let indicatorIdx = 0;
    let warnedWrap = false;
    for (const [key] of noteMap) {
        if (indicatorIdx >= noteIndicators.length && !warnedWrap) {
            console.warn(`Warning: not enough note indicators for ${monthName} — indicators will repeat`);
            warnedWrap = true;
        }
        indicatorAssignments.set(key, noteIndicators[indicatorIdx % noteIndicators.length]);
        indicatorIdx++;
    }

    // Build DateBoxes
    const dateBoxes: DateBox[] = enrichedDates.map((ed) => {
        const nd = ed.newData;
        const od = ed.oldData;

        let noteIndicator: string | undefined;
        if (nd.lengthyNotes.length >= 2) {
            noteIndicator = indicatorAssignments.get(nd.lengthyNotes[0]);
        }

        // Feast display logic:
        // - Both old and new have feast → show both, mark both as feast dates
        // - Only new has feast → show new feast only
        // - Only old has feast → ignore old feast entirely
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

        if (noteIndicator) box.note = noteIndicator;

        return box;
    });

    // Build NoteBoxes
    const noteBoxes: NoteBox[] = [];
    for (const [key, indicator] of indicatorAssignments) {
        const noteData = noteMap.get(key)!;
        noteBoxes.push({
            type: 'NOTE',
            note: indicator,
            text: noteData.text,
        });
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
