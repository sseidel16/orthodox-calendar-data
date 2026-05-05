/**
 * Lazily-loaded and indexed data from CSV files.
 * Parsed once per process lifetime and cached.
 */

import { parseImmovables, parseMovables, parseSpecials, ImmovableEntry, MovableEntry, SpecialEntry } from '../../data/parser.js';

let immovablesIndex: Map<string, ImmovableEntry[]> | null = null;
let movablesIndex: Map<number, MovableEntry[]> | null = null;
let specialsList: SpecialEntry[] | null = null;

/** Get immovables grouped by date key (MM-DD) */
export function getImmovablesIndex(): Map<string, ImmovableEntry[]> {
    if (!immovablesIndex) {
        immovablesIndex = new Map();
        for (const entry of parseImmovables()) {
            const list = immovablesIndex.get(entry.date) ?? [];
            list.push(entry);
            immovablesIndex.set(entry.date, list);
        }
    }
    return immovablesIndex;
}

/** Get movables grouped by PaschaOffset */
export function getMovablesIndex(): Map<number, MovableEntry[]> {
    if (!movablesIndex) {
        movablesIndex = new Map();
        for (const entry of parseMovables()) {
            const list = movablesIndex.get(entry.paschaOffset) ?? [];
            list.push(entry);
            movablesIndex.set(entry.paschaOffset, list);
        }
    }
    return movablesIndex;
}

/** Get all special entries (DRS + Special) */
export function getSpecials(): SpecialEntry[] {
    if (!specialsList) {
        specialsList = parseSpecials();
    }
    return specialsList;
}

/** Get specials filtered by category */
export function getDrsEntries(): SpecialEntry[] {
    return getSpecials().filter(e => e.category === 'DRS');
}

export function getSpecialEntries(): SpecialEntry[] {
    return getSpecials().filter(e => e.category === 'Special');
}

/** Find a special entry by its English name */
export function findSpecialByName(name: string): SpecialEntry | undefined {
    return getSpecials().find(e => e.english === name);
}
