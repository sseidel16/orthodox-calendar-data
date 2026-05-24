/**
 * TextRules — resolves feast, saint, and note text for each date.
 * Per CalendarRules.md § FeastSaintNoteRules.
 *
 * Three sources are merged:
 * - Immovables: keyed by MM-DD (static, same every year)
 * - Movables: resolved from reference+offset to MM-DD at context build time
 * - Specials: conditional assignments (Royal Hours, DST, etc.)
 *
 * Eliminator dates (01/06, 08/06, 09/14, 12/25) suppress all non-immovable text.
 * ECUM4 feast overrides other feast text on its day.
 *
 * Multiple entries of the same type on one date are concatenated with '\n'.
 * Missing fields are omitted entirely (never empty arrays).
 */

import { parseTextImmovable, parseTextMovable, parseTextSpecial, TextImmovableEntry, TextMovableEntry, TextSpecialEntry } from '../../data/parser.js';
import { ResolvedReferences, resolveDate, resolveDatesForYear } from '../movableResolver.js';
import { CalendarSystem } from '../calendarSystem.js';
import { PhysicalDay } from '../physicalDay.js';
import { getNthSundayOfMonth } from './dateUtils.js';

/** Dates where only immovable text survives (movables/specials suppressed) */
const ELIMINATOR_DATES = new Set(['01-06', '08-06', '09-14', '12-25']);

// ============================================================
// Lazy-loaded, module-level data caches (parsed once per process)
// ============================================================

let immovablesIndex: Map<string, TextImmovableEntry[]> | null = null;
let movablesList: TextMovableEntry[] | null = null;
let specialsList: TextSpecialEntry[] | null = null;

/** Get immovables grouped by MM-DD key. Loaded once, reused for all years. */
function getImmovablesIndex(): Map<string, TextImmovableEntry[]> {
    if (!immovablesIndex) {
        immovablesIndex = new Map();
        for (const entry of parseTextImmovable()) {
            const list = immovablesIndex.get(entry.date) ?? [];
            list.push(entry);
            immovablesIndex.set(entry.date, list);
        }
    }
    return immovablesIndex;
}

/** Get all movable entries (parsed once). */
function getMovables(): TextMovableEntry[] {
    if (!movablesList) movablesList = parseTextMovable();
    return movablesList;
}

/** Get all special entries (parsed once). */
function getSpecials(): TextSpecialEntry[] {
    if (!specialsList) specialsList = parseTextSpecial();
    return specialsList;
}

// ============================================================
// Context-building functions (called once per year)
// ============================================================

/**
 * Precompute movable text assignments: iterate the TextMovable CSV once,
 * resolve each reference+offset to all valid dates in the year, and group by MM-DD.
 * This allows O(1) lookup per date during generation.
 *
 * Uses resolveDatesForYear to handle potential year-boundary wrapping
 * (same entry may land on multiple dates from different liturgical cycles).
 *
 * Also handles the St. George rule: if 04/23 falls before PASCHA+2 (Bright Tuesday),
 * the saint text from 04/23 is duplicated onto PASCHA+2.
 */
export function buildMovableTextMap(year: number, refs: ResolvedReferences, prevRefs: ResolvedReferences | undefined, cal: CalendarSystem): Map<string, TextMovableEntry[]> {
    const map = new Map<string, TextMovableEntry[]>();
    const prev = prevRefs ?? new Map<string, PhysicalDay>();

    // PASCHA-offset movables are only valid before SUNbE (non-inclusive)
    const sunbE = refs.get('SUNbE');

    for (const entry of getMovables()) {
        const dates = resolveDatesForYear(entry.reference, entry.offset, year, refs, prev);
        for (const date of dates) {
            // Filter: PASCHA offsets must fall before SUNbE
            if (entry.reference === 'PASCHA' && sunbE && !date.isBefore(sunbE)) continue;

            const mmdd = cal.getMMDD(date);
            const list = map.get(mmdd) ?? [];
            list.push(entry);
            map.set(mmdd, list);
        }
    }

    // St. George rule: if 04/23 falls before PASCHA+2, duplicate its saint text onto PASCHA+2
    applyStGeorgeRule(map, year, refs, cal);

    return map;
}

/**
 * If April 23 falls before Bright Tuesday (PASCHA+2), the saint text from 04/23
 * is shown again on PASCHA+2, prepended to any existing saint data for that date.
 */
function applyStGeorgeRule(map: Map<string, TextMovableEntry[]>, year: number, refs: ResolvedReferences, cal: CalendarSystem): void {
    const pascha = refs.get('PASCHA');
    if (!pascha) return;

    const apr23 = cal.toPhysicalDate(year, 4, 23);
    const brightTuesday = resolveDate(refs, 'PASCHA', 2);
    if (!brightTuesday) return;

    // Check if 04/23 falls before PASCHA+2
    if (!apr23.isBefore(brightTuesday)) return;

    // Get saint entries from the immovables for 04/23
    const apr23Immovables = getImmovablesIndex().get('04-23');
    if (!apr23Immovables) return;

    const saintEntries = apr23Immovables.filter(e => e.type === 'Saint');
    if (saintEntries.length === 0) return;

    // Add them to PASCHA+2's movable text map (as synthetic movable entries at the beginning)
    const brightTuesMmdd = cal.getMMDD(brightTuesday);
    const existing = map.get(brightTuesMmdd) ?? [];

    // Prepend saint entries (they go "at the beginning of" saint data)
    const syntheticEntries: TextMovableEntry[] = saintEntries.map(e => ({
        reference: 'PASCHA',
        offset: 2,
        type: 'Saint' as const,
        english: e.english,
        greek: e.greek,
    }));

    map.set(brightTuesMmdd, [...syntheticEntries, ...existing]);
}

