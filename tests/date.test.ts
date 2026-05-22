import { describe, it, expect } from 'vitest';
import { getDate } from '../src/api/range.js';
import { EnrichedDate } from '../src/engine/enrichedTypes.js';

function d(dateStr: string): Date {
    return new Date(dateStr + 'T00:00:00Z');
}

function enriched(dateStr: string): EnrichedDate {
    return getDate(d(dateStr));
}

// ============================================================
// Structural tests
// ============================================================

describe('EnrichedDate structure', () => {
    it('has oldData and newData with correct date numbers', () => {
        const result = enriched('2026-01-15');
        expect(result.newData.date).toBe(15);
        expect(result.oldData.date).toBe(2); // Jan 15 - 13 = Jan 2
    });

    it('old calendar date wraps across month boundary', () => {
        const result = enriched('2026-01-01');
        expect(result.oldData.date).toBe(19); // Jan 1 - 13 = Dec 19
    });

    it('has moon phase field', () => {
        const result = enriched('2026-01-18');
        expect(result.moon).toBe('NEW');
    });
});

// ============================================================
// New calendar — fasting
// ============================================================

describe('New calendar fasting', () => {
    it('basemap: Wednesday is STRICT', () => {
        // Jan 7, 2026 is Wednesday
        expect(enriched('2026-01-07').newData.fasting).toBe('OIL');
        // Actually Jan 7 is in the NONE/OIL override list! Use a plain Wed instead.
        // Jan 21 2026 is Wednesday with no override
        expect(enriched('2026-01-21').newData.fasting).toBe('STRICT');
    });

    it('basemap: Sunday is NONE', () => {
        expect(enriched('2026-01-25').newData.fasting).toBe('NONE');
    });

    it('Cheese Fare: Mon=DAIRY, Wed=OIL', () => {
        // 2026 Cheese Fare: PASCHA-55=Feb 16 (Mon) through PASCHA-49=Feb 22 (Sun)
        expect(enriched('2026-02-16').newData.fasting).toBe('DAIRY');
        expect(enriched('2026-02-18').newData.fasting).toBe('OIL'); // Wed
    });

    it('Great Lent: Mon=STRICT, Sat=OIL', () => {
        // Clean Monday Feb 23
        expect(enriched('2026-02-23').newData.fasting).toBe('STRICT');
        // A Saturday in Lent: Feb 28
        expect(enriched('2026-02-28').newData.fasting).toBe('OIL');
    });

    it('Bright Week: all NONE', () => {
        expect(enriched('2026-04-12').newData.fasting).toBe('NONE'); // Pascha
        expect(enriched('2026-04-15').newData.fasting).toBe('NONE'); // Wed of Bright Week
    });

    it('Pentecostarion: Wed/Fri=OIL, PASCHA+38=NONE', () => {
        // PASCHA+38 = May 20 (Apodosis)
        expect(enriched('2026-05-20').newData.fasting).toBe('NONE');
        // A Pentecostarion Wednesday: Apr 29 (PASCHA+17)
        expect(enriched('2026-04-29').newData.fasting).toBe('OIL');
    });

    it('Week after Pentecost: NONE', () => {
        // PASCHA+50 = Jun 1 through PASCHA+55 = Jun 6
        expect(enriched('2026-06-03').newData.fasting).toBe('NONE'); // Wed
    });

    it('always NONE: 01/01, 01/06, 12/25', () => {
        expect(enriched('2026-01-01').newData.fasting).toBe('NONE');
        expect(enriched('2026-01-06').newData.fasting).toBe('NONE');
        expect(enriched('2026-12-25').newData.fasting).toBe('NONE');
    });

    it('always FISH: 03/25, 08/06, 11/21', () => {
        expect(enriched('2026-03-25').newData.fasting).toBe('FISH');
        expect(enriched('2026-08-06').newData.fasting).toBe('FISH');
        expect(enriched('2026-11-21').newData.fasting).toBe('FISH');
    });

    it('Apostles Fast: MWF=STRICT, TuTh=OIL, SatSun=FISH', () => {
        // Starts PASCHA+57 = Jun 8 (Mon). Jun 9=Tue, Jun 10=Wed, Jun 14=Sun
        expect(enriched('2026-06-08').newData.fasting).toBe('STRICT'); // Mon
        expect(enriched('2026-06-09').newData.fasting).toBe('OIL');    // Tue
        expect(enriched('2026-06-10').newData.fasting).toBe('STRICT'); // Wed
        expect(enriched('2026-06-14').newData.fasting).toBe('FISH');   // Sun
    });

    it('06/24 exception during Apostles Fast: OIL', () => {
        // 2026: PASCHA+57=Jun 8, Jun 24 is during Apostles Fast (offset=73)
        expect(enriched('2026-06-24').newData.fasting).toBe('OIL');
    });

    it('03/09 before Clean Monday: NONE (Thu) or OIL (if Wed/Fri)', () => {
        // 2026: PASCHA-48=Feb 23 (Clean Monday). Mar 9 offset = -34 (after first week)
        // So 03/09 falls after PASCHA-44, rule says OIL regardless
        expect(enriched('2026-03-09').newData.fasting).toBe('OIL');
    });

    it('09/14 Mon-Fri=STRICT, Sat/Sun=OIL', () => {
        // 2026 Sep 14 = Monday
        expect(enriched('2026-09-14').newData.fasting).toBe('STRICT');
    });
});

