/**
 * FastingRules — 3-layer fasting computation per CalendarRules.md § FastingRules.
 *
 * Layer 1: Basemap — Wed/Fri = STRICT, all other days = NONE
 * Layer 2: Movable overrides — Pascha-relative periods that override the basemap
 * Layer 3: Date-specific overrides — fixed calendar dates with special fasting logic
 *
 * Each layer fully overwrites the previous for affected dates.
 */

import { PhysicalDay } from '../physicalDay.js';
import { CalendarSystem } from '../calendarSystem.js';
import { dayOfYear, daysInYear, utcDate } from './dateUtils.js';
import { FastingLevel } from '../enrichedTypes.js';

/**
 * Build a fasting map for the entire year. Returns a Map keyed by day-of-year (0-based).
 * Called once per calendar system during context construction.
 */
export function buildFastingMap(year: number, pascha: PhysicalDay, cal: CalendarSystem): Map<number, FastingLevel> {
    const map = new Map<number, FastingLevel>();
    const totalDays = daysInYear(year);

    // Layer 1: Basemap — Wed/Fri strict, everything else none
    for (let doy = 0; doy < totalDays; doy++) {
        const date = utcDate(year, 0, 1 + doy);
        const dow = date.dayOfWeek();
        map.set(doy, (dow === 3 || dow === 5) ? 'STRICT' : 'NONE');
    }

    // Layer 2: Movable overrides (Pascha-relative periods)
    applyMovableOverrides(map, year, pascha);

    // Layer 3: Date-specific overrides (fixed calendar dates)
    applyDateSpecificOverrides(map, year, pascha, cal);

    return map;
}

/**
 * Layer 2: Movable fasting periods relative to Pascha.
 * Ranges: Cheese Fare, Great Lent, Bright Week, Pentecostarion, Week after Pentecost.
 */
function applyMovableOverrides(map: Map<number, FastingLevel>, year: number, pascha: PhysicalDay): void {
    for (let offset = -55; offset <= 55; offset++) {
        const date = pascha.addDays(offset);
        if (date.year() !== year) continue; // skip if offset lands outside this year
        const doy = dayOfYear(date);
        const dow = date.dayOfWeek();

        if (offset >= -55 && offset <= -49) {
            // Cheese Fare: DAIRY except Wed/Fri which get OIL
            map.set(doy, (dow === 3 || dow === 5) ? 'OIL' : 'DAIRY');
        } else if (offset >= -48 && offset <= -1) {
            // Great Lent: OIL on Sat/Sun, STRICT all other days
            map.set(doy, (dow === 0 || dow === 6) ? 'OIL' : 'STRICT');
        } else if (offset >= 0 && offset <= 6) {
            // Bright Week: no fasting
            map.set(doy, 'NONE');
        } else if (offset >= 7 && offset <= 49) {
            // Pentecostarion: OIL on Wed/Fri (except PASCHA+38 Apodosis = NONE)
            if (offset === 38) {
                map.set(doy, 'NONE');
            } else if (dow === 3 || dow === 5) {
                map.set(doy, 'OIL');
            }
            // Mon/Tue/Thu/Sat/Sun keep basemap NONE
        } else if (offset >= 50 && offset <= 55) {
            // Week after Pentecost: no fasting
            map.set(doy, 'NONE');
        }
    }
}

/**
 * Layer 3: Date-specific overrides. These are fixed calendar dates with
 * day-of-week-dependent fasting rules, plus special cases (03/09, 04/23, 06/24)
 * that also depend on Pascha proximity.
 *
 */
