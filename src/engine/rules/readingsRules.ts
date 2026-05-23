/**
 * ReadingsRules — assigns Bible readings to each date.
 * Per CalendarRules.md § ReadingsRules.
 *
 * Algorithm:
 * 1. Apply movable readings (bundles from ReadingsMovable.csv resolved to dates)
 * 2. Apply gap Sunday epistle bundles (copied from specific PASCHA offsets)
 * 3. Apply immovable readings (LLR and HLR from ReadingsImmovable.csv)
 * 4. Apply elimination rules (01/03, 01/04, 12/22, 12/23 based on feast day-of-week)
 *
 * A "bundle" = adjacent rows in the CSV sharing the same reference+offset+type.
 * Bundles overwrite any existing bundle of the same type on a date.
 */

import { parseReadingsMovable, parseReadingsImmovable, ReadingsMovableEntry, ReadingsImmovableEntry } from '../../data/parser.js';
import { ResolvedReferences, resolveDate, resolveDatesForYear } from '../movableResolver.js';
import { CalendarSystem } from '../calendarSystem.js';
import { PhysicalDay } from '../physicalDay.js';
import { getDow, utcDate, addDays, daysBetween } from './dateUtils.js';

// Cached parsed data
let movableReadingsCache: ReadingsMovableEntry[] | null = null;
let immovableReadingsCache: ReadingsImmovableEntry[] | null = null;

function getMovableReadings(): ReadingsMovableEntry[] {
    if (!movableReadingsCache) movableReadingsCache = parseReadingsMovable();
    return movableReadingsCache;
}

function getImmovableReadings(): ReadingsImmovableEntry[] {
    if (!immovableReadingsCache) immovableReadingsCache = parseReadingsImmovable();
    return immovableReadingsCache;
}

/** All readings assigned to a date, grouped by type (any string key from the CSV) */
type DateReadings = Map<string, string[]>;

/**
 * Build a readings map for the entire year.
 * Returns Map<string, string[]> keyed by "MM-DD" → formatted reading strings.
 *
 * @param prevRefs - Previous year's resolved references. Needed because early-year dates
 *   (before SUNaT) use the previous year's Pascha offsets for movable readings.
 */
export function buildReadingsMap(
    year: number,
    refs: ResolvedReferences,
    prevRefs: ResolvedReferences,
    pascha: PhysicalDay,
    gapSundaySymbols: string[],
    cal: CalendarSystem,
): Map<string, string[]> {
    const toMMDD = (d: PhysicalDay) => cal.getMMDD(d);
    const toPhysical = (m: number, d: number) => cal.toPhysicalDate(year, m, d);
    const dateReadings = new Map<string, DateReadings>();

    // Step 1: Apply movable readings, resolving from both current and previous year's refs.
    applyMovableReadings(dateReadings, year, refs, prevRefs, toMMDD);

    // Step 2: Apply gap Sunday epistle bundles
    applyGapSundayEpistles(dateReadings, year, refs, gapSundaySymbols, toMMDD);

    // Step 3: Apply immovable readings (LLR and HLR)
    applyImmovableReadings(dateReadings, year, pascha, toPhysical);

    // Step 4: Elimination rules
    applyEliminationRules(dateReadings, year, toPhysical);

    // Convert to final format: flatten all type bundles in a consistent order
    // Order: OLD first, then EPISTLE, then GOSPEL last
    const result = new Map<string, string[]>();
    for (const [mmdd, dr] of dateReadings) {
        const types = [...dr.keys()].sort((a, b) => {
            if (a === 'OLD') return -1;
            if (b === 'OLD') return 1;
            if (a === 'EPISTLE') return -1;
            if (b === 'EPISTLE') return 1;
            return a.localeCompare(b);
        });
        const combined: string[] = [];
        for (const type of types) {
            combined.push(...dr.get(type)!);
        }
        if (combined.length > 0) {
            result.set(mmdd, combined);
        }
    }

    return result;
}

/** Format a reading entry as "Book Verse" */
function formatReading(book: string, verse: string): string {
    return `${book} ${verse}`;
}

/** Get or create DateReadings for a given MM-DD */
function getDateReadings(map: Map<string, DateReadings>, mmdd: string): DateReadings {
    let dr = map.get(mmdd);
    if (!dr) {
        dr = new Map();
        map.set(mmdd, dr);
    }
    return dr;
}

/**
 * Step 1: Resolve movable readings to dates and apply bundles.
 * Adjacent rows with same reference+offset+type form a bundle.
 * If a bundle targets a date that already has a bundle of the same type, it overwrites.
 *
 * A single entry may resolve to multiple valid dates in the same year (e.g., PASCHA+257
 * lands on both Jan 2 from prev cycle and Dec 25 from current cycle). All valid
 * placements are applied.
 */