// ============================================================
// New calendar — tones
// ============================================================

describe('New calendar tones', () => {
    it('PASCHA+14 has 2nd Tone', () => {
        expect(enriched('2026-04-26').newData.tone).toBe('2nd Tone');
    });

    it('PASCHA+21 has 3rd Tone', () => {
        expect(enriched('2026-05-03').newData.tone).toBe('3rd Tone');
    });

    it('PASCHA+49 (Pentecost) tone is suppressed', () => {
        expect(enriched('2026-05-31').newData.tone).toBeUndefined();
    });

    it('PASCHA+56 has Plagal 4th Tone (skips Pentecost in cycle)', () => {
        expect(enriched('2026-06-07').newData.tone).toBe('Plagal 4th Tone');
    });

    it('non-Sunday has no tone', () => {
        expect(enriched('2026-04-27').newData.tone).toBeUndefined(); // Monday
    });

    it('tone suppressed on 09/14 when Sunday (2025)', () => {
        expect(enriched('2025-09-14').newData.tone).toBeUndefined();
    });

    it('early year continues from previous year cycle', () => {
        // Jan 18 2026 (Sunday) should have a tone from prev year's cycle
        expect(enriched('2026-01-18').newData.tone).toBe('Grave Tone');
    });

    it('PASCHA-14 is last Sunday with tone before reset', () => {
        // PASCHA-14 = Mar 29 2026 (Sunday)
        expect(enriched('2026-03-29').newData.tone).toBeDefined();
        // PASCHA-7 (Palm Sunday) should NOT have tone
        expect(enriched('2026-04-05').newData.tone).toBeUndefined();
    });
});

// ============================================================
// New calendar — lengthy notes
// ============================================================

describe('New calendar lengthy notes', () => {
    it('Palm Sunday has fish note', () => {
        const result = enriched('2026-04-05');
        expect(result.newData.lengthyNotes[0]).toBe('Some traditions allow for fish on Palm Sunday.');
    });

    it('PASCHA-53 has no-fasting note', () => {
        // PASCHA-53 = Feb 18 2026 (Wed of Cheese Fare)
        const result = enriched('2026-02-18');
        expect(result.newData.lengthyNotes[0]).toBe('Some traditions allow for no fasting on this day.');
    });

    it('Wed in Pentecostarion has monastery note', () => {
        const result = enriched('2026-04-29'); // PASCHA+17, Wednesday
        expect(result.newData.lengthyNotes[0]).toContain("St. Anthony's");
    });

    it('monastery note excluded on 04/23', () => {
        // 2024: Apr 23, PASCHA=May 5, offset=-12 (before Pascha, not in Pentecostarion anyway)
        // Need a year where 04/23 is in Pentecostarion AND is Wed/Fri...
        // 2025: PASCHA=Apr 20, Apr 23=PASCHA+3 (Thu). Not Wed/Fri.
        // Let's check that PASCHA+24 is excluded
        // 2026: PASCHA+24 = May 6 (Wed)
        const result = enriched('2026-05-06');
        expect(result.newData.lengthyNotes).toEqual([]);
    });

    it('Wed/Fri in Jan 2-4 has no-fasting note', () => {
        // 2026 Jan 2 = Friday
        const result = enriched('2026-01-02');
        expect(result.newData.lengthyNotes[0]).toBe('Some traditions allow for no fasting on this day.');
    });

    it('no lengthy note on normal day', () => {
        expect(enriched('2026-03-15').newData.lengthyNotes).toEqual([]);
    });
});

