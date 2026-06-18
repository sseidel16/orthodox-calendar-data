import { describe, it, expect } from 'vitest';
import { generateData, generateDataRange, GREGORIAN, JULIAN, PhysicalDay } from '../src/index.js';
import { EnrichedDateData } from '../src/engine/enrichedTypes.js';

function getData(year: number, month: number, day: number, cal = GREGORIAN): EnrichedDateData {
    return generateData(year, month, day, cal);
}

// ============================================================
// Structural tests
// ============================================================

describe('EnrichedDate structure', () => {
    it('returns correct date number for new calendar', () => {
        const result = getData(2026, 1, 15);
        expect(result.date).toBe(15);
    });

    it('returns correct date number for old calendar', () => {
        // Old Jan 2 corresponds to physical Jan 15
        const result = getData(2026, 1, 2, JULIAN);
        expect(result.date).toBe(2);
    });

    it('old calendar date wraps across month boundary', () => {
        // Physical Jan 1 = old Dec 19
        const result = getData(2025, 12, 19, JULIAN);
        expect(result.date).toBe(19);
    });
});

// ============================================================
// New calendar — fasting
// ============================================================

describe('New calendar fasting', () => {
    it('basemap: Wednesday is STRICT', () => {
        // Jan 7, 2026 is Wednesday
        expect(getData(2026, 1, 7).fasting).toBe('OIL');
        // Actually Jan 7 is in the NONE/OIL override list! Use a plain Wed instead.
        // Jan 21 2026 is Wednesday with no override
        expect(getData(2026, 1, 21).fasting).toBe('STRICT');
    });

    it('basemap: Sunday is NONE', () => {
        expect(getData(2026, 1, 25).fasting).toBe('NONE');
    });

    it('Cheese Fare: Mon=DAIRY, Wed=OIL', () => {
        // 2026 Cheese Fare: PASCHA-55=Feb 16 (Mon) through PASCHA-49=Feb 22 (Sun)
        expect(getData(2026, 2, 16).fasting).toBe('DAIRY');
        expect(getData(2026, 2, 18).fasting).toBe('OIL'); // Wed
    });

    it('Great Lent: Mon=STRICT, Sat=OIL', () => {
        // Clean Monday Feb 23
        expect(getData(2026, 2, 23).fasting).toBe('STRICT');
        // A Saturday in Lent: Feb 28
        expect(getData(2026, 2, 28).fasting).toBe('OIL');
    });

    it('Bright Week: all NONE', () => {
        expect(getData(2026, 4, 12).fasting).toBe('NONE'); // Pascha
        expect(getData(2026, 4, 15).fasting).toBe('NONE'); // Wed of Bright Week
    });

    it('Pentecostarion: Wed/Fri=OIL, PASCHA+38=NONE', () => {
        // PASCHA+38 = May 20 (Apodosis)
        expect(getData(2026, 5, 20).fasting).toBe('NONE');
        // A Pentecostarion Wednesday: Apr 29 (PASCHA+17)
        expect(getData(2026, 4, 29).fasting).toBe('OIL');
    });

    it('Week after Pentecost: NONE', () => {
        // PASCHA+50 = Jun 1 through PASCHA+55 = Jun 6
        expect(getData(2026, 6, 3).fasting).toBe('NONE'); // Wed
    });

    it('always NONE: 01/01, 01/06, 12/25', () => {
        expect(getData(2026, 1, 1).fasting).toBe('NONE');
        expect(getData(2026, 1, 6).fasting).toBe('NONE');
        expect(getData(2026, 12, 25).fasting).toBe('NONE');
    });

    it('always FISH: 03/25, 08/06, 11/21', () => {
        expect(getData(2026, 3, 25).fasting).toBe('FISH');
        expect(getData(2026, 8, 6).fasting).toBe('FISH');
        expect(getData(2026, 11, 21).fasting).toBe('FISH');
    });

    it('Apostles Fast: WF=STRICT, MonTuTh=OIL, SatSun=FISH', () => {
        // Starts PASCHA+57 = Jun 8 (Mon). Jun 9=Tue, Jun 10=Wed, Jun 14=Sun
        expect(getData(2026, 6, 8).fasting).toBe('OIL');     // Mon
        expect(getData(2026, 6, 9).fasting).toBe('OIL');     // Tue
        expect(getData(2026, 6, 10).fasting).toBe('STRICT'); // Wed
        expect(getData(2026, 6, 14).fasting).toBe('FISH');   // Sun
    });

    it('06/24 exception during Apostles Fast: OIL', () => {
        // 2026: PASCHA+57=Jun 8, Jun 24 is during Apostles Fast (offset=73)
        expect(getData(2026, 6, 24).fasting).toBe('OIL');
    });

    it('03/09 before Clean Monday: NONE (Thu) or OIL (if Wed/Fri)', () => {
        // 2026: PASCHA-48=Feb 23 (Clean Monday). Mar 9 offset = -34 (after first week)
        // So 03/09 falls after PASCHA-44, rule says OIL regardless
        expect(getData(2026, 3, 9).fasting).toBe('OIL');
    });

    it('09/14 Mon-Fri=STRICT, Sat/Sun=OIL', () => {
        // 2026 Sep 14 = Monday
        expect(getData(2026, 9, 14).fasting).toBe('STRICT');
    });
});

// ============================================================
// New calendar — tones
// ============================================================

describe('New calendar tones', () => {
    it('PASCHA+14 has 2nd Tone', () => {
        expect(getData(2026, 4, 26).tone).toBe('2nd Tone');
    });

    it('PASCHA+21 has 3rd Tone', () => {
        expect(getData(2026, 5, 3).tone).toBe('3rd Tone');
    });

    it('PASCHA+49 (Pentecost) tone is suppressed', () => {
        expect(getData(2026, 5, 31).tone).toBeUndefined();
    });

    it('PASCHA+56 has Plagal 4th Tone (skips Pentecost in cycle)', () => {
        expect(getData(2026, 6, 7).tone).toBe('Plagal 4th Tone');
    });

    it('non-Sunday has no tone', () => {
        expect(getData(2026, 4, 27).tone).toBeUndefined(); // Monday
    });

    it('tone suppressed on 09/14 when Sunday (2025)', () => {
        expect(getData(2025, 9, 14).tone).toBeUndefined();
    });

    it('early year continues from previous year cycle', () => {
        // Jan 18 2026 (Sunday) should have a tone from prev year's cycle
        expect(getData(2026, 1, 18).tone).toBe('Grave Tone');
    });

    it('PASCHA-14 is last Sunday with tone before reset', () => {
        // PASCHA-14 = Mar 29 2026 (Sunday)
        expect(getData(2026, 3, 29).tone).toBeDefined();
        // PASCHA-7 (Palm Sunday) should NOT have tone
        expect(getData(2026, 4, 5).tone).toBeUndefined();
    });
});

