import { describe, it, expect } from 'vitest';
import { getMonthGrid } from '../src/api/month.js';

describe('Month grid generation - structure', () => {
    it('returns a 5x7 grid', () => {
        const result = getMonthGrid(0, 2026); // January 2026
        expect(result.grid.length).toBe(5);
        for (const row of result.grid) {
            expect(row.length).toBe(7);
        }
    });

    it('has correct month name', () => {
        const result = getMonthGrid(0, 2026);
        expect(result.name).toEqual(['January', 'Ἰανουάριος']);
    });

    it('first date is aligned to correct day of week', () => {
        // Jan 1, 2026 is a Thursday (dow=4)
        const result = getMonthGrid(0, 2026);
        // First 4 cells should be EMPTY or NOTE
        for (let i = 0; i < 4; i++) {
            expect(['EMPTY', 'NOTE']).toContain(result.grid[0][i].type);
        }
        // Cell at position 4 should be DATE with newDate=1
        expect(result.grid[0][4].type).toBe('DATE');
        if (result.grid[0][4].type === 'DATE') {
            expect(result.grid[0][4].newDate).toBe(1);
        }
    });

    it('all cells have valid types', () => {
        const result = getMonthGrid(5, 2026); // June 2026
        for (const row of result.grid) {
            for (const cell of row) {
                expect(['EMPTY', 'NOTE', 'SPLIT', 'DATE']).toContain(cell.type);
            }
        }
    });

    it('dates are sequential', () => {
        const result = getMonthGrid(0, 2026); // January
        const dates: number[] = [];
        for (const row of result.grid) {
            for (const cell of row) {
                if (cell.type === 'DATE') {
                    dates.push(cell.newDate);
                } else if (cell.type === 'SPLIT') {
                    dates.push(cell.top.newDate);
                    dates.push(cell.bottom.newDate);
                }
            }
        }
        // Should have 31 dates for January
        expect(dates.length).toBe(31);
        for (let i = 0; i < dates.length; i++) {
            expect(dates[i]).toBe(i + 1);
        }
    });
});

describe('Month grid generation - SplitBox', () => {
    it('creates 1 SplitBox when overflow is 1 (May 2026, starts Friday)', () => {
        // May 2026 starts Friday (dow=5), 31 days: 5+31=36, overflow=1
        const result = getMonthGrid(4, 2026);
        const splits = result.grid.flat().filter(c => c.type === 'SPLIT');
        expect(splits.length).toBe(1);
        if (splits[0].type === 'SPLIT') {
            expect(splits[0].top.newDate).toBe(30);
            expect(splits[0].bottom.newDate).toBe(31);
        }
    });

    it('creates 2 SplitBoxes when overflow is 2 (August 2026, starts Saturday)', () => {
        // August 2026 starts Saturday (dow=6), 31 days: 6+31=37, overflow=2
        const result = getMonthGrid(7, 2026);
        const splits = result.grid.flat().filter(c => c.type === 'SPLIT');
        expect(splits.length).toBe(2);
        if (splits[0].type === 'SPLIT' && splits[1].type === 'SPLIT') {
            expect(splits[0].top.newDate).toBe(28);
            expect(splits[0].bottom.newDate).toBe(29);
            expect(splits[1].top.newDate).toBe(30);
            expect(splits[1].bottom.newDate).toBe(31);
        }
    });

    it('does not create SplitBox when month fits in 5 rows', () => {
        // February 2026 starts Sunday with 28 days: 0+28=28, fits easily
        const result = getMonthGrid(1, 2026);
        for (const row of result.grid) {
            for (const cell of row) {
                expect(cell.type).not.toBe('SPLIT');
            }
        }
    });

    it('January 2026 fits exactly (Thursday start, 31 days, no split)', () => {
        // 4+31=35, fits exactly
        const result = getMonthGrid(0, 2026);
        const splits = result.grid.flat().filter(c => c.type === 'SPLIT');
        expect(splits.length).toBe(0);
    });
});