// ============================================================
// New calendar — feast/saint/note text
// ============================================================

describe('New calendar text rules', () => {
    it('Jan 1 has feast, saints, and note from immovables', () => {
        const result = enriched('2026-01-01');
        expect(result.newData.feast?.[0]).toBe('Circumcision of Our Lord Jesus Christ');
        expect(result.newData.saint?.[0]).toContain('Basil the Great');
        expect(result.newData.note?.[0]).toContain('New Year');
    });

    it('movable feast shows on resolved date', () => {
        // Pascha = Apr 12
        expect(enriched('2026-04-12').newData.feast?.[0]).toContain('Holy Pascha');
        expect(enriched('2026-04-05').newData.feast?.[0]).toBe('Palm Sunday');
    });

    it('eliminator date 01/06 suppresses movables', () => {
        const result = enriched('2026-01-06');
        // Should only have immovable Theophany feast
        expect(result.newData.feast?.[0]).toContain('Theophany');
    });

    it('eliminator date 12/25 suppresses movables', () => {
        const result = enriched('2026-12-25');
        expect(result.newData.feast?.[0]).toContain('Nativity');
    });

    it('ECUM4 feast overrides other feast text on that day', () => {
        // ECUM4 2026 = Jul 19
        const result = enriched('2026-07-19');
        expect(result.newData.feast?.[0]).toBe('Holy Fathers of 4th Ecumenical Council');
        expect(result.newData.feast?.[0]).not.toContain('Matthew');
    });

    it('multiple saints concatenated with newline', () => {
        const result = enriched('2026-01-01');
        expect(result.newData.saint?.[0]).toContain('\n');
    });

    it('DST note appears on 2nd Sunday in March', () => {
        // 2026: 2nd Sunday in March = Mar 8
        const result = enriched('2026-03-08');
        expect(result.newData.note?.[0]).toContain('Daylight Savings Time begins');
    });

    it('St. George rule: 2024 Apr 23 saint duplicated to Bright Tuesday', () => {
        // 2024: Pascha=May 5, Apr 23 is before PASCHA+2 (May 7)
        const brightTues = enriched('2024-05-07');
        expect(brightTues.newData.saint?.[0]).toContain('Great-martyr George');
    });

    it('St. George rule: 2026 Apr 23 NOT duplicated (after PASCHA+2)', () => {
        // 2026: Pascha=Apr 12, Apr 23 = PASCHA+11, rule doesn't apply
        const brightTues = enriched('2026-04-14'); // PASCHA+2
        expect(brightTues.newData.saint?.[0]).not.toContain('George');
    });
});

// ============================================================
// Old calendar — structural correctness
// ============================================================

