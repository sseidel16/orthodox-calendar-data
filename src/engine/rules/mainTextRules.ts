/**
 * MainTextRules — resolves feast, saint, and note text for each date.
 * Merges: Immovables (by MM-DD) + Movables (by PaschaOffset) + DRS + Specials.
 * Eliminator dates (01/06, 08/06, 09/14, 12/25) suppress non-immovable data.
 */

import { SpecialEntry } from '../../data/parser.js';
import { findSundayInRange, getNthSundayOfMonth, utcDate, getDow, formatMMDD } from './dateUtils.js';
import { getImmovablesIndex, getMovablesIndex, findSpecialByName, getDrsEntries, getSpecialEntries } from './dataCache.js';

const ELIMINATOR_DATES = new Set(['01-06', '08-06', '09-14', '12-25']);

/** DRS window definitions: [name, startMonth, startDay, endMonth, endDay] or split ranges */
type DrsWindow = {
    name: string;
    ranges: [number, number, number, number][]; // [startMonth, startDay, endMonth, endDay][]
};

const DRS_WINDOWS: DrsWindow[] = [
    { name: 'Sunday before the Elevation', ranges: [[9,7,9,13]] },
    { name: 'Sunday after the Elevation', ranges: [[9,15,9,21]] },
    { name: '1st Sunday of Luke', ranges: [[9,22,9,28]] },
    { name: '2nd Sunday of Luke', ranges: [[9,29,10,5]] },
    { name: '3rd Sunday of Luke', ranges: [[10,6,10,10],[10,18,10,19]] },
    { name: 'Holy Fathers of the 7th Ecumenical Council', ranges: [[10,11,10,17]] },
    { name: '6th Sunday of Luke', ranges: [[10,20,10,26]] },
    { name: '7th Sunday of Luke', ranges: [[10,27,10,29],[11,6,11,9]] },
    { name: '5th Sunday of Luke', ranges: [[10,30,11,5]] },
    { name: '8th Sunday of Luke', ranges: [[11,10,11,16]] },
    { name: '9th Sunday of Luke', ranges: [[11,17,11,23]] },
    { name: '13th Sunday of Luke', ranges: [[11,24,11,30]] },
    { name: '10th Sunday of Luke', ranges: [[12,4,12,10]] },
    { name: 'Sunday of the Holy Ancestors of Christ', ranges: [[12,11,12,17]] },
    { name: 'Sunday before Nativity', ranges: [[12,18,12,24]] },
    { name: 'Sunday after Nativity', ranges: [[12,26,12,29]] },
    { name: 'Sunday before Theophany', ranges: [[12,30,12,31],[1,1,1,5]] },
    { name: 'Sunday after Theophany', ranges: [[1,7,1,13]] },
    { name: 'Holy Fathers of 4th Ecumenical Council', ranges: [[7,13,7,19]] },
];

/**
 * Precompute DRS assignments for a year.
 * Returns map of "MM-DD" -> SpecialEntry[] for each Sunday that gets a DRS feast.
 */
export function buildDrsAssignments(year: number): Map<string, SpecialEntry[]> {
    const map = new Map<string, SpecialEntry[]>();
    const drsData = getDrsEntries();

    for (const window of DRS_WINDOWS) {
        let sunday: Date | null = null;
        for (const [sm, sd, em, ed] of window.ranges) {
            sunday = findSundayInRange(year, sm, sd, em, ed);
            if (sunday) break;
        }
        if (!sunday) continue;

        const entry = drsData.find(e => e.english === window.name);
        if (!entry) continue;

        const mmdd = formatMMDD(sunday);
        const list = map.get(mmdd) ?? [];
        list.push(entry);
        map.set(mmdd, list);
    }

    return map;
}

/**
 * Precompute Special assignments for a year.
 * Royal Hours, Liturgy of St. Basil, No Liturgy, DST notes.
 */