/**
 * Precompute special text assignments for a year.
 * Handles Royal Hours / Liturgy of St. Basil placement and DST notes.
 * Calendar system determines what physical dates calendar dates correspond to.
 */
export function buildSpecialTextMap(year: number, cal: CalendarSystem): Map<string, TextSpecialEntry[]> {
    const map = new Map<string, TextSpecialEntry[]>();
    const specials = getSpecials();

    /** Helper to find a special entry by name and add it to the map at a given date */
    const addEntry = (mmdd: string, name: string) => {
        const entry = specials.find(e => e.english.trim() === name.trim());
        if (!entry) return;
        const list = map.get(mmdd) ?? [];
        list.push(entry);
        map.set(mmdd, list);
    };

    // Royal Hours / Liturgy rules for 01/05 (Eve of Theophany)
    const jan5dow = cal.toPhysicalDate(year, 1, 5).dayOfWeek();
    if (jan5dow >= 1 && jan5dow <= 5) {
        addEntry('01-05', 'Royal Hours');
        addEntry('01-05', 'Liturgy of St. Basil');
    } else if (jan5dow === 6) {
        addEntry('01-04', 'Royal Hours');
        addEntry('01-04', 'No Liturgy');
    } else {
        addEntry('01-03', 'Royal Hours');
        addEntry('01-03', 'No Liturgy');
    }

    // Royal Hours / Liturgy rules for 12/24 (Eve of Nativity)
    const dec24dow = cal.toPhysicalDate(year, 12, 24).dayOfWeek();
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

    // DST notes (US — 2nd Sunday in March, 1st Sunday in November)
    // These are physical events; convert to calendar MM-DD for lookup
    const dstBegin = getNthSundayOfMonth(year, 3, 2);
    addEntry(cal.getMMDD(dstBegin), 'Daylight Savings Time begins. Turn clocks forward 1 hour');
    const dstEnd = getNthSundayOfMonth(year, 11, 1);
    addEntry(cal.getMMDD(dstEnd), 'Daylight Savings Time ends. Turn clocks back 1 hour');

    return map;
}

// ============================================================
// Per-date application (called during date generation, O(1) lookups)
// ============================================================

/**
 * Apply text rules for a single date. Merges immovables + movables + specials,
 * respecting eliminator and ECUM4 override logic.
 *
 * @param mmdd - The date as "MM-DD"
 * @param movableTextMap - Precomputed movable text entries keyed by MM-DD
 * @param specialTextMap - Precomputed special text entries keyed by MM-DD
 * @param ecum4Mmdd - The MM-DD of ECUM4 (or null), for feast override logic
 */
export function applyTextRules(
    mmdd: string,
    movableTextMap: Map<string, TextMovableEntry[]>,
    specialTextMap: Map<string, TextSpecialEntry[]>,
    ecum4Mmdd: string | null,
): { feast?: string[]; saint?: string[]; note?: string[] } {
    const isEliminator = ELIMINATOR_DATES.has(mmdd);

    // Accumulators for each text type
    const feasts: { en: string; gr: string }[] = [];
    const saints: { en: string; gr: string }[] = [];
    const notes: { en: string; gr: string }[] = [];

    const addEntry = (type: string, english: string, greek: string) => {
        if (type === 'Feast') feasts.push({ en: english, gr: greek });
        else if (type === 'Saint') saints.push({ en: english, gr: greek });
        else if (type === 'Note') notes.push({ en: english, gr: greek });
    };

    // Order: movables, immovables, specials.
    // Movables and Specials are suppressed on eliminator dates.

    if (!isEliminator) {
        const movables = movableTextMap.get(mmdd);
        if (movables) {
            for (const entry of movables) {
                addEntry(entry.type, entry.english, entry.greek);
            }
        }
    }

    // Immovables always apply (never suppressed)
    const immovables = getImmovablesIndex().get(mmdd);
    if (immovables) {
        for (const entry of immovables) {
            addEntry(entry.type, entry.english, entry.greek);
        }
    }

    if (!isEliminator) {
        const specials = specialTextMap.get(mmdd);
        if (specials) {
            for (const entry of specials) {
                addEntry(entry.type, entry.english, entry.greek);
            }
        }
    }

    // ECUM4 feast overrides all other feast text for that day
    if (!isEliminator && ecum4Mmdd && mmdd === ecum4Mmdd) {
        const movables = movableTextMap.get(mmdd);
        if (movables) {
            const ecum4Feasts = movables.filter(e => e.type === 'Feast' && e.reference === 'ECUM4');
            if (ecum4Feasts.length > 0) {
                feasts.length = 0;
                for (const entry of ecum4Feasts) {
                    addEntry(entry.type, entry.english, entry.greek);
                }
            }
        }
    }

    // Build result — concatenate multiple entries with '\n', omit empty fields
    const result: { feast?: string[]; saint?: string[]; note?: string[] } = {};

    if (feasts.length > 0) {
        result.feast = [feasts.map(f => f.en).join('\n'), feasts.map(f => f.gr).join('\n')];
    }
    if (saints.length > 0) {
        result.saint = [saints.map(s => s.en).join('\n'), saints.map(s => s.gr).join('\n')];
    }
    if (notes.length > 0) {
        result.note = [notes.map(n => n.en).join('\n'), notes.map(n => n.gr).join('\n')];
    }

    return result;
}
