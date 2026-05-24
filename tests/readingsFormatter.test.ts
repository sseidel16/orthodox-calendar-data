import { describe, it, expect } from 'vitest';
import { formatReadings, PROPORTIONAL, MONOSPACE } from '../src/engine/rules/readingsFormatter.js';

const opts = { maxLines: 3, maxLineWidth: 28 };

describe('formatReadings - no transformation needed', () => {
    it('returns empty array for no readings', () => {
        expect(formatReadings([], opts)).toEqual([]);
    });

    it('returns single reading unchanged when it fits', () => {
        expect(formatReadings(['Acts 1:1-8'], opts)).toEqual(['Acts 1:1-8']);
    });

    it('returns multiple readings as-is when under maxLines', () => {
        expect(formatReadings(['Romans 6:3-11', 'Matthew 28:1-20'], opts)).toEqual([
            'Romans 6:3-11',
            'Matthew 28:1-20',
        ]);
    });
});

describe('formatReadings - abbreviation on width overflow', () => {
    it('abbreviates all books when a single reading exceeds maxLineWidth', () => {
        const readings = ['1 Corinthians 11:23-32', 'Matthew 26:2-20'];
        const tightOpts = { maxLines: 3, maxLineWidth: 20 };
        const result = formatReadings(readings, tightOpts);
        expect(result).toEqual([
            '1 Cor. 11:23-32',
            'Mt. 26:2-20',
        ]);
    });

    it('abbreviates all for consistency even if only one overflows', () => {
        const readings = ['Acts 1:1-8', '2 Thessalonians 3:6-18'];
        const tightOpts = { maxLines: 3, maxLineWidth: 20 };
        const result = formatReadings(readings, tightOpts);
        expect(result).toEqual([
            'Acts 1:1-8',
            '2 Th. 3:6-18',
        ]);
    });
});

describe('formatReadings - multi-part readings with semicolons', () => {
    it('abbreviates each part within a semicolon-separated reading', () => {
        const readings = ['Matthew 26:2-20; John 13:3-17; Matthew 26:21-39'];
        const tightOpts = { maxLines: 3, maxLineWidth: 30 };
        const result = formatReadings(readings, tightOpts);
        expect(result).toEqual(['Mt. 26:2-20; Jn. 13:3-17; Mt. 26:21-39']);
    });

    it('does not combine same books across semicolons (order preserved)', () => {
        const readings = ['Matthew 26:2-20; John 13:3-17; Matthew 26:21-39'];
        const result = formatReadings(readings, { maxLines: 3, maxLineWidth: 60 });
        // No combining — the full string is returned as-is since it fits
        expect(result).toEqual(['Matthew 26:2-20; John 13:3-17; Matthew 26:21-39']);
    });
});

describe('formatReadings - balanced partition', () => {
    it('partitions 4 readings into 2 lines balanced by length', () => {
        const readings = ['Acts 1:1-8', 'Romans 6:3-11', 'Matthew 28:1-20', 'John 1:1-17'];
        const result = formatReadings(readings, { maxLines: 2, maxLineWidth: 50 });
        expect(result).toEqual([
            'Acts 1:1-8; Romans 6:3-11',
            'Matthew 28:1-20; John 1:1-17',
        ]);
    });

    it('handles 5 readings into 3 lines', () => {
        const readings = ['Isaiah 1:1-20', 'Genesis 1:1-13', 'Proverbs 1:1-20', 'Hebrews 12:1-10', 'Matthew 20:1-16'];
        const result = formatReadings(readings, { maxLines: 3, maxLineWidth: 50 });
        expect(result.length).toBe(3);
        expect(result.every(line => line.length > 0)).toBe(true);
    });
});

describe('formatReadings - abbreviation triggered by partition overflow', () => {
    it('abbreviates after partition if a combined line is too long', () => {
        const readings = ['1 Corinthians 11:23-32', 'Matthew 26:2-20', 'John 13:3-17', 'Luke 22:43-44', 'Matthew 26:40-27:2'];
        const result = formatReadings(readings, { maxLines: 2, maxLineWidth: 30 });
        expect(result.length).toBe(2);
        expect(result.join(' ')).not.toContain('Corinthians');
        expect(result.join(' ')).toContain('1 Cor.');
        expect(result.join(' ')).toContain('Mt.');
    });
});

describe('formatReadings - combined flow', () => {
    it('Holy Thursday: partition + abbreviation (no same-book combine)', () => {
        const readings = [
            '1 Corinthians 11:23-32',
            'Matthew 26:2-20; John 13:3-17; Matthew 26:21-39; Luke 22:43-44; Matthew 26:40-27:2',
        ];
        const result = formatReadings(readings, { maxLines: 2, maxLineWidth: 50 });
        expect(result.length).toBe(2);
        // The multi-part reading keeps its internal order (may be abbreviated)
        expect(result[1]).toMatch(/Jn\.|John/);
    });
});

describe('formatReadings - proportional width', () => {
    it('abbreviates sooner with proportional widths for wide characters', () => {
        const readings = ['Matthew 28:1-20', 'Mark 16:1-8'];
        const mono = formatReadings(readings, { maxLines: 2, maxLineWidth: 15, charWidth: MONOSPACE });
        const prop = formatReadings(readings, { maxLines: 2, maxLineWidth: 11, charWidth: PROPORTIONAL });

        expect(mono).toEqual(['Matthew 28:1-20', 'Mark 16:1-8']);
        expect(prop).toEqual(['Mt. 28:1-20', 'Mk. 16:1-8']);
    });

    it('defaults to monospace when charWidth not provided', () => {
        const result = formatReadings(['Romans 6:3-11'], { maxLines: 3, maxLineWidth: 50 });
        expect(result).toEqual(['Romans 6:3-11']);
    });
});
