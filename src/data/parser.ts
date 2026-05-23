import { readFileSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(__dirname, '..', '..', 'data');

// ============================================================
// Parsed entry types
// ============================================================

export type TextImmovableEntry = {
    date: string; // MM-DD
    type: 'Feast' | 'Saint' | 'Note';
    english: string;
    greek: string;
};

export type TextMovableEntry = {
    reference: string; // e.g. "PASCHA", "L1", "SUNaT"
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
    date: string; // MM/DD format
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

// ============================================================
// Parsers
// ============================================================

export function parseTextImmovable(): TextImmovableEntry[] {
    const content = readFileSync(join(DATA_DIR, 'TextImmovable.csv'), 'utf-8');
    const lines = content.trim().split('\n');
    const entries: TextImmovableEntry[] = [];
    for (let i = 1; i < lines.length; i++) {
        const parts = parseCSVLine(lines[i]);
        if (parts.length < 4) continue;
        entries.push({
            date: parts[0].trim(),
            type: parts[1].trim() as TextImmovableEntry['type'],
            english: parts[2].trim(),
            greek: parts[3].trim(),
        });
    }
    return entries;
}

export function parseTextMovable(): TextMovableEntry[] {
    const content = readFileSync(join(DATA_DIR, 'TextMovable.csv'), 'utf-8');
    const lines = content.trim().split('\n');
    const entries: TextMovableEntry[] = [];
    for (let i = 1; i < lines.length; i++) {
        const parts = parseCSVLine(lines[i]);
        if (parts.length < 5) continue;
        entries.push({
            reference: parts[0].trim(),
            offset: parseInt(parts[1].trim(), 10),
            type: parts[2].trim() as TextMovableEntry['type'],
            english: parts[3].trim(),
            greek: parts[4].trim(),
        });
    }
    return entries;
}

export function parseTextSpecial(): TextSpecialEntry[] {
    const content = readFileSync(join(DATA_DIR, 'TextSpecial.csv'), 'utf-8');
    const lines = content.trim().split('\n');
    const entries: TextSpecialEntry[] = [];
    for (let i = 1; i < lines.length; i++) {
        const parts = parseCSVLine(lines[i]);
        if (parts.length < 4) continue;
        entries.push({
            category: parts[0].trim(),
            type: parts[1].trim() as TextSpecialEntry['type'],
            english: parts[2].trim(),
            greek: parts[3].trim(),
        });
    }
    return entries;
}

export function parseMovableReferences(): MovableReferenceEntry[] {
    const content = readFileSync(join(DATA_DIR, 'MovableReferences.csv'), 'utf-8');
    const lines = content.trim().split('\n');
    const entries: MovableReferenceEntry[] = [];
    for (let i = 1; i < lines.length; i++) {
        const parts = parseCSVLine(lines[i]);
        if (parts.length < 2) continue;
        entries.push({
            symbol: parts[0].trim(),
            note: parts[1].trim(),
        });
    }
    return entries;
}

export function parseReadingsMovable(): ReadingsMovableEntry[] {
    const content = readFileSync(join(DATA_DIR, 'ReadingsMovable.csv'), 'utf-8');
    const lines = content.trim().split('\n');
    const entries: ReadingsMovableEntry[] = [];
    for (let i = 1; i < lines.length; i++) {
        const parts = parseCSVLine(lines[i]);
        if (parts.length < 5) continue;
        entries.push({
            reference: parts[0].trim(),
            offset: parseInt(parts[1].trim(), 10),
            type: parts[2].trim() as ReadingsMovableEntry['type'],
            book: parts[3].trim(),
            verse: parts[4].trim(),
            note: parts.length > 5 ? parts[5].trim() : '',
        });
    }
    return entries;
}

export function parseReadingsImmovable(): ReadingsImmovableEntry[] {
    const content = readFileSync(join(DATA_DIR, 'ReadingsImmovable.csv'), 'utf-8');
    const lines = content.trim().split('\n');
    const entries: ReadingsImmovableEntry[] = [];
    for (let i = 1; i < lines.length; i++) {
        const parts = parseCSVLine(lines[i]);
        if (parts.length < 4) continue;
        entries.push({
            date: parts[0].trim(),
            type: parts[1].trim() as ReadingsImmovableEntry['type'],
            book: parts[2].trim(),
            verse: parts[3].trim(),
            note: parts.length > 4 ? parts[4].trim() : '',
        });
    }
    return entries;
}

export function parsePaschaDates(): PaschaDateEntry[] {
    const content = readFileSync(join(DATA_DIR, 'PaschaDates.csv'), 'utf-8');
    const lines = content.trim().split('\n');
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

// ============================================================
// CSV utility
// ============================================================

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
