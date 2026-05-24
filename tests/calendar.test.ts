import { describe, it, expect } from 'vitest';
import { generateCalendarYear, generateCalendarDate, generateCalendarRange } from '../src/api/calendar.js';
import { generateDataRange, generateData } from '../src/engine/dataEngine.js';
import { GREGORIAN, JULIAN } from '../src/engine/calendarSystem.js';
import { getPaschaForYear } from '../src/engine/yearContext.js';

// ============================================================
// Moon phases (UI layer — physical, calendar-independent)
// ============================================================

describe('Moon phases', () => {
    it('Jan 3 2026 is Full Moon', () => {
        const result = generateCalendarDate(2026, 1, 3);
        expect(result.moon).toBe('FULL');
    });

    it('Jan 18 2026 is New Moon', () => {
        const result = generateCalendarDate(2026, 1, 18);
        expect(result.moon).toBe('NEW');
    });

    it('most days have no moon phase', () => {
        const result = generateCalendarDate(2026, 1, 15);
        expect(result.moon).toBe('NONE');
    });

    it('approximately 4 phases per month', () => {
        const jan = generateCalendarRange(
            { year: 2026, month: 1, day: 1 },
            { year: 2026, month: 1, day: 31 },
        );
        const phases = jan.filter(r => r.moon !== 'NONE').length;
        expect(phases).toBeGreaterThanOrEqual(3);
        expect(phases).toBeLessThanOrEqual(5);
    });
});

// ============================================================
// Calendar year structure
// ============================================================

describe('Calendar year structure', () => {
    it('generates 12 months', () => {
        const cal = generateCalendarYear(2026);
        expect(cal.months.length).toBe(12);
    });

    it('each month has a 5x7 grid', () => {
        const cal = generateCalendarYear(2026);
        for (const month of cal.months) {
            expect(month.grid.length).toBe(5);
            for (const row of month.grid) {
                expect(row.length).toBe(7);
            }
        }
    });

    it('Jan 2026 has 31 date boxes', () => {
        const cal = generateCalendarYear(2026);
        const dates = cal.months[0].grid.flat().filter(c => c.type === 'DATE');
        expect(dates.length).toBe(31);
    });

    it('note indicators are consistent across months', () => {
        const cal = generateCalendarYear(2026);
        // The "no fasting" note uses * in Jan and should use * in Dec too
        const janNotes = cal.months[0].grid.flat().filter(c => c.type === 'NOTE');
        const decNotes = cal.months[11].grid.flat().filter(c => c.type === 'NOTE');
        if (janNotes.length > 0 && decNotes.length > 0) {
            expect(janNotes[0].note).toBe(decNotes[0].note);
        }
    });
});

// ============================================================
// Composite data (primary + secondary)
// ============================================================

describe('Calendar date composite', () => {
    it('returns both primary and secondary data', () => {
        const result = generateCalendarDate(2026, 1, 1);
        expect(result.primaryData).toBeDefined();
        expect(result.secondaryData).toBeDefined();
        expect(result.primaryData.date).toBe(1);    // new Jan 1
        expect(result.secondaryData.date).toBe(19); // old Dec 19
    });

    it('secondary calendar has correct feast on old Nativity', () => {
        // Physical Jan 7 = old Dec 25
        const result = generateCalendarDate(2026, 1, 7);
        expect(result.secondaryData.feast?.[0]).toContain('Nativity');
    });

    it('Jan 4 old calendar has Sunday before Nativity feast', () => {
        const result = generateCalendarDate(2026, 1, 4);
        expect(result.secondaryData.feast?.[0]).toBe('Sunday before Nativity');
    });

    it('Feb 1 2026 — both calendars show Sunday feast, not Soul Saturday', () => {
        const result = generateCalendarDate(2026, 2, 1);
        expect(result.primaryData.feast?.[0]).toContain('Publican & Pharisee');
        expect(result.secondaryData.feast?.[0]).toContain('Publican & Pharisee');
        expect(result.secondaryData.note).toBeUndefined(); // no "Soul Saturday" on a Sunday
    });

    it('primary and secondary tones agree on same physical Sunday', () => {
        // Apr 26 new = Apr 13 old = PASCHA+14 for both (same Pascha)
        const result = generateCalendarDate(2026, 4, 26);
        expect(result.primaryData.tone).toBe('2nd Tone');
        expect(result.secondaryData.tone).toBe('2nd Tone');
    });
});

// ============================================================
// Pascha alignment — both calendars always land on same physical Sunday
// ============================================================

describe('Pascha alignment', () => {
    it('Gregorian and Julian Pascha resolve to same physical day for 2024-2030', () => {
        for (let year = 2024; year <= 2030; year++) {
            const gp = getPaschaForYear(year, GREGORIAN);
            const jp = getPaschaForYear(year, JULIAN);
            expect(gp.equals(jp)).toBe(true);
            expect(gp.dayOfWeek()).toBe(0); // always Sunday
        }
    });
});

// ============================================================
// Data range validation
// ============================================================

describe('generateDataRange', () => {
    it('throws if range spans more than 5 years', () => {
        expect(() => generateDataRange(
            { year: 2020, month: 1, day: 1 },
            { year: 2026, month: 1, day: 1 },
            GREGORIAN,
        )).toThrow('5 years');
    });

    it('returns correct count for a full year', () => {
        const data = generateDataRange(
            { year: 2026, month: 1, day: 1 },
            { year: 2026, month: 12, day: 31 },
            GREGORIAN,
        );
        expect(data.length).toBe(365);
    });

    it('handles cross-year range for Julian calendar', () => {
        // Old Dec 19, 2025 to old Jan 5, 2026 = 18 days
        const data = generateDataRange(
            { year: 2025, month: 12, day: 19 },
            { year: 2026, month: 1, day: 5 },
            JULIAN,
        );
        expect(data.length).toBe(18);
        expect(data[0].date).toBe(19); // first day = Dec 19
        expect(data[17].date).toBe(5);  // last day = Jan 5
    });
});
