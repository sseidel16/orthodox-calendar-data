import { readFileSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(__dirname, '..', '..', 'data');

export type ImmovableEntry = {
    date: string; // MM-DD
    type: 'Feast' | 'Saint' | 'Note';
    english: string;
    greek: string;
};

export type MovableEntry = {
    paschaOffset: number;
    type: 'Feast' | 'Saint' | 'Note';
    english: string;
    greek: string;
};

export type SpecialEntry = {
    category: 'Special' | 'DRS';
    type: 'Feast' | 'Saint' | 'Note';
    english: string;
    greek: string;
};

export function parseImmovables(): ImmovableEntry[] {
    const content = readFileSync(join(DATA_DIR, 'text', 'Immovables.csv'), 'utf-8');
    const lines = content.trim().split('\n');
    // First line is header: Type,English,Greek (but actual first column is date)
    const entries: ImmovableEntry[] = [];
    for (let i = 1; i < lines.length; i++) {
        const parts = parseCSVLine(lines[i]);
        if (parts.length < 4) continue;
        entries.push({
            date: parts[0].trim(),
            type: parts[1].trim() as ImmovableEntry['type'],
            english: parts[2].trim(),
            greek: parts[3].trim(),
        });
    }
    return entries;
}

export function parseMovables(): MovableEntry[] {
    const content = readFileSync(join(DATA_DIR, 'text', 'Movables.csv'), 'utf-8');
    const lines = content.trim().split('\n');
    const entries: MovableEntry[] = [];
    for (let i = 1; i < lines.length; i++) {
        const parts = parseCSVLine(lines[i]);
        if (parts.length < 5) continue;
        entries.push({
            paschaOffset: parseInt(parts[0].trim(), 10),
            type: parts[2].trim() as MovableEntry['type'],
            english: parts[3].trim(),
            greek: parts[4].trim(),
        });
    }
    return entries;
}

export function parseSpecials(): SpecialEntry[] {
    const content = readFileSync(join(DATA_DIR, 'text', 'Specials.csv'), 'utf-8');
    const lines = content.trim().split('\n');
    const entries: SpecialEntry[] = [];
    for (let i = 1; i < lines.length; i++) {
        const parts = parseCSVLine(lines[i]);
        if (parts.length < 4) continue;
        entries.push({
            category: parts[0].trim() as SpecialEntry['category'],
            type: parts[1].trim() as SpecialEntry['type'],
            english: parts[2].trim(),
            greek: parts[3].trim(),
        });
    }
    return entries;
}

export function parsePaschaDates(): Map<number, Date> {
    const content = readFileSync(join(DATA_DIR, 'PaschaDates.csv'), 'utf-8');
    const lines = content.trim().split('\n');
    const map = new Map<number, Date>();
    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',');
        if (parts.length < 2) continue;
        const year = parseInt(parts[0].trim(), 10);
        const date = new Date(parts[1].trim() + 'T00:00:00Z');
        map.set(year, date);
    }
    return map;
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