function applyDateSpecificOverrides(map: Map<number, FastingLevel>, year: number, pascha: PhysicalDay, cal: CalendarSystem): void {
    // Helper: get physical day-of-year, day-of-week, and Pascha offset for a calendar date.
    const getInfo = (month: number, day: number) => {
        const physDate = cal.toPhysicalDate(year, month, day);
        return { doy: dayOfYear(physDate), dow: physDate.dayOfWeek(), offset: physDate.daysSince(pascha) };
    };

    // --- STRICT Mon-Fri, OIL Sat/Sun ---
    // (Eve of Theophany, Dormition Fast, Beheading, Elevation, Eve of Nativity)
    const strictWeekdayOilWeekend = (month: number, day: number) => {
        const { doy, dow } = getInfo(month, day);
        map.set(doy, (dow === 0 || dow === 6) ? 'OIL' : 'STRICT');
    };

    strictWeekdayOilWeekend(1, 5);  // Eve of Theophany
    for (let d = 1; d <= 5; d++) strictWeekdayOilWeekend(8, d);   // Dormition Fast start
    for (let d = 7; d <= 14; d++) strictWeekdayOilWeekend(8, d);  // Dormition Fast continued
    strictWeekdayOilWeekend(8, 29);  // Beheading of St. John
    strictWeekdayOilWeekend(9, 14);  // Elevation of the Cross
    strictWeekdayOilWeekend(12, 24); // Eve of Nativity

    // --- Christmas Fast: STRICT Wed/Fri, OIL all other days ---
    // (Nov 15-20, Dec 18-23)
    const strictWFoilOthers = (month: number, day: number) => {
        const { doy, dow } = getInfo(month, day);
        map.set(doy, (dow === 3 || dow === 5) ? 'STRICT' : 'OIL');
    };

    for (let d = 15; d <= 20; d++) strictWFoilOthers(11, d);  // Nov 15-20
    for (let d = 18; d <= 23; d++) strictWFoilOthers(12, d);  // Dec 18-23

    // --- Always FISH ---
    const setFish = (m: number, d: number) => { const { doy } = getInfo(m, d); map.set(doy, 'FISH'); };
    setFish(3, 25);  // Annunciation
    setFish(8, 6);   // Transfiguration
    setFish(11, 21); // Entry of the Theotokos

    // --- Christmas Fast: STRICT Wed/Fri, OIL Mon/Tue/Thu, FISH Sat/Sun ---
    // (Nov 22-29, Dec 1-5, Dec 7-11, Dec 13-17)
    const strictWFoilWeekdayFishWeekend = (month: number, day: number) => {
        const { doy, dow } = getInfo(month, day);
        if (dow === 3 || dow === 5) map.set(doy, 'STRICT');
        else if (dow === 0 || dow === 6) map.set(doy, 'FISH');  // Sat/Sun
        else map.set(doy, 'OIL');  // Mon/Tue/Thu
    };

    for (let d = 22; d <= 29; d++) strictWFoilWeekdayFishWeekend(11, d);
    for (let d = 1; d <= 5; d++) strictWFoilWeekdayFishWeekend(12, d);
    for (let d = 7; d <= 11; d++) strictWFoilWeekdayFishWeekend(12, d);
    for (let d = 13; d <= 17; d++) strictWFoilWeekdayFishWeekend(12, d);

    // --- Always NONE (major feasts that override all fasting) ---
    const setNone = (m: number, d: number) => { const { doy } = getInfo(m, d); map.set(doy, 'NONE'); };
    setNone(1, 1);   // Circumcision / New Year
    setNone(1, 6);   // Theophany
    setNone(12, 25); // Nativity

    // --- NONE on non-Wed/Fri, OIL on Wed/Fri ---
    // (Various feast days where fasting is relaxed)
    const noneOrOilWedFri = (month: number, day: number) => {
        const { doy, dow } = getInfo(month, day);
        map.set(doy, (dow === 3 || dow === 5) ? 'OIL' : 'NONE');
    };

    for (const [m, d] of [[1,2],[1,3],[1,4],[1,7],[1,17],[1,20],[1,28],[1,30],[2,10],[5,8],[5,21],[6,30],[7,20],[7,27],[8,16],[8,24],[9,26],[10,20],[10,26],[11,8],[11,9],[11,13],[12,26],[12,27],[12,28],[12,29],[12,30],[12,31]] as [number,number][]) {
        noneOrOilWedFri(m, d);
    }

    // --- NONE on non-Wed/Fri, FISH on Wed/Fri ---
    const noneOrFishWedFri = (month: number, day: number) => {
        const { doy, dow } = getInfo(month, day);
        map.set(doy, (dow === 3 || dow === 5) ? 'FISH' : 'NONE');
    };
    noneOrFishWedFri(2, 2);   // Presentation
    noneOrFishWedFri(6, 29);  // Sts. Peter & Paul
    noneOrFishWedFri(8, 15);  // Dormition
    noneOrFishWedFri(9, 8);   // Nativity of Theotokos

    // --- OIL weekdays, FISH Sat/Sun ---
    // (Nativity Fast specific dates)
    const oilWeekdayFishWeekend = (month: number, day: number) => {
        const { doy, dow } = getInfo(month, day);
        map.set(doy, (dow === 0 || dow === 6) ? 'FISH' : 'OIL');
    };
    oilWeekdayFishWeekend(11, 25);
    oilWeekdayFishWeekend(11, 30);
    oilWeekdayFishWeekend(12, 6);
    oilWeekdayFishWeekend(12, 12);

    // --- Special cases requiring Pascha proximity awareness ---
    apply0309(map, year, pascha, cal);
    apply0423(map, year, pascha, cal);
    apply0624(map, year, pascha, cal);
    applyApostlesFast(map, year, pascha, cal);
}