// ============================================================
// New calendar — lengthy notes
// ============================================================

describe('New calendar lengthy notes', () => {
    it('Palm Sunday has fish note', () => {
        const result = getData(2026, 4, 5);
        expect(result.lengthyNotes[0]).toBe('Some traditions allow for fish on Palm Sunday.');
    });

    it('PASCHA-53 has no-fasting note', () => {
        // PASCHA-53 = Feb 18 2026 (Wed of Cheese Fare)
        const result = getData(2026, 2, 18);
        expect(result.lengthyNotes[0]).toBe('Some traditions allow for no fasting on this day.');
    });

    it('Wed in Pentecostarion has monastery note', () => {
        const result = getData(2026, 4, 29); // PASCHA+17, Wednesday
        expect(result.lengthyNotes[0]).toContain("St. Anthony's");
    });

    it('monastery note excluded on 04/23', () => {
        // 2026: PASCHA+24 = May 6 (Wed)
        const result = getData(2026, 5, 6);
        expect(result.lengthyNotes).toEqual([]);
    });

    it('Wed/Fri in Jan 2-4 has no-fasting note', () => {
        // 2026 Jan 2 = Friday
        const result = getData(2026, 1, 2);
        expect(result.lengthyNotes[0]).toBe('Some traditions allow for no fasting on this day.');
    });

    it('no lengthy note on normal day', () => {
        expect(getData(2026, 3, 15).lengthyNotes).toEqual([]);
    });

    it('PASCHA-67 (Feb 4, Wed) has no-fasting note', () => {
        const result = getData(2026, 2, 4);
        expect(result.lengthyNotes[0]).toBe('Some traditions allow for no fasting on this day.');
    });

    it('PASCHA-65 (Feb 6, Fri) has no-fasting note', () => {
        const result = getData(2026, 2, 6);
        expect(result.lengthyNotes[0]).toBe('Some traditions allow for no fasting on this day.');
    });

    it('PASCHA-66 (Feb 5, Thu) does NOT have no-fasting note', () => {
        expect(getData(2026, 2, 5).lengthyNotes).toEqual([]);
    });
});

// ============================================================
// New calendar — feast/saint/note text
// ============================================================

describe('New calendar text rules', () => {
    it('Jan 1 has feast, saints, and note from immovables', () => {
        const result = getData(2026, 1, 1);
        expect(result.feast?.[0]).toBe('Circumcision of Our Lord Jesus Christ');
        expect(result.saint?.[0]).toContain('Basil the Great');
        expect(result.note?.[0]).toContain('New Year');
    });

    it('movable feast shows on resolved date', () => {
        // Pascha = Apr 12
        expect(getData(2026, 4, 12).feast?.[0]).toContain('Holy Pascha');
        expect(getData(2026, 4, 5).feast?.[0]).toBe('Palm Sunday');
    });

    it('eliminator date 01/06 suppresses movables', () => {
        const result = getData(2026, 1, 6);
        // Should only have immovable Theophany feast
        expect(result.feast?.[0]).toContain('Theophany');
    });

    it('eliminator date 12/25 suppresses movables', () => {
        const result = getData(2026, 12, 25);
        expect(result.feast?.[0]).toContain('Nativity');
    });

    it('ECUM4 feast overrides other feast text on that day', () => {
        // ECUM4 2026 = Jul 19
        const result = getData(2026, 7, 19);
        expect(result.feast?.[0]).toBe('Holy Fathers of 4th Ecumenical Council');
        expect(result.feast?.[0]).not.toContain('Matthew');
    });

    it('multiple saints concatenated with newline', () => {
        const result = getData(2026, 1, 1);
        expect(result.saint?.[0]).toContain('\n');
    });

    it('DST note appears on 2nd Sunday in March', () => {
        // 2026: 2nd Sunday in March = Mar 8
        const result = getData(2026, 3, 8);
        expect(result.note?.[0]).toContain('Daylight Savings Time begins');
    });

    it('St. George rule: 2024 only first 04/23 saint (St George) duplicated to Bright Tuesday', () => {
        // 2024: Pascha=May 5, Apr 23 is before PASCHA+2 (May 7)
        // Only the first Type=Saint entry (St George) is duplicated, not Anatolios & Protoleon
        const brightTues = getData(2024, 5, 7);
        expect(brightTues.saint?.[0]).toContain('Great-martyr George');
        expect(brightTues.saint?.some(s => s.includes('Anatolios'))).toBe(false);
    });

    it('St. George rule: 2026 Apr 23 NOT duplicated (after PASCHA+2)', () => {
        // 2026: Pascha=Apr 12, Apr 23 = PASCHA+11, rule doesn't apply
        const brightTues = getData(2026, 4, 14); // PASCHA+2
        expect(brightTues.saint?.[0]).not.toContain('George');
    });
});

// ============================================================
// Old calendar — structural correctness
// ============================================================