export function buildSpecialAssignments(year: number): Map<string, SpecialEntry[]> {
    const map = new Map<string, SpecialEntry[]>();

    const addEntry = (mmdd: string, name: string) => {
        const entry = findSpecialByName(name);
        if (!entry) return;
        const list = map.get(mmdd) ?? [];
        list.push(entry);
        map.set(mmdd, list);
    };

    // Royal Hours / Liturgy rules for 01/05
    const jan5dow = getDow(utcDate(year, 0, 5));
    if (jan5dow >= 1 && jan5dow <= 5) {
        // Mon-Fri: 01/05 gets Royal Hours + Liturgy of St. Basil
        addEntry('01-05', 'Royal Hours');
        addEntry('01-05', 'Liturgy of St. Basil');
    } else if (jan5dow === 6) {
        // Saturday: 01/04 gets Royal Hours + No Liturgy
        addEntry('01-04', 'Royal Hours');
        addEntry('01-04', 'No Liturgy');
    } else {
        // Sunday: 01/03 gets Royal Hours + No Liturgy
        addEntry('01-03', 'Royal Hours');
        addEntry('01-03', 'No Liturgy');
    }

    // Royal Hours / Liturgy rules for 12/24
    const dec24dow = getDow(utcDate(year, 11, 24));
    if (dec24dow >= 1 && dec24dow <= 5) {
        addEntry('12-24', 'Royal Hours');
        addEntry('12-24', 'Liturgy of St. Basil');
    } else if (dec24dow === 6) {
        addEntry('12-23', 'Royal Hours');
        addEntry('12-23', 'No Liturgy');
    } else {
        addEntry('12-22', 'Royal Hours');
        addEntry('12-22', 'No Liturgy');
    }

    // DST: 2nd Sunday in March
    const dstBegin = getNthSundayOfMonth(year, 3, 2);
    addEntry(formatMMDD(dstBegin), 'Daylight Savings Time begins. Turn clocks forward 1 hour');

    // DST: 1st Sunday in November
    const dstEnd = getNthSundayOfMonth(year, 11, 1);
    addEntry(formatMMDD(dstEnd), 'Daylight Savings Time ends. Turn clocks back 1 hour');

    return map;
}

/**
 * Apply MainText rules for a single date (called at generation time).
 * Merges all sources and handles eliminator logic.
 */
export function applyMainTextRules(
    mmdd: string,
    paschaOffset: number,
    drsAssignments: Map<string, SpecialEntry[]>,
    specialAssignments: Map<string, SpecialEntry[]>,
    movablesByOffset: Map<number, import('../../data/parser.js').MovableEntry[]>,
): { feast?: string[]; saint?: string[]; note?: string[] } {
    const immovablesIndex = getImmovablesIndex();
    const isEliminator = ELIMINATOR_DATES.has(mmdd);

    // Collect entries by type
    const feasts: { en: string; gr: string }[] = [];
    const saints: { en: string; gr: string }[] = [];
    const notes: { en: string; gr: string }[] = [];

    const addEntry = (type: string, english: string, greek: string) => {
        if (type === 'Feast') feasts.push({ en: english, gr: greek });
        else if (type === 'Saint') saints.push({ en: english, gr: greek });
        else if (type === 'Note') notes.push({ en: english, gr: greek });
    };

    // Immovables always apply
    const immovables = immovablesIndex.get(mmdd);
    if (immovables) {
        for (const entry of immovables) {
            addEntry(entry.type, entry.english, entry.greek);
        }
    }

    // Movables, DRS, Specials — suppressed by eliminator dates
    if (!isEliminator) {
        // Movables by PaschaOffset
        const movables = movablesByOffset.get(paschaOffset);
        if (movables) {
            for (const entry of movables) {
                addEntry(entry.type, entry.english, entry.greek);
            }
        }

        // DRS
        const drs = drsAssignments.get(mmdd);
        if (drs) {
            for (const entry of drs) {
                addEntry(entry.type, entry.english, entry.greek);
            }
        }

        // Specials
        const specials = specialAssignments.get(mmdd);
        if (specials) {
            for (const entry of specials) {
                addEntry(entry.type, entry.english, entry.greek);
            }
        }
    }

    // Build result, concatenating with \n, omitting empty fields
    const result: { feast?: string[]; saint?: string[]; note?: string[] } = {};

    if (feasts.length > 0) {
        result.feast = [
            feasts.map(f => f.en).join('\n'),
            feasts.map(f => f.gr).join('\n'),
        ];
    }
    if (saints.length > 0) {
        result.saint = [
            saints.map(s => s.en).join('\n'),
            saints.map(s => s.gr).join('\n'),
        ];
    }
    if (notes.length > 0) {
        result.note = [
            notes.map(n => n.en).join('\n'),
            notes.map(n => n.gr).join('\n'),
        ];
    }

    return result;
}