function applyMovableReadings(dateReadings: Map<string, DateReadings>, year: number, refs: ResolvedReferences, prevRefs: ResolvedReferences, toMMDD: (d: PhysicalDay) => string): void {
    const entries = getMovableReadings();
    let i = 0;

    while (i < entries.length) {
        // Identify the bundle: adjacent rows with same reference+offset+type
        const first = entries[i];
        const bundleRef = first.reference;
        const bundleOffset = first.offset;
        const bundleType = first.type;
        const bundleReadings: string[] = [];

        while (i < entries.length &&
            entries[i].reference === bundleRef &&
            entries[i].offset === bundleOffset &&
            entries[i].type === bundleType) {
            bundleReadings.push(formatReading(entries[i].book, entries[i].verse));
            i++;
        }

        // Resolve to all valid dates in the target year
        const targets = resolveDatesForYear(bundleRef, bundleOffset, year, refs, prevRefs);

        // Place the bundle on all valid target dates
        for (const date of targets) {
            const mmdd = toMMDD(date);
            const dr = getDateReadings(dateReadings, mmdd);
            dr.set(bundleType, bundleReadings);
        }
    }
}

/**
 * Step 2: Copy epistle bundles from specific PASCHA offsets onto gap Sundays.
 * Looks up the epistle bundle directly from the CSV by PASCHA offset number,
 * NOT from the resolved dateReadings map (which would collide on MM-DD with other entries).
 */
function applyGapSundayEpistles(
    dateReadings: Map<string, DateReadings>,
    year: number,
    refs: ResolvedReferences,
    gapSundaySymbols: string[],
    toMMDD: (d: PhysicalDay) => string,
): void {
    const patterns: Record<number, number[]> = {
        1: [273],
        2: [252, 273],
        3: [252, 273, 168],
        4: [252, 266, 273, 168],
        5: [252, 259, 266, 273, 168],
        6: [245, 252, 259, 266, 273, 168],
    };

    const count = gapSundaySymbols.length;
    const offsets = patterns[count];
    if (!offsets) return;

    // Index epistle bundles by PASCHA offset directly from the CSV
    const epistleIndex = buildPaschaEpistleIndex();

    for (let i = 0; i < count; i++) {
        const gapDate = resolveDate(refs, gapSundaySymbols[i], 0);
        if (!gapDate || gapDate.year() !== year) continue;

        const bundle = epistleIndex.get(offsets[i]);
        if (!bundle || bundle.length === 0) continue;

        const gapMmdd = toMMDD(gapDate);
        const dr = getDateReadings(dateReadings, gapMmdd);
        dr.set('EPISTLE', [...bundle]);
    }
}

/** Build an index of PASCHA epistle bundles keyed by offset number from the raw CSV. */
function buildPaschaEpistleIndex(): Map<number, string[]> {
    const index = new Map<number, string[]>();
    const entries = getMovableReadings();

    let i = 0;
    while (i < entries.length) {
        const first = entries[i];
        if (first.reference === 'PASCHA' && first.type === 'EPISTLE') {
            const offset = first.offset;
            const bundle: string[] = [];
            while (i < entries.length &&
                entries[i].reference === 'PASCHA' &&
                entries[i].offset === offset &&
                entries[i].type === 'EPISTLE') {
                bundle.push(formatReading(entries[i].book, entries[i].verse));
                i++;
            }
            index.set(offset, bundle);
        } else {
            i++;
        }
    }

    return index;
}

/**
 * Step 3: Apply immovable readings with LLR/HLR logic.
 * HLR: always replace. LLR: replace unless it's a protected day.
 */
function applyImmovableReadings(dateReadings: Map<string, DateReadings>, year: number, pascha: PhysicalDay, toPhysical: (m: number, d: number) => PhysicalDay): void {
    const entries = getImmovableReadings();

    // Group immovable entries into bundles by date+type (adjacent rows)
    let i = 0;
    while (i < entries.length) {
        const first = entries[i];
        const bundleDate = first.date;
        const bundleType = first.type;
        const bundleReadings: string[] = [];

        while (i < entries.length &&
            entries[i].date === bundleDate &&
            entries[i].type === bundleType) {
            bundleReadings.push(formatReading(entries[i].book, entries[i].verse));
            i++;
        }

        // Convert MM/DD to MM-DD
        const mmdd = bundleDate.replace('/', '-');

        // Determine if this is LLR or HLR
        const level = getImmovableLevel(mmdd, year, pascha, toPhysical);
        if (level === 'NONE') continue; // not an immovable reading date

        if (level === 'HLR') {
            // Always replace
            const dr = getDateReadings(dateReadings, mmdd);
            dr.set(bundleType, bundleReadings);
        } else {
            // LLR: replace unless protected day
            if (!isProtectedDay(mmdd, year, pascha, toPhysical)) {
                const dr = getDateReadings(dateReadings, mmdd);
                dr.set(bundleType, bundleReadings);
            }
        }
    }
}