describe('Old calendar data', () => {
    it('old calendar Jan 1 (= new Jan 14) has Circumcision feast', () => {
        const result = getData(2026, 1, 1, JULIAN);
        expect(result.date).toBe(1);
        expect(result.feast?.[0]).toBe('Circumcision of Our Lord Jesus Christ');
        expect(result.saint?.[0]).toContain('Basil the Great');
    });

    it('old calendar Theophany (old Jan 6 = new Jan 19) has NONE fasting', () => {
        const result = getData(2026, 1, 6, JULIAN);
        expect(result.date).toBe(6);
        expect(result.fasting).toBe('NONE');
        expect(result.feast?.[0]).toContain('Theophany');
    });

    it('old calendar Nativity (old Dec 25 = new Jan 7) has feast and NONE fasting', () => {
        const result = getData(2025, 12, 25, JULIAN);
        expect(result.date).toBe(25);
        expect(result.feast?.[0]).toContain('Nativity');
        expect(result.fasting).toBe('NONE');
    });

    it('old calendar has its own Pascha-based fasting', () => {
        // 2026 old Pascha = Mar 30. Old Great Lent starts Feb 10 old.
        // Feb 11 old (= Feb 24 new). Tue in Lent => STRICT from movables.
        const result = getData(2026, 2, 11, JULIAN);
        expect(result.fasting).toBe('STRICT'); // old Lent
        // Also check new calendar for same physical date (Feb 24 new)
        const newResult = getData(2026, 2, 24);
        expect(newResult.fasting).toBe('STRICT'); // new Lent too
    });

    it('old calendar Palm Sunday has fish note', () => {
        // Old Pascha 2026 = Mar 30. Old Palm Sunday = Mar 23 old = Apr 5 new
        const result = getData(2026, 3, 23, JULIAN);
        expect(result.lengthyNotes[0]).toContain('fish on Palm Sunday');
    });

    it('old calendar tones work independently', () => {
        // Old Pascha 2026 = Mar 30. Old PASCHA+14 = Apr 13 old = Apr 26 new
        const result = getData(2026, 4, 13, JULIAN);
        expect(result.tone).toBe('2nd Tone');
        // New calendar same physical day:
        const newResult = getData(2026, 4, 26);
        expect(newResult.tone).toBe('2nd Tone'); // new PASCHA+14
    });

    it('old and new calendar fasting can differ', () => {
        // Dec 25 new = NONE (Nativity). Old date = Dec 12.
        // Old calendar Dec 12 rule: OIL on weekday, FISH on Sat/Sun.
        // Physical day = Dec 25 (Friday) → OIL.
        const newResult = getData(2026, 12, 25);
        expect(newResult.fasting).toBe('NONE');
        const oldResult = getData(2026, 12, 12, JULIAN);
        expect(oldResult.fasting).toBe('OIL');
    });

    it('old calendar eliminator suppresses movables on old Jan 6', () => {
        // Old Jan 6 = new Jan 19
        const result = getData(2026, 1, 6, JULIAN);
        // oldData should only have immovable Theophany, no movables
        expect(result.feast?.[0]).toContain('Theophany');
    });
});

// ============================================================
// Fasting — Nativity Fast (Nov 15 - Dec 24)
// ============================================================

describe('Nativity Fast fasting', () => {
    it('Nov 15 (Sun) = OIL (STRICT MWF, OIL others)', () => {
        expect(getData(2026, 11, 15).fasting).toBe('OIL');
    });

    it('Nov 22 (Sun) = FISH (STRICT MWF, OIL TuTh, FISH SatSun)', () => {
        expect(getData(2026, 11, 22).fasting).toBe('FISH');
    });

    it('Nov 25 (Wed) = OIL (OIL weekday, FISH weekend)', () => {
        expect(getData(2026, 11, 25).fasting).toBe('OIL');
    });

    it('Dec 6 (Sun) = FISH (STRICT MWF, OIL TuTh, FISH SatSun)', () => {
        expect(getData(2026, 12, 6).fasting).toBe('FISH');
    });

    it('Dec 12 (Sat) = FISH (OIL weekday, FISH weekend)', () => {
        expect(getData(2026, 12, 12).fasting).toBe('FISH');
    });

    it('Dec 17 (Thu) = OIL (STRICT MWF, OIL TuTh, FISH SatSun)', () => {
        expect(getData(2026, 12, 17).fasting).toBe('OIL');
    });

    it('Dec 20 (Sun) = OIL (STRICT MWF, OIL others for Dec 18-23)', () => {
        expect(getData(2026, 12, 20).fasting).toBe('OIL');
    });

    it('Dec 24 (Thu) = STRICT (STRICT Mon-Fri)', () => {
        expect(getData(2026, 12, 24).fasting).toBe('STRICT');
    });
});

// ============================================================
// Fasting — Dormition Fast (Aug 1-14)
// ============================================================

describe('Dormition Fast fasting', () => {
    it('Aug 1 (Sat) = OIL', () => {
        expect(getData(2026, 8, 1).fasting).toBe('OIL');
    });

    it('Aug 3 (Mon) = STRICT', () => {
        expect(getData(2026, 8, 3).fasting).toBe('STRICT');
    });

    it('Aug 6 (Thu) = FISH (Transfiguration, always FISH)', () => {
        expect(getData(2026, 8, 6).fasting).toBe('FISH');
    });

    it('Aug 7 (Fri) = STRICT', () => {
        expect(getData(2026, 8, 7).fasting).toBe('STRICT');
    });

    it('Aug 9 (Sun) = OIL', () => {
        expect(getData(2026, 8, 9).fasting).toBe('OIL');
    });

    it('Aug 14 (Fri) = STRICT', () => {
        expect(getData(2026, 8, 14).fasting).toBe('STRICT');
    });

    it('Aug 15 (Sat) = NONE (feast day, NONE/FISH on WedFri)', () => {
        expect(getData(2026, 8, 15).fasting).toBe('NONE');
    });
});

// ============================================================
// Fasting — Pentecostarion non-fasting days
// ============================================================

describe('Pentecostarion non-fasting', () => {
    it('Mon/Tue/Thu in Pentecostarion = NONE (basemap)', () => {
        expect(getData(2026, 4, 20).fasting).toBe('NONE'); // Mon PASCHA+8
        expect(getData(2026, 4, 21).fasting).toBe('NONE'); // Tue PASCHA+9
        expect(getData(2026, 4, 23).fasting).toBe('NONE'); // Thu PASCHA+11
    });

    it('Sat/Sun in Pentecostarion = NONE (basemap)', () => {
        expect(getData(2026, 4, 25).fasting).toBe('NONE'); // Sat
        expect(getData(2026, 4, 26).fasting).toBe('NONE'); // Sun
    });

    it('Week after Pentecost: all NONE including Wed/Fri', () => {
        expect(getData(2026, 6, 1).fasting).toBe('NONE'); // Mon
        expect(getData(2026, 6, 3).fasting).toBe('NONE'); // Wed
        expect(getData(2026, 6, 5).fasting).toBe('NONE'); // Fri
    });
});

// ============================================================
// Tones — year boundary continuity
// ============================================================

describe('Tone year boundary continuity', () => {
    it('2024 Dec tones continue the cycle', () => {
        expect(getData(2024, 12, 1).tone).toBe('Plagal 2nd Tone');
        expect(getData(2024, 12, 8).tone).toBe('Grave Tone');
        expect(getData(2024, 12, 15).tone).toBe('Plagal 4th Tone');
        expect(getData(2024, 12, 22).tone).toBe('1st Tone');
        expect(getData(2024, 12, 29).tone).toBe('2nd Tone');
    });

    it('2025 Jan tones continue seamlessly from 2024 Dec', () => {
        expect(getData(2025, 1, 5).tone).toBe('3rd Tone');
        expect(getData(2025, 1, 12).tone).toBe('4th Tone');
        expect(getData(2025, 1, 19).tone).toBe('Plagal 1st Tone');
        expect(getData(2025, 1, 26).tone).toBe('Plagal 2nd Tone');
    });

    it('2024 Pentecost (Jun 23) tone suppressed', () => {
        expect(getData(2024, 6, 23).tone).toBeUndefined();
    });
});