/** 03/09: fasting depends on whether it falls before, during, or after first week of Lent */
function apply0309(map: Map<number, FastingLevel>, year: number, pascha: PhysicalDay, cal: CalendarSystem): void {
    const date = cal.toPhysicalDate(year, 3, 9);
    const doy = dayOfYear(date);
    const dow = date.dayOfWeek();
    const offset = date.daysSince(pascha);

    if (offset < -55) {
        // Before Cheese Fare: NONE on non-Wed/Fri, OIL on Wed/Fri
        map.set(doy, (dow === 3 || dow === 5) ? 'OIL' : 'NONE');
    } else if (offset >= -55 && offset < -48) {
        // Cheese Fare week: OIL on Wed/Fri, otherwise leave basemap (DAIRY from movable overrides)
        if (dow === 3 || dow === 5) map.set(doy, 'OIL');
    } else if (offset >= -48 && offset <= -44) {
        // First week of Great Lent: strict
        map.set(doy, 'STRICT');
    } else if (offset > -44) {
        // After first Friday of Lent: oil regardless of day
        map.set(doy, 'OIL');
    }
}

/** 04/23 (St. George): fasting depends on proximity to Pascha and Bright Week */
function apply0423(map: Map<number, FastingLevel>, year: number, pascha: PhysicalDay, cal: CalendarSystem): void {
    const date = cal.toPhysicalDate(year, 4, 23);
    const doy = dayOfYear(date);
    const dow = date.dayOfWeek();
    const offset = date.daysSince(pascha);

    if (offset < 0) {
        // Before Pascha: strict, but OIL on Sat/Sun (except Holy Saturday)
        map.set(doy, 'STRICT');
        if ((dow === 0 || dow === 6) && offset !== -1) map.set(doy, 'OIL');
    } else if (offset === 3 || offset === 5) {
        // Bright Week Wed/Fri: no fasting
        map.set(doy, 'NONE');
    } else if (offset > 7 && (dow === 3 || dow === 5)) {
        // After Thomas Sunday on Wed/Fri: oil
        map.set(doy, 'OIL');
    } else if (offset > 0 && (dow === 0 || dow === 6)) {
        // After Pascha on Sat/Sun: oil
        map.set(doy, 'OIL');
    } else if (offset >= 0) {
        // After Pascha on other days: no fasting
        map.set(doy, 'NONE');
    }
}

/** 06/24 (Nativity of St. John): depends on whether Apostles' Fast has started */
function apply0624(map: Map<number, FastingLevel>, year: number, pascha: PhysicalDay, cal: CalendarSystem): void {
    const date = cal.toPhysicalDate(year, 6, 24);
    const doy = dayOfYear(date);
    const dow = date.dayOfWeek();
    const offset = date.daysSince(pascha);

    if (offset < 57) {
        // Before Apostles' Fast: NONE on non-Wed/Fri, OIL on Wed/Fri
        map.set(doy, (dow === 3 || dow === 5) ? 'OIL' : 'NONE');
    } else {
        // During Apostles' Fast: OIL on Wed/Fri, FISH on Mon/Tue/Thu
        // Sat/Sun keeps the general Apostles Fast rule (FISH) — don't override
        if (dow === 3 || dow === 5) map.set(doy, 'OIL');
        else if (dow === 1 || dow === 2 || dow === 4) map.set(doy, 'FISH');
    }
}

/** Apostles' Fast: PASCHA+57 through Jun 28 (day before Sts. Peter & Paul) */
function applyApostlesFast(map: Map<number, FastingLevel>, year: number, pascha: PhysicalDay, cal: CalendarSystem): void {
    const startDate = pascha.addDays(57);  // Monday after All Saints
    const endDate = cal.toPhysicalDate(year, 6, 28);

    if (startDate.year() !== year) return;

    // 06/24 physical date — skip it since it has its own rule
    const jun24Phys = cal.toPhysicalDate(year, 6, 24);
    const jun24Doy = dayOfYear(jun24Phys);

    let current = startDate;
    while (current.isOnOrBefore(endDate) && current.year() === year) {
        const doy = dayOfYear(current);
        if (doy !== jun24Doy) {  // 06/24 has its own rule applied separately
            const dow = current.dayOfWeek();
            if (dow === 3 || dow === 5) map.set(doy, 'STRICT');       // Wed/Fri
            else if (dow === 0 || dow === 6) map.set(doy, 'FISH');  // Sat/Sun
            else map.set(doy, 'OIL');                                // Mon/Tue/Thu
        }
        current = current.addDays(1);
    }
}
