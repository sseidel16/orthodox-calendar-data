/**
 * ReadingsFormatter — packs reading strings into a target number of lines,
 * abbreviating book names if needed to stay within character width.
 *
 * Input: string[] where each string is a full reading (e.g. "Matthew 26:2-20")
 * or a multi-part reading with semicolons (e.g. "Matthew 26:2-20; John 13:3-17; Matthew 26:21-39").
 *
 * Algorithm:
 * 1. If any reading exceeds maxLineWidth → abbreviate ALL book names
 * 2. If count ≤ maxLines → done
 * 3. Partition into maxLines balanced groups (minimax longest line), joined with "; "
 * 4. If any line exceeds maxLineWidth and not yet abbreviated → abbreviate all, redo from step 3
 *
 * Note: same-book combining is NOT performed because reading order is significant
 * (a single reading may interleave books, e.g. Matthew; John; Matthew).
 */

export type ReadingsLayoutOptions = {
    maxLines: number;
    maxLineWidth: number;
    charWidth?: CharWidthFn;
};

export type CharWidthFn = (char: string) => number;

/** Monospace: every character has width 1 */
export const MONOSPACE: CharWidthFn = () => 1;

/**
 * Proportional estimate: approximates typical serif/sans-serif fonts.
 * Normalized so that an average lowercase letter ~ 1.0.
 */
export const PROPORTIONAL: CharWidthFn = (c: string) => {
    if ('MWm'.includes(c)) return 1.4;
    if ('ABCDGHKNOPQRUVXY'.includes(c)) return 1.2;
    if ('EFLSTZ'.includes(c)) return 1.1;
    if ('Jw'.includes(c)) return 1.3;
    if ('I'.includes(c)) return 0.6;
    if ('il'.includes(c)) return 0.45;
    if ('fjrt'.includes(c)) return 0.6;
    if ('abdeghnopqu'.includes(c)) return 1.0;
    if ('cksvxyz'.includes(c)) return 0.9;
    if (c >= '0' && c <= '9') return 0.7;
    if (c === ' ') return 0.5;
    if (':;,.'.includes(c)) return 0.4;
    if (c === '-' || c === '\u2013') return 0.6;
    if ('()'.includes(c)) return 0.5;
    return 1.0;
};

const ABBREVIATIONS: Record<string, string> = {
    'Genesis': 'Gen.',
    'Exodus': 'Ex.',
    'Leviticus': 'Lev.',
    'Numbers': 'Num.',
    'Deuteronomy': 'Deut.',
    'Joshua': 'Josh.',
    'Judges': 'Judg.',
    'Ruth': 'Ruth',
    '1 Samuel': '1 Sam.',
    '2 Samuel': '2 Sam.',
    '1 Kings': '1 Kgs.',
    '2 Kings': '2 Kgs.',
    '1 Chronicles': '1 Chr.',
    '2 Chronicles': '2 Chr.',
    'Ezra': 'Ezra',
    'Nehemiah': 'Neh.',
    'Esther': 'Est.',
    'Job': 'Job',
    'Psalms': 'Ps.',
    'Proverbs': 'Prov.',
    'Ecclesiastes': 'Eccl.',
    'Song of Solomon': 'Song',
    'Isaiah': 'Is.',
    'Jeremiah': 'Jer.',
    'Lamentations': 'Lam.',
    'Ezekiel': 'Ezek.',
    'Daniel': 'Dan.',
    'Hosea': 'Hos.',
    'Joel': 'Joel',
    'Amos': 'Amos',
    'Obadiah': 'Obad.',
    'Jonah': 'Jonah',
    'Micah': 'Mic.',
    'Nahum': 'Nah.',
    'Habakkuk': 'Hab.',
    'Zephaniah': 'Zeph.',
    'Haggai': 'Hag.',
    'Zechariah': 'Zech.',
    'Malachi': 'Mal.',
    'Matthew': 'Mt.',
    'Mark': 'Mk.',
    'Luke': 'Lk.',
    'John': 'Jn.',
    'Acts': 'Acts',
    'Romans': 'Rom.',
    '1 Corinthians': '1 Cor.',
    '2 Corinthians': '2 Cor.',
    'Galatians': 'Gal.',
    'Ephesians': 'Eph.',
    'Philippians': 'Phil.',
    'Colossians': 'Col.',
    '1 Thessalonians': '1 Th.',
    '2 Thessalonians': '2 Th.',
    '1 Timothy': '1 Tim.',
    '2 Timothy': '2 Tim.',
    'Titus': 'Titus',
    'Philemon': 'Philem.',
    'Hebrews': 'Heb.',
    'James': 'Jas.',
    '1 Peter': '1 Pet.',
    '2 Peter': '2 Pet.',
    '1 John': '1 Jn.',
    '2 John': '2 Jn.',
    '3 John': '3 Jn.',
    'Jude': 'Jude',
    'Revelation': 'Rev.',
};