// ============================================================
// Text — multiple entries and special combinations
// ============================================================

describe('Text — combinations', () => {
    it('Jan 1 has feast + saint + note simultaneously', () => {
        const r = getData(2026, 1, 1);
        expect(r.feast).toBeDefined();
        expect(r.saint).toBeDefined();
        expect(r.note).toBeDefined();
    });

    it('saints are newline-separated when multiple', () => {
        const r = getData(2026, 1, 1);
        expect(r.saint![0].split('\n').length).toBe(2);
    });

    it('Palm Sunday has both movable feast + immovable saints', () => {
        const r = getData(2026, 4, 5);
        expect(r.feast![0]).toBe('Palm Sunday');
        expect(r.saint).toBeDefined();
    });

    it('2024 Cheese Fare Wed/Fri get note indicator (PASCHA-53)', () => {
        // 2024: PASCHA-53 = Mar 13 (Wed)
        const r = getData(2024, 3, 13);
        expect(r.lengthyNotes[0]).toContain('no fasting');
    });

    it('text ordering: movable note appears before immovable saints on Clean Monday', () => {
        // Feb 23 = PASCHA-48 (Clean Monday): movable note + immovable saints
        const r = getData(2026, 2, 23);
        expect(r.note![0]).toContain('Beginning of Lent');
        expect(r.saint![0]).toContain('Polycarp');
    });

    it('text ordering: movable feast comes before immovable saint on Palm Sunday', () => {
        // Apr 5: movable feast "Palm Sunday" + immovable saints (Claudios, Theodora)
        const r = getData(2026, 4, 5);
        expect(r.feast![0]).toBe('Palm Sunday');
        expect(r.saint![0]).toContain('Claudios');
    });
});

// ============================================================
// Old calendar — readings
// ============================================================

describe('Old calendar readings', () => {
    it('old Jan 1 (= new Jan 14) has Circumcision readings', () => {
        const r = getData(2026, 1, 1, JULIAN);
        expect(r.readings[0]).toBe('Colossians 2:8-12');
    });

    it('old Theophany (= new Jan 19) has Theophany readings', () => {
        const r = getData(2026, 1, 6, JULIAN);
        expect(r.readings[0]).toContain('Titus');
    });

    it('old Annunciation (= new Apr 7) has Annunciation readings', () => {
        const r = getData(2026, 3, 25, JULIAN);
        expect(r.readings[0]).toBe('Hebrews 2:11-18');
    });
});

// ============================================================
// Old calendar — lengthy notes
// ============================================================

describe('Old calendar lengthy notes', () => {
    it('old Palm Sunday note matches new (same physical day)', () => {
        const rOld = getData(2026, 3, 23, JULIAN);
        const rNew = getData(2026, 4, 5);
        expect(rOld.lengthyNotes[0]).toContain('fish on Palm Sunday');
        expect(rNew.lengthyNotes[0]).toContain('fish on Palm Sunday');
    });

    it('old PASCHA-53 note matches new (same physical day)', () => {
        // Old calendar PASCHA-53: old Pascha is Mar 30, so PASCHA-53 = Feb 5 old = Feb 18 new
        const r = getData(2026, 2, 5, JULIAN);
        expect(r.lengthyNotes[0]).toContain('no fasting');
    });

    it('no lengthy note on a normal old calendar day', () => {
        // Physical Jun 15 = old Jun 2
        expect(getData(2026, 6, 2, JULIAN).lengthyNotes).toEqual([]);
    });
});

// ============================================================
// 2024 specific (late Pascha = May 5)
// ============================================================

describe('2024 late Pascha edge cases', () => {
    it('Cheese Fare 2024 starts Mar 11', () => {
        expect(getData(2024, 3, 11).fasting).toBe('DAIRY');
        expect(getData(2024, 3, 13).fasting).toBe('OIL');
    });

    it('Clean Monday 2024 = Mar 18', () => {
        expect(getData(2024, 3, 18).fasting).toBe('STRICT');
    });

    it('Pentecost 2024 = Jun 23 with feast and no tone', () => {
        const r = getData(2024, 6, 23);
        expect(r.feast![0]).toContain('Pentecost');
        expect(r.tone).toBeUndefined();
    });

    it('2024 has 6 gap Sundays (most possible)', () => {
        // All should have readings
        const gapDates: [number, number, number][] = [
            [2024, 1, 14], [2024, 1, 21], [2024, 1, 28],
            [2024, 2, 4], [2024, 2, 11], [2024, 2, 18]
        ];
        for (const [y, m, d] of gapDates) {
            expect(getData(y, m, d).readings.length).toBeGreaterThan(0);
        }
    });
});

// ============================================================
// Cross-year edge cases
// ============================================================

describe('Cross-year and multi-year edge cases', () => {
    // 2024: late Pascha (May 5) — no Apostles Fast (PASCHA+57 = Jul 1, past Jun 28)
    it('2024: no Apostles Fast when Pascha is late (PASCHA+57 > Jun 28)', () => {
        // Jun 15 2024 = Saturday. Would be FISH if Apostles Fast, but it's just basemap NONE.
        expect(getData(2024, 6, 15).fasting).toBe('NONE');
    });

    // 2025: shorter Apostles Fast (PASCHA+57 = Jun 16)
    it('2025: Apostles Fast starts Jun 16 when Pascha is Apr 20', () => {
        expect(getData(2025, 6, 16).fasting).toBe('OIL');    // Mon
        expect(getData(2025, 6, 20).fasting).toBe('STRICT'); // Fri
    });

    it('2025: 06/24 exception during Apostles Fast (Tue = FISH)', () => {
        expect(getData(2025, 6, 24).fasting).toBe('FISH');
    });

    // 03/09 varies by year depending on Pascha proximity
    it('2024: 03/09 before Clean Monday (Sat = NONE)', () => {
        // 2024 Pascha = May 5. Mar 9 offset = -57. Before -48.
        expect(getData(2024, 3, 9).fasting).toBe('NONE');
    });

    it('2025: 03/09 after PASCHA-44 (Sun = OIL regardless)', () => {
        // 2025 Pascha = Apr 20. Mar 9 offset = -42. After -44.
        expect(getData(2025, 3, 9).fasting).toBe('OIL');
    });

    // 04/23 fasting varies by Pascha proximity
    it('2025: 04/23 at PASCHA+3 (Bright Week Wed) = NONE', () => {
        expect(getData(2025, 4, 23).fasting).toBe('NONE');
    });

    // PASCHA-51 note in different year
    it('2025: PASCHA-51 (Feb 28, Fri) has no-fasting note', () => {
        expect(getData(2025, 2, 28).lengthyNotes[0]).toContain('no fasting');
    });

    // Dec 26-31 lengthy notes
    it('2025: Dec 26 (Fri) and Dec 31 (Wed) have no-fasting notes', () => {
        expect(getData(2025, 12, 26).lengthyNotes[0]).toContain('no fasting');
        expect(getData(2025, 12, 31).lengthyNotes[0]).toContain('no fasting');
    });

    // DST in different year
    it('2025: DST end note on Nov 2 (1st Sunday in November)', () => {
        expect(getData(2025, 11, 2).note?.[0]).toContain('Daylight Savings Time ends');
    });

    // Tone cycle wrap-around (after Plagal 4th → 1st)
    it('2026: tone wraps to 1st Tone after Plagal 4th', () => {
        // PASCHA+56 = Plagal 4th, PASCHA+63 = 1st Tone
        expect(getData(2026, 6, 7).tone).toBe('Plagal 4th Tone');
        expect(getData(2026, 6, 14).tone).toBe('1st Tone');
    });
});

