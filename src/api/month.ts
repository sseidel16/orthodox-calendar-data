import { BoxData, DateBox, EmptyBox, GridData, MonthData, NoteBox, SplitBox } from '../types.js';
import { EnrichedDate, buildYearContext, generateDateRangeWithCtx, YearContext } from '../engine/dateEngine.js';
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
 * Handles SplitBox calculation, NoteBox aggregation, and grid layout.
 *
 * @param month - 0-indexed month (0=January)
 * @param year - Calendar year
 * @param ctxOrOptions - Prebuilt YearContext, or CalendarOptions to build one
 */
export function getMonthGrid(month: number, year: number, ctxOrOptions?: YearContext | CalendarOptions): MonthData {
    let yearCtx: YearContext;
    let noteIndicators = DEFAULT_OPTIONS.noteIndicators;

    if (ctxOrOptions && 'year' in ctxOrOptions && 'pascha' in ctxOrOptions) {
        yearCtx = ctxOrOptions as YearContext;
    } else {
        const opts = resolveOptions(ctxOrOptions as CalendarOptions | undefined);
        yearCtx = buildYearContext(year, opts.timezone);
        noteIndicators = opts.noteIndicators;
    }

    // Get all dates for this month
    const start = new Date(Date.UTC(year, month, 1));
    const end = new Date(Date.UTC(year, month + 1, 0)); // last day of month
    const enrichedDates = generateDateRangeWithCtx(start, end, yearCtx);

    // Transform EnrichedDate[] into DateBox[] + NoteBox[]
    const monthName = MONTH_NAMES[month][0];
    const { dateBoxes, noteBoxes } = transformToUI(enrichedDates, noteIndicators, monthName);

    // Build the 5x7 grid
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
 * Transform EnrichedDate[] into UI types:
 * - Convert each EnrichedDate to a DateBox
 * - Collect unique notes across the month
 * - Assign indicator symbols in priority order
 * - Create NoteBox entries for the grid
 */
function transformToUI(enrichedDates: EnrichedDate[], noteIndicators: string[], monthName: string): TransformResult {
    // Collect unique notes. EnrichedDate.notes is [english, greek] (a bilingual pair).
    // Key by English text to group dates sharing the same note.
    const noteMap = new Map<string, { text: [string, string]; dateIndices: number[] }>();

    for (let i = 0; i < enrichedDates.length; i++) {
        const notes = enrichedDates[i].notes;
        if (notes.length < 2) continue; // no note on this date
        const key = notes[0]; // English text as grouping key
        const existing = noteMap.get(key);
        if (existing) {
            existing.dateIndices.push(i);
        } else {
            noteMap.set(key, { text: [notes[0], notes[1]], dateIndices: [i] });
        }
    }

    // Assign indicators to unique notes in priority order
    const indicatorAssignments = new Map<string, string>(); // english key -> indicator
    let indicatorIdx = 0;
    let warnedWrap = false;
    for (const [key] of noteMap) {
        if (indicatorIdx >= noteIndicators.length && !warnedWrap) {
            console.warn(`Warning: not enough note indicators for ${monthName} — indicators will repeat`);
            warnedWrap = true;
        }
        const indicator = noteIndicators[indicatorIdx % noteIndicators.length];
        indicatorAssignments.set(key, indicator);
        indicatorIdx++;
    }

    // Build DateBoxes with indicator assignments
    const dateBoxes: DateBox[] = enrichedDates.map((ed) => {
        let noteIndicator: string | undefined;
        if (ed.notes.length >= 2) {
            noteIndicator = indicatorAssignments.get(ed.notes[0]);
        }

        const box: DateBox = {
            type: 'DATE',
            newDate: ed.newDate,
            oldDate: ed.oldDate,
            background: ed.fasting === 'NONE' ? 'STANDARD' : 'FASTING',
            moon: ed.moon,
            fasting: ed.fasting,
            mainText: ed.mainText,
            lowerText: ed.lowerText,
        };

        if (noteIndicator) {
            box.note = noteIndicator;
        }

        return box;
    });

    // Build NoteBoxes with bilingual text
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
 * Handles:
 * - Day-of-week alignment (Sunday=0 start)
 * - SplitBox for overflow into 6th row (placed at the same column in row 5)
 * - NoteBox placement (prefer next to 1st, fallback near end)
 * - EmptyBox for unused cells
 */
function buildGrid(dateBoxes: DateBox[], noteBoxes: NoteBox[], year: number, month: number): GridData {
    const firstDay = new Date(Date.UTC(year, month, 1));
    const startDow = firstDay.getUTCDay(); // 0=Sunday
    const daysInMonth = dateBoxes.length;

    // Each date naturally sits at position (startDow + dateIndex).
    // Positions >= 35 overflow into a hypothetical 6th row.
    // Overflow dates wrap to Sunday (col 0) of row 6, then Monday, etc.
    // SplitBox pairs each overflow date with the date 7 positions earlier
    // (same column, row 5) — because that's where the overflow wraps to.
    const totalPositions = startDow + daysInMonth;
    const overflow = Math.max(0, totalPositions - 35);

    // Map position -> SplitBox for positions in row 5 that get paired with overflow
    const splitAtPosition = new Map<number, SplitBox>();
    const datesConsumedBySplit = new Set<number>(); // date indices consumed

    for (let i = 0; i < overflow; i++) {
        const overflowPos = 35 + i;
        const overflowDateIdx = overflowPos - startDow;
        const row5Pos = overflowPos - 7; // same column, one row up
        const row5DateIdx = row5Pos - startDow;

        splitAtPosition.set(row5Pos, {
            type: 'SPLIT',
            top: dateBoxes[row5DateIdx],
            bottom: dateBoxes[overflowDateIdx],
        });
        datesConsumedBySplit.add(row5DateIdx);
        datesConsumedBySplit.add(overflowDateIdx);
    }

    // Content cells = regular dates + split boxes
    const contentCells = (daysInMonth - overflow * 2) + overflow;

    // NoteBoxes fill empty cells (not used by content)
    const noteCount = noteBoxes.length;
    const availableForNotes = 35 - contentCells;
    const notesToPlace = Math.min(noteCount, Math.max(0, availableForNotes));
    const notesBefore = Math.min(notesToPlace, startDow);
    const notesAfter = notesToPlace - notesBefore;

    // Build the 35-cell linear array
    const cells: BoxData[] = [];

    // Leading empties/notes before the 1st
    let notesPlacedBefore = 0;
    for (let i = 0; i < startDow; i++) {
        if (i >= startDow - notesBefore) {
            cells.push(noteBoxes[notesPlacedBefore]);
            notesPlacedBefore++;
        } else {
            cells.push({ type: 'EMPTY' } as EmptyBox);
        }
    }

    // Date cells and SplitBoxes in their natural positions
    let dateIdx = 0;
    for (let pos = startDow; pos < 35; pos++) {
        if (splitAtPosition.has(pos)) {
            cells.push(splitAtPosition.get(pos)!);
            dateIdx++; // skip the date at this position (consumed by split)
        } else {
            // Skip dates consumed by splits
            while (datesConsumedBySplit.has(dateIdx) && dateIdx < daysInMonth) {
                dateIdx++;
            }
            if (dateIdx < daysInMonth) {
                cells.push(dateBoxes[dateIdx]);
                dateIdx++;
            } else {
                break; // no more dates, rest will be notes/empties
            }
        }
    }

    // Trailing notes
    for (let i = 0; i < notesAfter; i++) {
        cells.push(noteBoxes[notesBefore + i]);
    }

    // Fill remaining with EmptyBox
    while (cells.length < 35) {
        cells.push({ type: 'EMPTY' } as EmptyBox);
    }

    // Reshape into 5x7 grid
    const grid: GridData = [];
    for (let row = 0; row < 5; row++) {
        grid.push(cells.slice(row * 7, (row + 1) * 7));
    }

    return grid;
}