/** Measure the width of a string using the given charWidth function */
function measureWidth(str: string, charWidth: CharWidthFn): number {
    let width = 0;
    for (const c of str) {
        width += charWidth(c);
    }
    return width;
}

/**
 * Format readings into packed lines.
 * Never drops readings or verse ranges.
 * Hard constraint: maxLines. Soft constraint: maxLineWidth (overflow allowed).
 */
export function formatReadings(readings: string[], options: ReadingsLayoutOptions): string[] {
    if (readings.length === 0) return [];

    const cw = options.charWidth ?? MONOSPACE;
    const maxWidth = options.maxLineWidth;
    let abbreviated = false;

    // Step 1: Check if any single reading exceeds width at full names
    if (readings.some(r => measureWidth(r, cw) > maxWidth)) {
        abbreviated = true;
    }

    let items = abbreviated ? readings.map(abbreviateReading) : readings;

    // Step 2: If count <= maxLines, done
    if (items.length <= options.maxLines) {
        return items;
    }

    // Step 3: Partition into maxLines balanced groups
    let partition = balancedPartition(items, options.maxLines, cw);

    // Step 4: Check widths, abbreviate if needed and redo
    if (!abbreviated && partition.some(line => measureWidth(line, cw) > maxWidth)) {
        abbreviated = true;
        items = readings.map(abbreviateReading);
        partition = balancedPartition(items, options.maxLines, cw);
    }

    return partition;
}

/**
 * Abbreviate all book names within a reading string.
 * Handles semicolons (multi-part readings): splits, abbreviates each part, rejoins.
 */
function abbreviateReading(reading: string): string {
    const parts = reading.split(';');
    return parts.map(part => {
        const trimmed = part.trim();
        const book = extractBook(trimmed);
        if (!book) return trimmed;
        const abbr = ABBREVIATIONS[book];
        if (!abbr || abbr === book) return trimmed;
        return abbr + trimmed.slice(book.length);
    }).join('; ');
}

/**
 * Extract the book name from the beginning of a reading segment.
 * Handles numbered books (e.g. "1 Corinthians 11:23-32" → "1 Corinthians").
 * Strategy: try longest prefix match against the abbreviation keys.
 */
function extractBook(segment: string): string | null {
    // Try prefix match against known books (longest match wins)
    let bestMatch: string | null = null;
    for (const book of Object.keys(ABBREVIATIONS)) {
        if (segment.startsWith(book) && (segment.length === book.length || segment[book.length] === ' ')) {
            if (!bestMatch || book.length > bestMatch.length) {
                bestMatch = book;
            }
        }
    }
    return bestMatch;
}

/**
 * Find the optimal partition of items into k groups (preserving order)
 * that minimizes the width of the longest line.
 * Groups are joined with "; " when rendered.
 */
function balancedPartition(items: string[], k: number, charWidth: CharWidthFn): string[] {
    const n = items.length;
    if (k >= n) return [...items];

    const sepWidth = measureWidth('; ', charWidth);

    const lineLength = (from: number, to: number): number => {
        let width = 0;
        for (let i = from; i <= to; i++) {
            if (i > from) width += sepWidth;
            width += measureWidth(items[i], charWidth);
        }
        return width;
    };

    const renderLine = (from: number, to: number): string => {
        const parts: string[] = [];
        for (let i = from; i <= to; i++) {
            parts.push(items[i]);
        }
        return parts.join('; ');
    };

    const bestPartition = findBestSplit(n, k, lineLength);

    const result: string[] = [];
    for (const [from, to] of bestPartition) {
        result.push(renderLine(from, to));
    }

    return result;
}

/** Find the split that minimizes the max line length */
function findBestSplit(
    n: number,
    k: number,
    lineLength: (from: number, to: number) => number,
): [number, number][] {
    let bestMax = Infinity;
    let bestSplit: [number, number][] = [];

    const splits: number[] = [];

    function search(start: number, remaining: number): void {
        if (remaining === 0) {
            const groups: [number, number][] = [];
            let prev = 0;
            for (const s of splits) {
                groups.push([prev, s - 1]);
                prev = s;
            }
            groups.push([prev, n - 1]);

            const maxLen = Math.max(...groups.map(([f, t]) => lineLength(f, t)));
            if (maxLen < bestMax) {
                bestMax = maxLen;
                bestSplit = [...groups];
            }
            return;
        }

        for (let i = start; i <= n - remaining; i++) {
            splits.push(i);
            search(i + 1, remaining - 1);
            splits.pop();
        }
    }

    search(1, k - 1);
    return bestSplit;
}