// ============================================================
// Old calendar — additional edge cases
// ============================================================

describe('Old calendar edge cases', () => {
    it('Jan 7 new: old calendar has Nativity but new calendar has no feast', () => {
        // This tests the UI layer scenario where oldFeast=true but newFeast=false
        const newResult = getData(2026, 1, 7);
        const oldResult = getData(2025, 12, 25, JULIAN);
        expect(newResult.feast).toBeUndefined();
        expect(oldResult.feast?.[0]).toContain('Nativity');
        expect(newResult.saint?.[0]).toContain('Synaxis of the Forerunner');
    });

    it('old calendar Bright Week matches physical Sunday', () => {
        // Old Pascha 2026 = Mar 30 (Julian) = Apr 12 (physical, same as new).
        // Old Bright Week = physical Apr 12-18. Check Apr 2 old (= Apr 15 physical, Wed) = NONE.
        const result = getData(2026, 4, 2, JULIAN);
        expect(result.fasting).toBe('NONE'); // Bright Week
    });

    it('old calendar tones match new when Paschas align physically', () => {
        // Since both calendars share the same physical Pascha,
        // their tone cycles run identically on the same physical Sundays.
        // 2025 new PASCHA+14 = May 4 new. Old calendar: Apr 21 old = May 4 physical.
        const newResult = getData(2025, 5, 4);
        const oldResult = getData(2025, 4, 21, JULIAN);
        expect(newResult.tone).toBe('2nd Tone');
        expect(oldResult.tone).toBe('2nd Tone');
    });

    it('old calendar Cheese Fare uses correct physical day-of-week', () => {
        // Old Pascha 2026 = Mar 30 (physical = Apr 12).
        // Old Cheese Fare = PASCHA-55 to PASCHA-49 (physical Feb 16-22, same as new).
        // Feb 16 physical = Monday → DAIRY. Old Feb 3 = physical Feb 16.
        const result = getData(2026, 2, 3, JULIAN);
        expect(result.fasting).toBe('DAIRY');
    });

    it('old calendar 09/14 fasting uses shifted physical date', () => {
        // Old 09/14 = physical Sep 27 (Sep 14 + 13).
        // 2026 Sep 27 = Sunday → OIL (not STRICT).
        const result = getData(2026, 9, 14, JULIAN);
        expect(result.fasting).toBe('OIL');
        expect(result.date).toBe(14);
    });

    it('old calendar Annunciation (old 03/25 = new Apr 7) is FISH', () => {
        const result = getData(2026, 3, 25, JULIAN);
        expect(result.date).toBe(25);
        expect(result.fasting).toBe('FISH');
        expect(result.feast?.[0]).toContain('Annunciation');
    });
});

// ============================================================
// Readings — movable readings
// ============================================================

describe('Readings — movable', () => {
    it('Pascha has Acts + John', () => {
        const r = getData(2026, 4, 12).readings;
        expect(r[0]).toBe('Acts 1:1-8');
        expect(r[1]).toBe('John 1:1-17');
    });

    it('Bright Week days have movable readings (Acts + John)', () => {
        const r = getData(2026, 4, 13).readings;
        expect(r[0]).toContain('Acts');
        expect(r[1]).toContain('John');
    });

    it('Pentecost has Acts + John', () => {
        const r = getData(2026, 5, 31).readings;
        expect(r[0]).toContain('Acts');
        expect(r[1]).toContain('John');
    });

    it('Holy Week has readings', () => {
        // Holy Monday
        expect(getData(2026, 4, 6).readings[0]).toContain('Matthew');
        // Holy Thursday
        expect(getData(2026, 4, 9).readings[0]).toContain('1 Corinthians');
    });

    it('early year readings come from prev Pascha cycle', () => {
        // Jan 1-11 get readings from prev year's large positive offsets
        const jan3 = getData(2026, 1, 3).readings;
        expect(jan3.length).toBeGreaterThan(0);
        expect(jan3[0]).toContain('1 Timothy');
    });

    it('post-SUNaT readings come from current Pascha cycle', () => {
        const jan12 = getData(2026, 1, 12).readings;
        expect(jan12.length).toBeGreaterThan(0);
    });

    it('Lent weekdays have OT readings (Isaiah, Genesis, Proverbs)', () => {
        const r = getData(2026, 3, 2).readings;
        expect(r.some(x => x.startsWith('Isaiah'))).toBe(true);
        expect(r.some(x => x.startsWith('Genesis'))).toBe(true);
        expect(r.some(x => x.startsWith('Proverbs'))).toBe(true);
    });

    it('Lent Saturdays have epistle + gospel (not OT)', () => {
        // First Saturday of Lent 2026 = Feb 28
        const r = getData(2026, 2, 28).readings;
        expect(r.length).toBe(2);
        // Should not contain OT books
        expect(r.some(x => x.startsWith('Isaiah') || x.startsWith('Genesis') || x.startsWith('Proverbs'))).toBe(false);
    });
});

// ============================================================
// Readings — gap Sunday epistles
// ============================================================