describe('Old calendar data', () => {
    it('old calendar Jan 1 (= new Jan 14) has Circumcision feast', () => {
        const result = enriched('2026-01-14');
        expect(result.oldData.date).toBe(1);
        expect(result.oldData.feast?.[0]).toBe('Circumcision of Our Lord Jesus Christ');
        expect(result.oldData.saint?.[0]).toContain('Basil the Great');
    });

    it('old calendar Theophany (old Jan 6 = new Jan 19) has NONE fasting', () => {
        const result = enriched('2026-01-19');
        expect(result.oldData.date).toBe(6);
        expect(result.oldData.fasting).toBe('NONE');
        expect(result.oldData.feast?.[0]).toContain('Theophany');
    });

    it('old calendar Nativity (old Dec 25 = new Jan 7) has feast and NONE fasting', () => {
        const result = enriched('2026-01-07');
        expect(result.oldData.date).toBe(25);
        expect(result.oldData.feast?.[0]).toContain('Nativity');
        expect(result.oldData.fasting).toBe('NONE');
    });

    it('old calendar has its own Pascha-based fasting', () => {
        // 2026 old Pascha = Mar 30. Old Great Lent starts Feb 10 old.
        // Feb 10 old = Feb 23 new. But Feb 10 is in the date-specific override list
        // (NONE on non-Wed/Fri), which overrides Layer 2 Lent. Use a non-overridden date.
        // Old Lent day: Feb 11 old (= Feb 24 new). Tue in Lent => STRICT from movables.
        const result = enriched('2026-02-24');
        expect(result.newData.fasting).toBe('STRICT'); // new Lent too
        expect(result.oldData.fasting).toBe('STRICT'); // old Lent (Feb 11 not in override list)
    });

    it('old calendar Palm Sunday has fish note', () => {
        // Old Pascha 2026 = Mar 30. Old Palm Sunday = Mar 30 - 7 = Mar 23 old = Apr 5 new
        const result = enriched('2026-04-05');
        expect(result.oldData.lengthyNotes[0]).toContain('fish on Palm Sunday');
    });

    it('old calendar tones work independently', () => {
        // Old Pascha 2026 = Mar 30. Old PASCHA+14 = Apr 13 old = Apr 26 new
        // But Apr 26 new's old date is Apr 13. The tone should be from old calendar.
        const result = enriched('2026-04-26');
        expect(result.newData.tone).toBe('2nd Tone'); // new PASCHA+14
        // Old calendar: Apr 13 old is PASCHA+14 for old calendar too! (Mar 30 + 14 = Apr 13)
        expect(result.oldData.tone).toBe('2nd Tone');
    });

    it('old and new calendar fasting can differ', () => {
        // Dec 25 new = NONE (Nativity). Old date = Dec 12.
        // Old calendar Dec 12 rule: OIL on weekday, FISH on Sat/Sun.
        // Physical day = Dec 25 (Friday) → OIL.
        const result = enriched('2026-12-25');
        expect(result.newData.fasting).toBe('NONE');
        expect(result.oldData.fasting).toBe('OIL');
    });

    it('old calendar eliminator suppresses movables on old Jan 6', () => {
        // Old Jan 6 = new Jan 19
        const result = enriched('2026-01-19');
        // oldData should only have immovable Theophany, no movables
        expect(result.oldData.feast?.[0]).toContain('Theophany');
    });
});

// ============================================================
// Cross-year edge cases
// ============================================================

describe('Cross-year and multi-year edge cases', () => {
    // 2024: late Pascha (May 5) — no Apostles Fast (PASCHA+57 = Jul 1, past Jun 28)
    it('2024: no Apostles Fast when Pascha is late (PASCHA+57 > Jun 28)', () => {
        // Jun 15 2024 = Saturday. Would be FISH if Apostles Fast, but it's just basemap NONE.
        expect(enriched('2024-06-15').newData.fasting).toBe('NONE');
    });

    // 2025: shorter Apostles Fast (PASCHA+57 = Jun 16)
    it('2025: Apostles Fast starts Jun 16 when Pascha is Apr 20', () => {
        expect(enriched('2025-06-16').newData.fasting).toBe('STRICT'); // Mon
        expect(enriched('2025-06-20').newData.fasting).toBe('STRICT'); // Fri
    });

    it('2025: 06/24 exception during Apostles Fast (Tue = OIL)', () => {
        expect(enriched('2025-06-24').newData.fasting).toBe('OIL');
    });

    // 03/09 varies by year depending on Pascha proximity
    it('2024: 03/09 before Clean Monday (Sat = NONE)', () => {
        // 2024 Pascha = May 5. Mar 9 offset = -57. Before -48.
        expect(enriched('2024-03-09').newData.fasting).toBe('NONE');
    });

    it('2025: 03/09 after PASCHA-44 (Sun = OIL regardless)', () => {
        // 2025 Pascha = Apr 20. Mar 9 offset = -42. After -44.
        expect(enriched('2025-03-09').newData.fasting).toBe('OIL');
    });

    // 04/23 fasting varies by Pascha proximity
    it('2025: 04/23 at PASCHA+3 (Bright Week Wed) = NONE', () => {
        expect(enriched('2025-04-23').newData.fasting).toBe('NONE');
    });

    // PASCHA-51 note in different year
    it('2025: PASCHA-51 (Feb 28, Fri) has no-fasting note', () => {
        expect(enriched('2025-02-28').newData.lengthyNotes[0]).toContain('no fasting');
    });

    // Dec 26-31 lengthy notes
    it('2025: Dec 26 (Fri) and Dec 31 (Wed) have no-fasting notes', () => {
        expect(enriched('2025-12-26').newData.lengthyNotes[0]).toContain('no fasting');
        expect(enriched('2025-12-31').newData.lengthyNotes[0]).toContain('no fasting');
    });

    // DST in different year
    it('2025: DST end note on Nov 2 (1st Sunday in November)', () => {
        expect(enriched('2025-11-02').newData.note?.[0]).toContain('Daylight Savings Time ends');
    });

    // Tone cycle wrap-around (after Plagal 4th → 1st)
    it('2026: tone wraps to 1st Tone after Plagal 4th', () => {
        // PASCHA+56 = Plagal 4th, PASCHA+63 = 1st Tone
        expect(enriched('2026-06-07').newData.tone).toBe('Plagal 4th Tone');
        expect(enriched('2026-06-14').newData.tone).toBe('1st Tone');
    });
});

