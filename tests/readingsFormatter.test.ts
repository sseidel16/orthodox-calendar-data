import { describe, it, expect } from 'vitest';
import { formatReadings, Reading, PROPORTIONAL, MONOSPACE } from '../src/engine/rules/readingsFormatter.js';

const opts = { maxLines: 3, maxLineWidth: 28 };

describe('formatReadings - no transformation needed', () => {
    it('returns empty array for no readings', () => {
        expect(formatReadings([], opts)).toEqual([]);
    });

    it('returns single reading unchanged when it fits', () => {
        const readings: Reading[] = [{ book: 'Acts', verses: '1:1-8' }];
        expect(formatReadings(readings, opts)).toEqual(['Acts 1:1-8']);
    });

    it('returns multiple readings as-is when under maxLines', () => {
        const readings: Reading[] = [
            { book: 'Romans', verses: '6:3-11' },
            { book: 'Matthew', verses: '28:1-20' },
        ];
        expect(formatReadings(readings, opts)).toEqual([
            'Romans 6:3-11',
            'Matthew 28:1-20',
        ]);
    });
});

describe('formatReadings - abbreviation on width overflow', () => {
    it('abbreviates all books when a single reading exceeds maxLineWidth', () => {
        const readings: Reading[] = [
            { book: '1 Corinthians', verses: '11:23-32' },
            { book: 'Matthew', verses: '26:2-20' },
        ];
        // "1 Corinthians 11:23-32" = 22 chars, fits 28
        // But let's use a tighter limit
        const tightOpts = { maxLines: 3, maxLineWidth: 20 };
        const result = formatReadings(readings, tightOpts);
        expect(result).toEqual([
            '1 Cor. 11:23-32',
            'Mt. 26:2-20',
        ]);
    });

    it('abbreviates all for consistency even if only one overflows', () => {
        const readings: Reading[] = [
            { book: 'Acts', verses: '1:1-8' },
            { book: '2 Thessalonians', verses: '3:6-18' },
        ];
        // "2 Thessalonians 3:6-18" = 23 chars
        const tightOpts = { maxLines: 3, maxLineWidth: 20 };
        const result = formatReadings(readings, tightOpts);
        // Both abbreviated for consistency
        expect(result).toEqual([
            'Acts 1:1-8',
            '2 Th. 3:6-18',
        ]);
    });
});

describe('formatReadings - same-book combine', () => {
    it('combines readings from the same book', () => {
        const readings: Reading[] = [
            { book: 'Matthew', verses: '26:2-20' },
            { book: 'John', verses: '13:3-17' },
            { book: 'Matthew', verses: '26:21-39' },
            { book: 'Matthew', verses: '26:40-27:2' },
        ];
        // 4 readings → maxLines=3. Same-book combine: Mt has 3 → combined to 2 lines.
        const result = formatReadings(readings, { maxLines: 3, maxLineWidth: 45 });
        expect(result).toEqual([
            'Matthew 26:2-20, 26:21-39, 26:40-27:2',
            'John 13:3-17',
        ]);
    });

    it('preserves order by first occurrence after combining', () => {
        const readings: Reading[] = [
            { book: 'Isaiah', verses: '1:1-20' },
            { book: 'Genesis', verses: '1:1-13' },
            { book: 'Proverbs', verses: '1:1-20' },
            { book: 'Isaiah', verses: '2:1-5' },
        ];
        const result = formatReadings(readings, { maxLines: 3, maxLineWidth: 40 });
        expect(result).toEqual([
            'Isaiah 1:1-20, 2:1-5',
            'Genesis 1:1-13',
            'Proverbs 1:1-20',
        ]);
    });
});

