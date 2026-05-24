/**
 * Shared parsing logic for both Node (filesystem) and browser (inlined) parsers.
 * This module has no I/O — it only transforms CSV strings into typed entries.
 */

// ============================================================
// Types
// ============================================================

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
    gregorian: { year: number; month: number; day: number };
    julian: { year: number; month: number; day: number };
};

// ============================================================
// Parsers (from CSV string content)
// ============================================================

export function parseTextImmovableFromString(csv: string): TextImmovableEntry[] {
    return parseCSV(csv, 4, parts => ({
        date: parts[0].trim(),
        type: parts[1].trim() as TextImmovableEntry['type'],
        english: parts[2].trim(),
        greek: parts[3].trim(),
    }));
}

export function parseTextMovableFromString(csv: string): TextMovableEntry[] {
    return parseCSV(csv, 5, parts => ({
        reference: parts[0].trim(),
        offset: parseInt(parts[1].trim(), 10),
        type: parts[2].trim() as TextMovableEntry['type'],
        english: parts[3].trim(),
        greek: parts[4].trim(),
    }));
}

export function parseTextSpecialFromString(csv: string): TextSpecialEntry[] {
    return parseCSV(csv, 4, parts => ({
        category: parts[0].trim(),
        type: parts[1].trim() as TextSpecialEntry['type'],
        english: parts[2].trim(),
        greek: parts[3].trim(),
    }));
}

export function parseMovableReferencesFromString(csv: string): MovableReferenceEntry[] {
    return parseCSV(csv, 2, parts => ({
        symbol: parts[0].trim(),
        note: parts[1].trim(),
    }));
}

export function parseReadingsMovableFromString(csv: string): ReadingsMovableEntry[] {
    return parseCSV(csv, 5, parts => ({
        reference: parts[0].trim(),
        offset: parseInt(parts[1].trim(), 10),
        type: parts[2].trim(),
        book: parts[3].trim(),
        verse: parts[4].trim(),
        note: parts.length > 5 ? parts[5].trim() : '',
    }));
}

export function parseReadingsImmovableFromString(csv: string): ReadingsImmovableEntry[] {
    return parseCSV(csv, 4, parts => ({
        date: parts[0].trim(),
        type: parts[1].trim(),
        book: parts[2].trim(),
        verse: parts[3].trim(),
        note: parts.length > 4 ? parts[4].trim() : '',
    }));
}

export function parsePaschaDatesFromString(csv: string): PaschaDateEntry[] {
    const lines = csv.trim().split('\n');
    const entries: PaschaDateEntry[] = [];
    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',');
        if (parts.length < 3) continue;
        entries.push({
            year: parseInt(parts[0].trim(), 10),
            gregorian: parseDateParts(parts[1]),
            julian: parseDateParts(parts[2]),
        });
    }
    return entries;
}

// ============================================================
// Utilities
// ============================================================

function parseDateParts(str: string): { year: number; month: number; day: number } {
    const [y, m, d] = str.trim().split('-').map(Number);
    return { year: y, month: m, day: d };
}

function parseCSV<T>(csv: string, minParts: number, mapper: (parts: string[]) => T): T[] {
    const lines = csv.trim().split('\n');
    const entries: T[] = [];
    for (let i = 1; i < lines.length; i++) {
        const parts = parseCSVLine(lines[i]);
        if (parts.length < minParts) continue;
        entries.push(mapper(parts));
    }
    return entries;
}

/** Simple CSV line parser that handles quoted fields with commas */
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
