/**
 * Browser-compatible parser. CSV data is inlined at build time by esbuild's csv-loader plugin.
 * This file replaces parser.ts when building for the browser.
 */

// These imports are resolved by the csv-loader esbuild plugin to inlined strings
// @ts-ignore
import TextImmovableCSV from '../../data/TextImmovable.csv';
// @ts-ignore
import TextMovableCSV from '../../data/TextMovable.csv';
// @ts-ignore
import TextSpecialCSV from '../../data/TextSpecial.csv';
// @ts-ignore
import MovableReferencesCSV from '../../data/MovableReferences.csv';
// @ts-ignore
import ReadingsMovableCSV from '../../data/ReadingsMovable.csv';
// @ts-ignore
import ReadingsImmovableCSV from '../../data/ReadingsImmovable.csv';
// @ts-ignore
import PaschaDatesCSV from '../../data/PaschaDates.csv';

export type TextImmovableEntry = {
    date: string;
    type: 'Feast' | 'Saint' | 'Note';
    english: string;
    greek: string;
};

export type TextMovableEntry = {
    reference: string;
    offset: number;
    type: 'Feast' | 'Saint' | 'Note';
    english: string;
    greek: string;
};

export type TextSpecialEntry = {
    category: string;
    type: 'Feast' | 'Saint' | 'Note';
    english: string;
    greek: string;
};

export type MovableReferenceEntry = {
    symbol: string;
    note: string;
};

export type ReadingsMovableEntry = {
    reference: string;
    offset: number;
    type: string;
    book: string;
    verse: string;
    note: string;
};

export type ReadingsImmovableEntry = {
    date: string;
    type: string;
    book: string;
    verse: string;
    note: string;
};

export type PaschaDateEntry = {
    year: number;
    newPaschaDate: Date;
    oldPaschaDate: Date;
};

export function parseTextImmovable(): TextImmovableEntry[] {
    return parseFromString(TextImmovableCSV, parts => ({
        date: parts[0].trim(),
        type: parts[1].trim() as TextImmovableEntry['type'],
        english: parts[2].trim(),
        greek: parts[3].trim(),
    }), 4);
}

export function parseTextMovable(): TextMovableEntry[] {
    return parseFromString(TextMovableCSV, parts => ({
        reference: parts[0].trim(),
        offset: parseInt(parts[1].trim(), 10),
        type: parts[2].trim() as TextMovableEntry['type'],
        english: parts[3].trim(),
        greek: parts[4].trim(),
    }), 5);
}

export function parseTextSpecial(): TextSpecialEntry[] {
    return parseFromString(TextSpecialCSV, parts => ({
        category: parts[0].trim(),
        type: parts[1].trim() as TextSpecialEntry['type'],
        english: parts[2].trim(),
        greek: parts[3].trim(),
    }), 4);
}

export function parseMovableReferences(): MovableReferenceEntry[] {
    return parseFromString(MovableReferencesCSV, parts => ({
        symbol: parts[0].trim(),
        note: parts[1].trim(),
    }), 2);
}

export function parseReadingsMovable(): ReadingsMovableEntry[] {
    return parseFromString(ReadingsMovableCSV, parts => ({
        reference: parts[0].trim(),
        offset: parseInt(parts[1].trim(), 10),
        type: parts[2].trim(),
        book: parts[3].trim(),
        verse: parts[4].trim(),
        note: parts.length > 5 ? parts[5].trim() : '',
    }), 5);
}

export function parseReadingsImmovable(): ReadingsImmovableEntry[] {
    return parseFromString(ReadingsImmovableCSV, parts => ({
        date: parts[0].trim(),
        type: parts[1].trim(),
        book: parts[2].trim(),
        verse: parts[3].trim(),
        note: parts.length > 4 ? parts[4].trim() : '',
    }), 4);
}

export function parsePaschaDates(): PaschaDateEntry[] {
    const lines = (PaschaDatesCSV as string).trim().split('\n');
    const entries: PaschaDateEntry[] = [];
    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',');
        if (parts.length < 3) continue;
        entries.push({
            year: parseInt(parts[0].trim(), 10),
            newPaschaDate: new Date(parts[1].trim() + 'T00:00:00Z'),
            oldPaschaDate: new Date(parts[2].trim() + 'T00:00:00Z'),
        });
    }
    return entries;
}

function parseFromString<T>(csv: string, mapper: (parts: string[]) => T, minParts: number): T[] {
    const lines = csv.trim().split('\n');
    const entries: T[] = [];
    for (let i = 1; i < lines.length; i++) {
        const parts = parseCSVLine(lines[i]);
        if (parts.length < minParts) continue;
        entries.push(mapper(parts));
    }
    return entries;
}

function parseCSVLine(line: string): string[] {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (ch === ',' && !inQuotes) {
            fields.push(current);
            current = '';
        } else {
            current += ch;
        }
    }
    fields.push(current);
    return fields;
}