/** Higher-level reading dates — always replace */
const HLR_DATES = new Set([
    '01-01', '01-06', '02-02', '03-25', '08-06', '08-15', '09-08', '09-14', '11-21', '12-25',
]);

/** Lower-level reading dates — group 1 (unless on Saturday) */
const LLR_GROUP1 = new Set([
    '01-05', '01-07', '01-08', '01-09', '01-10', '01-11', '01-12', '01-13',
    '09-10', '09-11', '09-12', '09-13', '12-24',
]);

/** Lower-level reading dates — group 2 (always apply) */
const LLR_GROUP2 = new Set([
    '01-17', '01-18', '01-20', '01-25', '01-28', '01-30', '02-10', '02-24',
    '03-09', '04-25', '05-08', '05-21', '05-25', '06-24', '06-29', '06-30',
    '07-05', '07-20', '07-25', '07-27', '08-01', '08-07', '08-24', '08-29',
    '08-31', '09-01', '09-23', '09-26', '10-01', '10-18', '10-20', '10-26',
    '11-08', '11-09', '11-13', '11-16', '11-25', '11-30', '12-05', '12-06',
    '12-09', '12-12', '12-17', '12-26', '12-27',
]);

/** Determine the immovable reading level for a date */
function getImmovableLevel(mmdd: string, year: number, pascha: PhysicalDay, toPhysical: (m: number, d: number) => PhysicalDay): 'HLR' | 'LLR' | 'NONE' {
    if (HLR_DATES.has(mmdd)) return 'HLR';

    if (LLR_GROUP1.has(mmdd)) {
        // Unless it falls on Saturday
        const [m, d] = mmdd.split('-').map(Number);
        const dow = getDow(toPhysical(m, d));
        return dow === 6 ? 'NONE' : 'LLR';
    }

    if (LLR_GROUP2.has(mmdd)) return 'LLR';

    // 04/23 unless before PASCHA+2
    if (mmdd === '04-23') {
        const apr23 = toPhysical(4, 23);
        const brightTues = addDays(pascha, 2);
        return apr23.isBefore(brightTues) ? 'NONE' : 'LLR';
    }

    return 'NONE';
}

/**
 * Check if a date is "protected" from LLR overwrite.
 * Protected days: Sundays, Bright Week (PASCHA+1 to +6), Mid-Pentecost (PASCHA+24), Ascension (PASCHA+39)
 */
function isProtectedDay(mmdd: string, year: number, pascha: PhysicalDay, toPhysical: (m: number, d: number) => PhysicalDay): boolean {
    const [m, d] = mmdd.split('-').map(Number);
    const date = toPhysical(m, d);

    // Sunday
    if (getDow(date) === 0) return true;

    // Check Pascha offset
    const offset = daysBetween(pascha, date);
    if (offset >= 1 && offset <= 6) return true;   // Bright Week
    if (offset === 24) return true;                  // Mid-Pentecost
    if (offset === 39) return true;                  // Ascension

    return false;
}

/**
 * Step 4: Elimination rules.
 * Certain dates lose ALL readings based on when feasts fall.
 * On 03/25, OLD readings are eliminated.
 */
function applyEliminationRules(dateReadings: Map<string, DateReadings>, year: number, toPhysical: (m: number, d: number) => PhysicalDay): void {
    const jan6dow = getDow(toPhysical(1, 6));
    if (jan6dow === 1) dateReadings.delete('01-03'); // 01/06 Monday → eliminate 01/03
    if (jan6dow === 0) dateReadings.delete('01-04'); // 01/06 Sunday → eliminate 01/04

    const dec25dow = getDow(toPhysical(12, 25));
    if (dec25dow === 1) dateReadings.delete('12-22'); // 12/25 Monday → eliminate 12/22
    if (dec25dow === 0) dateReadings.delete('12-23'); // 12/25 Sunday → eliminate 12/23

    // On 03/25, eliminate any OLD readings
    const dr = dateReadings.get('03-25');
    if (dr) {
        dr.delete('OLD');
    }
}