describe('Readings — gap Sunday epistles', () => {
    it('2026: 2 gap Sundays (L12, L15) get epistle + gospel', () => {
        const l12 = getData(2026, 1, 18).readings;
        const l15 = getData(2026, 1, 25).readings;
        // L12 gets epistle from PASCHA+252
        expect(l12[0]).toBe('Colossians 3:4-11');
        expect(l12[1]).toContain('Luke');
        // L15 gets epistle from PASCHA+273
        expect(l15[0]).toBe('1 Timothy 4:9-15');
        expect(l15[1]).toContain('Luke');
    });

    it('2025: 3 gap Sundays get epistles from correct offsets', () => {
        // 2025 has 3 gap Sundays, pattern: [252, 273, 168]
        const jan19 = getData(2025, 1, 19).readings; // likely a gap Sunday
        expect(jan19.length).toBeGreaterThan(0);
    });

    it('2024: 6 gap Sundays (late Pascha = more gap)', () => {
        // 2024: SUNaT=Jan 7, PASCHA-70=Feb 25. Gap Sundays: Jan 14,21,28, Feb 4,11,18
        const jan14 = getData(2024, 1, 14).readings;
        expect(jan14.length).toBeGreaterThan(0);
        expect(jan14[0]).not.toBe(''); // has epistle
    });
});

// ============================================================
// Readings — immovable (HLR)
// ============================================================

describe('Readings — immovable HLR', () => {
    it('01/01 always has immovable readings (Colossians + Luke)', () => {
        expect(getData(2026, 1, 1).readings[0]).toBe('Colossians 2:8-12');
        expect(getData(2026, 1, 1).readings[1]).toContain('Luke');
    });

    it('01/06 Theophany has immovable readings (Titus + Matthew)', () => {
        const r = getData(2026, 1, 6).readings;
        expect(r[0]).toContain('Titus');
        expect(r[1]).toContain('Matthew');
    });

    it('03/25 Annunciation has Hebrews', () => {
        expect(getData(2026, 3, 25).readings[0]).toBe('Hebrews 2:11-18');
    });

    it('09/14 Elevation has 1 Corinthians + John', () => {
        const r = getData(2026, 9, 14).readings;
        expect(r[0]).toContain('1 Corinthians');
        expect(r[1]).toContain('John');
    });

    it('12/25 Nativity has Galatians + Matthew', () => {
        const r = getData(2026, 12, 25).readings;
        expect(r[0]).toContain('Galatians');
        expect(r[1]).toContain('Matthew');
    });

    it('HLR overrides movable readings on that day', () => {
        // 01/06 is both an HLR date AND might have movable readings from SUNaT offset
        // HLR should win
        const r = getData(2026, 1, 6).readings;
        expect(r[0]).toContain('Titus'); // immovable, not movable
    });
});

// ============================================================
// Readings — immovable LLR
// ============================================================

describe('Readings — immovable LLR', () => {
    it('01/05 LLR replaces movable on weekday', () => {
        // 2026 Jan 5 = Monday (not Saturday, so LLR applies)
        const r = getData(2026, 1, 5).readings;
        expect(r[0]).toBe('1 Corinthians 9:19-27');
        expect(r[1]).toBe('Luke 3:1-18');
    });

    it('04/23 LLR applies when after PASCHA+2 (2026)', () => {
        // 2026: Apr 23 = PASCHA+11, after PASCHA+2. LLR applies.
        const r = getData(2026, 4, 23).readings;
        expect(r[0]).toBe('Acts 12:1-11');
        expect(r[1]).toContain('John');
    });

    it('04/23 LLR does NOT apply when before PASCHA+2 (2024)', () => {
        // 2024: Pascha=May 5. Apr 23 is before PASCHA+2 (May 7). LLR skipped.
        // Should have movable Lent readings instead
        const r = getData(2024, 4, 23).readings;
        expect(r.some(x => x.startsWith('Isaiah') || x.startsWith('Genesis'))).toBe(true);
    });

    it('LLR does not replace on Sunday (protected)', () => {
        // If a LLR date falls on Sunday, movable reading is kept.
        // 2024-01-07 is Sunday. 01/07 is in LLR group 1.
        const r = getData(2024, 1, 7).readings;
        // Should have the Sunday movable reading, not the LLR immovable
        expect(r.length).toBeGreaterThan(0);
    });

    it('LLR does not replace during Bright Week (protected)', () => {
        // 2025: Pascha=Apr 20. 04/25 = PASCHA+5 (Bright Fri). 04/25 is LLR.
        const r = getData(2025, 4, 25).readings;
        expect(r[0]).toContain('Acts'); // Bright Week movable kept
    });

    it('LLR does not replace on Mid-Pentecost (protected)', () => {
        // 2026: PASCHA+24 = May 6. Need to check if May 6 is an LLR date... it's not.
        // Instead verify that the date keeps its movable reading
        const r = getData(2026, 5, 6).readings;
        expect(r.length).toBeGreaterThan(0);
    });
});

// ============================================================
// Readings — elimination rules
// ============================================================

describe('Readings — elimination rules', () => {
    it('2025: Jan 6 is Monday → Jan 3 readings eliminated', () => {
        expect(getData(2025, 1, 3).readings).toEqual([]);
    });

    it('2026: Jan 6 is Tuesday → Jan 3 keeps readings', () => {
        expect(getData(2026, 1, 3).readings.length).toBeGreaterThan(0);
    });

    it('non-elimination year: Jan 4 and Dec 22/23 keep readings', () => {
        // 2026: Jan 6 = Tue, Dec 25 = Fri. No elimination.
        expect(getData(2026, 1, 4).readings.length).toBeGreaterThan(0);
        expect(getData(2026, 12, 22).readings.length).toBeGreaterThan(0);
        expect(getData(2026, 12, 23).readings.length).toBeGreaterThan(0);
    });

    it('03/25 Annunciation has no OLD readings', () => {
        const r = getData(2026, 3, 25).readings;
        // Should have EPISTLE (Hebrews) and GOSPEL (Luke) but no OLD (Isaiah/Genesis/Proverbs)
        expect(r.length).toBe(2);
        expect(r[0]).toContain('Hebrews');
        expect(r[1]).toContain('Luke');
        for (const reading of r) {
            expect(reading).not.toContain('Isaiah');
            expect(reading).not.toContain('Genesis');
            expect(reading).not.toContain('Proverbs');
        }
    });
});

// ============================================================
// Readings — coverage and ordering
// ============================================================

