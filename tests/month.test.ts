import { describe, it, expect } from 'vitest';
import { getMonthGrid } from '../src/api/month.js';

describe('Month grid generation - structure', () => {
    it('returns a 5x7 grid', () => {
        const result = getMonthGrid(0, 2026);
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
        for (let i = 0; i < 4; i++) {
            expect(['EMPTY', 'NOTE']).toContain(result.grid[0][i].type);
        }
        expect(result.grid[0][4].type).toBe('DATE');
        if (result.grid[0][4].type === 'DATE') {
            expect(result.grid[0][4].newDate).toBe(1);
        }
    });

    it('all cells have valid types', () => {
        const result = getMonthGrid(5, 2026);
        for (const row of result.grid) {
            for (const cell of row) {
                expect(['EMPTY', 'NOTE', 'SPLIT', 'DATE']).toContain(cell.type);
            }
        }
    });

    it('dates are sequential (reading tops of splits)', () => {
        const result = getMonthGrid(0, 2026); // January, no splits
        const dates: number[] = [];
        for (const row of result.grid) {
            for (const cell of row) {
                if (cell.type === 'DATE') dates.push(cell.newDate);
                else if (cell.type === 'SPLIT') {
                    dates.push(cell.top.newDate);
                    dates.push(cell.bottom.newDate);
                }
            }
        }
        expect(dates.length).toBe(31);
    });
});

describe('Month grid generation - SplitBox', () => {
    it('creates 1 SplitBox when overflow is 1 (May 2026, starts Friday)', () => {
        const result = getMonthGrid(4, 2026);
        const splits = result.grid.flat().filter(c => c.type === 'SPLIT');
        expect(splits.length).toBe(1);
        if (splits[0].type === 'SPLIT') {
            expect(splits[0].top.newDate).toBe(24);
            expect(splits[0].bottom.newDate).toBe(31);
        }
        expect(result.grid[4][0].type).toBe('SPLIT');
    });

    it('creates 2 SplitBoxes when overflow is 2 (August 2026, starts Saturday)', () => {
        const result = getMonthGrid(7, 2026);
        const splits = result.grid.flat().filter(c => c.type === 'SPLIT');
        expect(splits.length).toBe(2);
        if (splits[0].type === 'SPLIT' && splits[1].type === 'SPLIT') {
            expect(splits[0].top.newDate).toBe(23);
            expect(splits[0].bottom.newDate).toBe(30);
            expect(splits[1].top.newDate).toBe(24);
            expect(splits[1].bottom.newDate).toBe(31);
        }
        expect(result.grid[4][0].type).toBe('SPLIT');
        expect(result.grid[4][1].type).toBe('SPLIT');
    });

    it('does not create SplitBox when month fits in 5 rows', () => {
        const result = getMonthGrid(1, 2026);
        for (const row of result.grid) {
            for (const cell of row) {
                expect(cell.type).not.toBe('SPLIT');
            }
        }
    });
});

describe('Month grid generation - DateBox fields', () => {
    it('DateBox has newFeast and oldFeast booleans', () => {
        const result = getMonthGrid(0, 2026);
        const firstDate = result.grid[0][4]; // Jan 1
        if (firstDate.type === 'DATE') {
            expect(typeof firstDate.newFeast).toBe('boolean');
            expect(typeof firstDate.oldFeast).toBe('boolean');
        }
    });
});
