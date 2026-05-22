/**
 * ReadingsFormatter — packs readings into a target number of lines,
 * abbreviating book names if needed to stay within character width.
 *
 * Algorithm:
 * 1. If any reading exceeds maxCharsPerLine → abbreviate ALL book names
 * 2. If count ≤ maxLines → done
 * 3. Same-book combine (merge verses for same book)
 * 4. If count ≤ maxLines → check widths, abbreviate all if needed, done
 * 5. Partition into maxLines balanced groups (minimax longest line)
 * 6. If any line exceeds maxCharsPerLine and not yet abbreviated → abbreviate all, redo from step 5
 */

export type Reading = {
    book: string;
    verses: string;
};

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
 * Normalized so that an average lowercase letter ≈ 1.0.
 */
export const PROPORTIONAL: CharWidthFn = (c: string) => {
    // Wide uppercase
    if ('MWm'.includes(c)) return 1.4;
    if ('ABCDGHKNOPQRUVXY'.includes(c)) return 1.2;
    if ('EFLSTZ'.includes(c)) return 1.1;
    if ('Jw'.includes(c)) return 1.3;
    if ('I'.includes(c)) return 0.6;

    // Lowercase
    if ('il'.includes(c)) return 0.45;
    if ('fjrt'.includes(c)) return 0.6;
    if ('abdeghnopqu'.includes(c)) return 1.0;
    if ('cksvxyz'.includes(c)) return 0.9;

    // Digits (tabular in most fonts, slightly narrower than lowercase)
    if (c >= '0' && c <= '9') return 0.7;

    // Punctuation & symbols
    if (c === ' ') return 0.5;
    if (':;,.'.includes(c)) return 0.4;
    if (c === '-' || c === '–') return 0.6;
    if ('()'.includes(c)) return 0.5;

    // Fallback
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
export function formatReadings(readings: Reading[], options: ReadingsLayoutOptions): string[] {
    if (readings.length === 0) return [];

    const cw = options.charWidth ?? MONOSPACE;
    const maxWidth = options.maxLineWidth;
    let abbreviated = false;
    let items = readings;

    // Step 1: Check if any single reading exceeds width at full names
    if (items.some(r => measureWidth(renderReading(r, false), cw) > maxWidth)) {
        abbreviated = true;
    }

    // Step 2: If count ≤ maxLines, done
    if (items.length <= options.maxLines) {
        return items.map(r => renderReading(r, abbreviated));
    }

    // Step 3: Same-book combine
    items = combineByBook(items);

    // Step 4: If count ≤ maxLines, check widths and done
    if (items.length <= options.maxLines) {
        const lines = items.map(r => renderReading(r, abbreviated));
        if (!abbreviated && lines.some(l => measureWidth(l, cw) > maxWidth)) {
            abbreviated = true;
            return items.map(r => renderReading(r, true));
        }
        return lines;
    }

    // Step 5: Partition into maxLines balanced groups
    let partition = balancedPartition(items, options.maxLines, abbreviated, cw);

    // Step 6: Check widths, abbreviate if needed and redo
    if (!abbreviated && partition.some(line => measureWidth(line, cw) > maxWidth)) {
        abbreviated = true;
        partition = balancedPartition(items, options.maxLines, true, cw);
    }

    return partition;
}

/** Combine readings that share the same book, preserving order by first occurrence */
function combineByBook(readings: Reading[]): Reading[] {
    const seen = new Map<string, number>(); // book -> index in result
    const result: Reading[] = [];

    for (const r of readings) {
        const existingIdx = seen.get(r.book);
        if (existingIdx !== undefined) {
            result[existingIdx] = {
                book: r.book,
                verses: result[existingIdx].verses + ', ' + r.verses,
            };
        } else {
            seen.set(r.book, result.length);
            result.push({ ...r });
        }
    }

    return result;
}

/** Render a single reading as a string */
function renderReading(r: Reading, abbreviated: boolean): string {
    const book = abbreviated ? abbreviate(r.book) : r.book;
    return book + ' ' + r.verses;
}

/** Abbreviate a book name */
function abbreviate(book: string): string {
    return ABBREVIATIONS[book] ?? book;
}

/**
 * Find the optimal partition of items into k groups (preserving order)
 * that minimizes the width of the longest line.
 * Groups are joined with "; " when rendered.
 */
function balancedPartition(items: Reading[], k: number, abbreviated: boolean, charWidth: CharWidthFn): string[] {
    const n = items.length;
    if (k >= n) return items.map(r => renderReading(r, abbreviated));

    const sepWidth = measureWidth('; ', charWidth);

    // Precompute the rendered width of combining items[i..j] into one line
    const lineLength = (from: number, to: number): number => {
        let width = 0;
        for (let i = from; i <= to; i++) {
            if (i > from) width += sepWidth;
            width += measureWidth(renderReading(items[i], abbreviated), charWidth);
        }
        return width;
    };

    const renderLine = (from: number, to: number): string => {
        const parts: string[] = [];
        for (let i = from; i <= to; i++) {
            parts.push(renderReading(items[i], abbreviated));
        }
        return parts.join('; ');
    };

    // Brute-force: find all ways to place k-1 dividers among n-1 gaps
    // For n≤5 and k≤4, this is at most C(4,3)=4 combinations
    const bestPartition = findBestSplit(n, k, lineLength);

    // Render the partition
    const result: string[] = [];
    for (let g = 0; g < bestPartition.length; g++) {
        const [from, to] = bestPartition[g];
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

    // Generate all combinations of k-1 split points from positions 1..n-1
    const splits: number[] = [];

    function search(start: number, remaining: number): void {
        if (remaining === 0) {
            // Evaluate this partition
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