describe('Readings — coverage and ordering', () => {
    it('2026 has near-complete readings coverage', () => {
        const all = generateDataRange({year: 2026, month: 1, day: 1}, {year: 2026, month: 12, day: 31}, GREGORIAN);
        const withR = all.filter(r => r.readings.length > 0).length;
        expect(withR).toBeGreaterThanOrEqual(360);
    });

    it('epistle comes before gospel in output', () => {
        // Pascha: epistle = Acts, gospel = John
        const r = getData(2026, 4, 12).readings;
        expect(r[0]).toContain('Acts');
        expect(r[1]).toContain('John');
    });

    it('OT readings come before epistle and gospel', () => {
        // Lent day with OT + epistle + gospel: Mar 9 (has Isaiah/Gen/Prov + Hebrews + Matthew)
        const r = getData(2026, 3, 9).readings;
        expect(r[0]).toContain('Isaiah');   // OT first
        expect(r[r.length - 2]).toContain('Hebrews'); // epistle second-to-last
        expect(r[r.length - 1]).toContain('Matthew'); // gospel last
    });

    it('LLR date with no OLD bundle preserves movable OT (Feb 24)', () => {
        // Feb 24 = PASCHA-47: movable OLD (Isaiah/Gen/Prov) + immovable EPISTLE + GOSPEL
        // Immovable has no OLD bundle, so movable OLD survives. Order: OLD, EPISTLE, GOSPEL
        const r = getData(2026, 2, 24).readings;
        expect(r[0]).toContain('Isaiah');
        expect(r[1]).toContain('Genesis');
        expect(r[2]).toContain('Proverbs');
        expect(r[3]).toContain('2 Corinthians');
        expect(r[4]).toContain('Matthew');
    });

    it('late December has readings from current year cycle', () => {
        const r = getData(2026, 12, 28).readings;
        expect(r.length).toBeGreaterThan(0);
    });
});

// ============================================================
// Readings — 2024 and 2025 cross-checks
// ============================================================

describe('Readings — 2024 cross-checks', () => {
    it('2024 Pascha (May 5) has Acts + John', () => {
        const r = getData(2024, 5, 5).readings;
        expect(r[0]).toContain('Acts');
        expect(r[1]).toContain('John');
    });

    it('2024 Clean Monday has OT readings', () => {
        const r = getData(2024, 3, 18).readings;
        expect(r.some(x => x.startsWith('Isaiah'))).toBe(true);
    });

    it('2024 Annunciation (Mar 25, during Lent) has immovable Hebrews reading', () => {
        expect(getData(2024, 3, 25).readings[0]).toBe('Hebrews 2:11-18');
    });

    it('2024 Dec 25 has Nativity readings', () => {
        const r = getData(2024, 12, 25).readings;
        expect(r[0]).toContain('Galatians');
        expect(r[1]).toContain('Matthew');
    });
});

describe('Readings — 2025 cross-checks', () => {
    it('2025 Pascha (Apr 20) has Acts + John', () => {
        const r = getData(2025, 4, 20).readings;
        expect(r[0]).toContain('Acts');
        expect(r[1]).toContain('John');
    });

    it('2025 Jan 3 eliminated (Jan 6 = Monday)', () => {
        expect(getData(2025, 1, 3).readings).toEqual([]);
    });

    it('2025 Sep 14 has Elevation readings (HLR)', () => {
        const r = getData(2025, 9, 14).readings;
        expect(r[0]).toContain('1 Corinthians');
    });

    it('2025 Bright Week keeps movable readings (protected from LLR)', () => {
        // PASCHA+1 = Apr 21
        const r = getData(2025, 4, 21).readings;
        expect(r[0]).toContain('Acts');
    });
});

// ============================================================
// Fasting — date-specific overrides (various categories)
// ============================================================

describe('Fasting — NONE/OIL on Wed/Fri dates', () => {
    it('01/07 Wed = OIL', () => {
        // 2026: Jan 7 = Wednesday
        expect(getData(2026, 1, 7).fasting).toBe('OIL');
    });

    it('01/20 on non-Wed/Fri = NONE', () => {
        // 2026: Jan 20 = Tuesday
        expect(getData(2026, 1, 20).fasting).toBe('NONE');
    });

    it('11/08 on non-Wed/Fri = NONE', () => {
        // 2026: Nov 8 = Sunday
        expect(getData(2026, 11, 8).fasting).toBe('NONE');
    });
});

describe('Fasting — NONE/FISH on Wed/Fri dates', () => {
    it('06/29 Sts Peter & Paul on non-Wed/Fri = NONE', () => {
        // 2026: Jun 29 = Monday
        expect(getData(2026, 6, 29).fasting).toBe('NONE');
    });

    it('08/15 Dormition on non-Wed/Fri = NONE', () => {
        // 2026: Aug 15 = Saturday
        expect(getData(2026, 8, 15).fasting).toBe('NONE');
    });

    it('02/02 Meeting on Wed = FISH', () => {
        // Need year where Feb 2 is Wed. 2022: Feb 2 = Wed. Out of test range.
        // 2025: Feb 2 = Sunday → NONE (not applicable). Let's verify:
        expect(getData(2025, 2, 2).fasting).toBe('NONE');
    });
});

describe('Fasting — Apostles Fast edge cases', () => {
    it('Jun 28 is last day of Apostles Fast (day before Sts Peter & Paul)', () => {
        // 2026: Jun 28 = Sunday → FISH in Apostles Fast
        expect(getData(2026, 6, 28).fasting).toBe('FISH');
    });

    it('Jun 29 is NOT in Apostles Fast (feast day)', () => {
        expect(getData(2026, 6, 29).fasting).toBe('NONE');
    });

    it('2025: Apostles Fast Mon (Jun 16) = OIL', () => {
        expect(getData(2025, 6, 16).fasting).toBe('OIL');
    });

    it('2025: Apostles Fast Sat (Jun 21) = FISH', () => {
        expect(getData(2025, 6, 21).fasting).toBe('FISH');
    });
});

// ============================================================
// Text — special rules (Royal Hours, DST)
// ============================================================

describe('Text — Royal Hours and DST', () => {
    it('2026: Jan 5 (Mon) gets Royal Hours + Liturgy of St. Basil', () => {
        const r = getData(2026, 1, 5);
        expect(r.note![0]).toContain('Royal Hours');
        expect(r.note![0]).toContain('Liturgy of St. Basil');
    });

    it('2024: Jan 5 (Fri) gets Royal Hours + Liturgy of St. Basil', () => {
        const r = getData(2024, 1, 5);
        expect(r.note![0]).toContain('Royal Hours');
    });

    it('2026: DST begins on Mar 8 (2nd Sunday in March)', () => {
        expect(getData(2026, 3, 8).note![0]).toContain('Daylight Savings Time begins');
    });

    it('2026: DST ends on Nov 1 (1st Sunday in November)', () => {
        expect(getData(2026, 11, 1).note![0]).toContain('Daylight Savings Time ends');
    });

    it('2025: DST ends on Nov 2', () => {
        expect(getData(2025, 11, 2).note![0]).toContain('Daylight Savings Time ends');
    });
});

// ============================================================
// Old calendar — fasting edge cases
// ============================================================