describe('formatReadings - balanced partition', () => {
    it('partitions 4 readings into 2 lines balanced by length', () => {
        const readings: Reading[] = [
            { book: 'Acts', verses: '1:1-8' },
            { book: 'Romans', verses: '6:3-11' },
            { book: 'Matthew', verses: '28:1-20' },
            { book: 'John', verses: '1:1-17' },
        ];
        const result = formatReadings(readings, { maxLines: 2, maxLineWidth: 50 });
        // Optimal split balances the two lines
        // Option [Acts+Romans | Mt+John] = "Acts 1:1-8; Romans 6:3-11" (25) vs "Matthew 28:1-20; John 1:1-17" (27)
        // Option [Acts | Romans+Mt+John] = 9 vs 42
        // Option [Acts+Romans+Mt | John] = 40 vs 12
        // Best is first option (max=27)
        expect(result).toEqual([
            'Acts 1:1-8; Romans 6:3-11',
            'Matthew 28:1-20; John 1:1-17',
        ]);
    });

    it('handles 5 readings into 3 lines', () => {
        const readings: Reading[] = [
            { book: 'Isaiah', verses: '1:1-20' },
            { book: 'Genesis', verses: '1:1-13' },
            { book: 'Proverbs', verses: '1:1-20' },
            { book: 'Hebrews', verses: '12:1-10' },
            { book: 'Matthew', verses: '20:1-16' },
        ];
        const result = formatReadings(readings, { maxLines: 3, maxLineWidth: 50 });
        // 5 items into 3 groups, should find balanced partition
        expect(result.length).toBe(3);
        // Each line should be a joined string
        expect(result.every(line => line.length > 0)).toBe(true);
    });
});

describe('formatReadings - abbreviation triggered by partition overflow', () => {
    it('abbreviates after partition if a combined line is too long', () => {
        const readings: Reading[] = [
            { book: '1 Corinthians', verses: '11:23-32' },
            { book: 'Matthew', verses: '26:2-20' },
            { book: 'John', verses: '13:3-17' },
            { book: 'Luke', verses: '22:43-44' },
            { book: 'Matthew', verses: '26:40-27:2' },
        ];
        // maxLines=2, tight width
        const result = formatReadings(readings, { maxLines: 2, maxLineWidth: 30 });
        // Should abbreviate since combining will exceed 30 chars
        expect(result.length).toBe(2);
        // All books should be abbreviated
        expect(result.join(' ')).not.toContain('Corinthians');
        expect(result.join(' ')).toContain('1 Cor.');
        expect(result.join(' ')).toContain('Mt.');
    });
});

describe('formatReadings - combined flow', () => {
    it('Holy Thursday: same-book combine + partition + abbreviation', () => {
        const readings: Reading[] = [
            { book: '1 Corinthians', verses: '11:23-32' },
            { book: 'Matthew', verses: '26:2-20' },
            { book: 'John', verses: '13:3-17' },
            { book: 'Matthew', verses: '26:21-39' },
            { book: 'Luke', verses: '22:43-44' },
            { book: 'Matthew', verses: '26:40-27:2' },
        ];
        const result = formatReadings(readings, { maxLines: 3, maxLineWidth: 35 });
        // Same-book combine: Mt merges → 4 items
        // Then partition into 3 lines
        expect(result.length).toBe(3);
        // Matthew verses should be combined
        const mtLine = result.find(l => l.includes('26:2-20'));
        expect(mtLine).toContain('26:21-39');
        expect(mtLine).toContain('26:40-27:2');
    });
});

describe('formatReadings - proportional width', () => {
    it('abbreviates sooner with proportional widths for wide characters', () => {
        const readings: Reading[] = [
            { book: 'Matthew', verses: '28:1-20' },
            { book: 'Mark', verses: '16:1-8' },
        ];
        // "Matthew 28:1-20" in monospace = 15 chars
        // In proportional: M(1.4)+a(1)+t(0.6)+t(0.6)+h(1)+e(1)+w(1.3)+space(0.5)+2(0.7)+8(0.7)+:(0.4)+1(0.7)+-(0.6)+2(0.7)+0(0.7) ≈ 11.6
        // With monospace width 15, doesn't abbreviate. With proportional at tight width, may abbreviate.
        const mono = formatReadings(readings, { maxLines: 2, maxLineWidth: 15, charWidth: MONOSPACE });
        const prop = formatReadings(readings, { maxLines: 2, maxLineWidth: 11, charWidth: PROPORTIONAL });

        // Monospace at 15 fits fine
        expect(mono).toEqual(['Matthew 28:1-20', 'Mark 16:1-8']);
        // Proportional at 11 triggers abbreviation since "Matthew 28:1-20" is ~11.9 wide
        expect(prop).toEqual(['Mt. 28:1-20', 'Mk. 16:1-8']);
    });

    it('defaults to monospace when charWidth not provided', () => {
        const readings: Reading[] = [{ book: 'Romans', verses: '6:3-11' }];
        const result = formatReadings(readings, { maxLines: 3, maxLineWidth: 50 });
        expect(result).toEqual(['Romans 6:3-11']);
    });
});