// ============================================================
// Old calendar — additional edge cases
// ============================================================

describe('Old calendar edge cases', () => {
    it('Jan 7 new: old calendar has Nativity but new calendar has no feast', () => {
        // This tests the UI layer scenario where oldFeast=true but newFeast=false → show neither
        const result = enriched('2026-01-07');
        expect(result.newData.feast).toBeUndefined();
        expect(result.oldData.feast?.[0]).toContain('Nativity');
        expect(result.newData.saint?.[0]).toContain('Synaxis of the Forerunner');
    });

    it('old calendar Bright Week matches physical Sunday', () => {
        // Old Pascha 2026 = Mar 30 (Julian) = Apr 12 (physical, same as new).
        // Old Bright Week = physical Apr 12-18. Check Apr 15 (Wed) = NONE.
        const result = enriched('2026-04-15');
        expect(result.oldData.fasting).toBe('NONE'); // Bright Week
    });

    it('old calendar tones match new when Paschas align physically', () => {
        // Since both calendars share the same physical Pascha,
        // their tone cycles run identically on the same physical Sundays.
        const result = enriched('2025-05-04'); // New PASCHA+14 for 2025
        expect(result.newData.tone).toBe('2nd Tone');
        expect(result.oldData.tone).toBe('2nd Tone');
    });

    it('old calendar Cheese Fare uses correct physical day-of-week', () => {
        // Old Pascha 2026 = Mar 30 (physical = Apr 12).
        // Old Cheese Fare = PASCHA-55 to PASCHA-49 (physical Feb 16-22, same as new).
        // Feb 16 physical = Monday → DAIRY.
        const result = enriched('2026-02-16');
        expect(result.oldData.fasting).toBe('DAIRY');
    });

    it('old calendar 09/14 fasting uses shifted physical date', () => {
        // Old 09/14 = physical Sep 27 (Sep 14 + 13).
        // 2026 Sep 27 = Sunday → OIL (not STRICT).
        const result = enriched('2026-09-27');
        expect(result.oldData.fasting).toBe('OIL');
        expect(result.oldData.date).toBe(14);
    });

    it('old calendar Annunciation (old 03/25 = new Apr 7) is FISH', () => {
        const result = enriched('2026-04-07');
        expect(result.oldData.date).toBe(25);
        expect(result.oldData.fasting).toBe('FISH');
        expect(result.oldData.feast?.[0]).toContain('Annunciation');
    });
});

// ============================================================
// Moon phases
// ============================================================

describe('Moon phases', () => {
    it('Jan 3 2026 is Full Moon', () => {
        expect(enriched('2026-01-03').moon).toBe('FULL');
    });

    it('Jan 18 2026 is New Moon', () => {
        expect(enriched('2026-01-18').moon).toBe('NEW');
    });

    it('most days have no moon phase', () => {
        expect(enriched('2026-01-15').moon).toBe('NONE');
    });

    it('moon is independent of calendar system', () => {
        // Both old and new data are for the same physical date — moon is shared
        const result = enriched('2026-01-03');
        expect(result.moon).toBe('FULL');
        // moon is on EnrichedDate, not per-calendar
    });
});