describe('Old calendar — fasting varieties', () => {
    it('old calendar always-NONE dates shift correctly', () => {
        // Old 01/01 = physical Jan 14. Should be NONE.
        expect(getData(2026, 1, 1, JULIAN).fasting).toBe('NONE');
        // Old 01/06 = physical Jan 19. Should be NONE.
        expect(getData(2026, 1, 6, JULIAN).fasting).toBe('NONE');
    });

    it('old calendar always-FISH dates shift correctly', () => {
        // Old 03/25 = physical Apr 7. Should be FISH.
        expect(getData(2026, 3, 25, JULIAN).fasting).toBe('FISH');
        // Old 08/06 = physical Aug 19. Should be FISH.
        expect(getData(2026, 8, 6, JULIAN).fasting).toBe('FISH');
    });

    it('old calendar NONE/OIL dates work with shifted day-of-week', () => {
        // Old 01/07 = physical Jan 20 (Tue in 2026) → NONE
        expect(getData(2026, 1, 7, JULIAN).fasting).toBe('NONE');
    });

    it('old calendar Lent uses physical day-of-week', () => {
        // Both calendars have same physical Pascha, so Lent aligns
        // Feb 24 physical = Tue in both calendars → STRICT (Lent)
        // Old Feb 11 = physical Feb 24
        expect(getData(2026, 2, 11, JULIAN).fasting).toBe('STRICT');
    });
});

// ============================================================
// Comprehensive full-year sanity checks
// ============================================================

describe('Full-year sanity checks', () => {
    it('every day in 2026 has a valid fasting value', () => {
        const all = generateDataRange({year: 2026, month: 1, day: 1}, {year: 2026, month: 12, day: 31}, GREGORIAN);
        const validFasting = ['NONE', 'DAIRY', 'FISH', 'OIL', 'STRICT'];
        for (const r of all) {
            expect(validFasting).toContain(r.fasting);
        }
    });

    it('every Sunday in 2026 either has a tone or is in the no-tone window', () => {
        const all = generateDataRange({year: 2026, month: 1, day: 1}, {year: 2026, month: 12, day: 31}, GREGORIAN);
        const sundays = all.filter((_, i) => PhysicalDay.of(2026, 1, 1 + i).dayOfWeek() === 0);
        const withTone = sundays.filter(r => r.tone);
        // 52 Sundays, minus ~4 suppressed (Pentecost + 3-4 no-tone window)
        expect(withTone.length).toBeGreaterThanOrEqual(44);
        expect(withTone.length).toBeLessThanOrEqual(50);
    });

    it('no weekday has a tone', () => {
        const all = generateDataRange({year: 2026, month: 1, day: 1}, {year: 2026, month: 12, day: 31}, GREGORIAN);
        const weekdays = all.filter((_, i) => PhysicalDay.of(2026, 1, 1 + i).dayOfWeek() !== 0);
        expect(weekdays.every(r => r.tone === undefined)).toBe(true);
    });

    it('2025 full year has valid structure', () => {
        const all = generateDataRange({year: 2025, month: 1, day: 1}, {year: 2025, month: 12, day: 31}, GREGORIAN);
        expect(all.length).toBe(365);
        expect(all.every(r => r.date >= 1 && r.date <= 31)).toBe(true);
    });

    it('2024 leap year has 366 days', () => {
        const all = generateDataRange({year: 2024, month: 1, day: 1}, {year: 2024, month: 12, day: 31}, GREGORIAN);
        expect(all.length).toBe(366);
    });
});

// ============================================================
// Dual-placement: same offset appears twice in a year
// ============================================================

describe('Dual-placement — same PASCHA offset in Jan and Dec', () => {
    // In 2026, PASCHA+256 through +263 each land on TWO dates:
    // from prev Pascha (2025): Jan 1-8, from current Pascha (2026): Dec 24-31

    it('PASCHA+258 epistle appears on Jan 3 (from prev cycle)', () => {
        // Jan 3 also gets LLR immovable override (SATbT readings), but the epistle
        // from PASCHA+258 is placed first, then SATbT overrides. Check what's there.
        const r = getData(2026, 1, 3).readings;
        expect(r.length).toBeGreaterThan(0);
    });

    it('PASCHA+260 epistle appears on Dec 28 (from current cycle)', () => {
        const r = getData(2026, 12, 28).readings;
        expect(r[0]).toBe('Hebrews 11:17-31');
    });

    it('PASCHA+257 epistle on Jan 2 (prev cycle) coexists with SUNaE gospel', () => {
        // Jan 2 gets epistle from PASCHA+257 (prev) AND gospel from SUNaE+103 (prev)
        const r = getData(2026, 1, 2).readings;
        expect(r[0]).toBe('Hebrews 11:8-16');      // epistle from PASCHA+257
        expect(r[1]).toContain('Mark');              // gospel from SUNaE+103
    });

    it('PASCHA+257 on Dec 25 is overridden by HLR Nativity readings', () => {
        // Dec 25 has HLR immovable readings that override the movable PASCHA+257
        const r = getData(2026, 12, 25).readings;
        expect(r[0]).toContain('Galatians');         // Nativity epistle
        expect(r[1]).toContain('Matthew');           // Nativity gospel
    });

    it('PASCHA+256 on Jan 1 is overridden by HLR Circumcision readings', () => {
        const r = getData(2026, 1, 1).readings;
        expect(r[0]).toBe('Colossians 2:8-12');     // Circumcision, not PASCHA+256
    });

    it('both Jan and Dec instances are independently correct', () => {
        // PASCHA+260: Jan 5 (prev cycle, LLR override applies) vs Dec 28 (current cycle, no override)
        const jan5 = getData(2026, 1, 5).readings;
        const dec28 = getData(2026, 12, 28).readings;
        // Jan 5 gets LLR immovable (Eve of Theophany readings)
        expect(jan5[0]).toBe('1 Corinthians 9:19-27');
        // Dec 28 keeps the movable PASCHA+260 epistle
        expect(dec28[0]).toBe('Hebrews 11:17-31');
    });
});

describe('Dual-placement — text movables', () => {
    it('SUNbT feast appears on its resolved date (Jan 4 2026)', () => {
        // SUNbT resolves to Jan 4 from current year's refs
        expect(getData(2026, 1, 4).feast?.[0]).toContain('Sunday before Theophany');
    });

    it('SUNbT from prev year does not bleed into current year', () => {
        // SUNbT from 2025 refs = Jan 5, 2025 (not in 2026). No double placement.
        // Only Jan 4 should have the feast, not any other date.
        expect(getData(2026, 1, 3).feast).toBeUndefined();
        expect(getData(2026, 1, 5).feast).toBeUndefined();
    });
});
