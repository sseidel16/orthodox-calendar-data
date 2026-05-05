/**
 * FastingRules — 3-layer fasting computation.
 * Layer 1: Basemap (day-of-week)
 * Layer 2: Movable overrides (PaschaOffset ranges)
 * Layer 3: Date-specific overrides
 */

import { dayOfYear, daysInYear, utcDate, getDow, formatMMDD, addDays, daysBetween } from './dateUtils.js';

export type FastingLevel = 'NONE' | 'DAIRY' | 'FISH' | 'OIL' | 'STRICT';

export function buildFastingMap(year: number, pascha: Date): Map<number, FastingLevel> {
    const map = new Map<number, FastingLevel>();
    const totalDays = daysInYear(year);

    // Layer 1: Basemap
    for (let doy = 0; doy < totalDays; doy++) {
        const date = utcDate(year, 0, 1 + doy);
        const dow = getDow(date);
        // Wed=3, Fri=5 are STRICT; everything else NONE
        map.set(doy, (dow === 3 || dow === 5) ? 'STRICT' : 'NONE');
    }

    // Layer 2: Movable overrides (by PaschaOffset)
    applyMovableOverrides(map, year, pascha);

    // Layer 3: Date-specific overrides
    applyDateSpecificOverrides(map, year, pascha);

    return map;
}

function applyMovableOverrides(map: Map<number, FastingLevel>, year: number, pascha: Date): void {
    for (let offset = -55; offset <= 55; offset++) {
        const date = addDays(pascha, offset);
        if (date.getUTCFullYear() !== year) continue;
        const doy = dayOfYear(date);
        const dow = getDow(date);

        if (offset >= -55 && offset <= -49) {
            // Cheese Fare: DAIRY on non-Wed/Fri, OIL on Wed/Fri
            map.set(doy, (dow === 3 || dow === 5) ? 'OIL' : 'DAIRY');
        } else if (offset >= -48 && offset <= -1) {
            // Great Lent: OIL on Sat/Sun, STRICT otherwise
            map.set(doy, (dow === 0 || dow === 6) ? 'OIL' : 'STRICT');
        } else if (offset >= 0 && offset <= 6) {
            // Bright Week: NONE
            map.set(doy, 'NONE');
        } else if (offset >= 7 && offset <= 49) {
            // Pentecostarion: only specific overrides
            if (offset === 24) map.set(doy, 'OIL');
            else if (offset === 38) map.set(doy, 'NONE');
            // Otherwise basemap holds
        } else if (offset >= 50 && offset <= 55) {
            // Week after Pentecost: NONE
            map.set(doy, 'NONE');
        }
    }
}

function applyDateSpecificOverrides(map: Map<number, FastingLevel>, year: number, pascha: Date): void {
    // Helper to set fasting for a specific MM-DD
    const setDate = (month: number, day: number, level: FastingLevel) => {
        const date = utcDate(year, month - 1, day);
        if (date.getUTCFullYear() === year) {
            map.set(dayOfYear(date), level);
        }
    };

    const getFasting = (month: number, day: number): { doy: number; dow: number; offset: number } => {
        const date = utcDate(year, month - 1, day);
        const doy = dayOfYear(date);
        const dow = getDow(date);
        const offset = daysBetween(pascha, date);
        return { doy, dow, offset };
    };

    // --- STRICT Mon-Fri, OIL Sat/Sun ---
    const strictWeekdayOilWeekend = (month: number, day: number) => {
        const { doy, dow } = getFasting(month, day);
        map.set(doy, (dow === 0 || dow === 6) ? 'OIL' : 'STRICT');
    };

    strictWeekdayOilWeekend(1, 5);
    for (let d = 1; d <= 5; d++) strictWeekdayOilWeekend(8, d);
    for (let d = 7; d <= 14; d++) strictWeekdayOilWeekend(8, d);
    strictWeekdayOilWeekend(8, 29);
    strictWeekdayOilWeekend(9, 14);
    strictWeekdayOilWeekend(12, 24);

    // --- STRICT on MWF, OIL on Tu/Th/Sat/Sun ---
    const strictMWFoilOthers = (month: number, day: number) => {
        const { doy, dow } = getFasting(month, day);
        map.set(doy, (dow === 1 || dow === 3 || dow === 5) ? 'STRICT' : 'OIL');
    };

    for (let d = 15; d <= 20; d++) strictMWFoilOthers(11, d);
    for (let d = 18; d <= 23; d++) strictMWFoilOthers(12, d);

    // --- Always FISH ---
    setDate(3, 25, 'FISH');
    setDate(8, 6, 'FISH');
    setDate(11, 21, 'FISH');

    // --- STRICT MWF, OIL Tu/Th, FISH Sat/Sun ---
    const strictMWFoilTuThFishWeekend = (month: number, day: number) => {
        const { doy, dow } = getFasting(month, day);
        if (dow === 1 || dow === 3 || dow === 5) map.set(doy, 'STRICT');
        else if (dow === 2 || dow === 4) map.set(doy, 'OIL');
        else map.set(doy, 'FISH'); // Sat/Sun
    };

    for (let d = 22; d <= 29; d++) strictMWFoilTuThFishWeekend(11, d);
    for (let d = 1; d <= 5; d++) strictMWFoilTuThFishWeekend(12, d);
    for (let d = 7; d <= 11; d++) strictMWFoilTuThFishWeekend(12, d);
    for (let d = 13; d <= 17; d++) strictMWFoilTuThFishWeekend(12, d);

    // --- Always NONE ---
    setDate(1, 1, 'NONE');
    setDate(1, 6, 'NONE');
    setDate(12, 25, 'NONE');

    // --- NONE on non-Wed/Fri, OIL on Wed/Fri ---
    const noneOrOilWedFri = (month: number, day: number) => {
        const { doy, dow } = getFasting(month, day);
        map.set(doy, (dow === 3 || dow === 5) ? 'OIL' : 'NONE');
    };

    const noneOrOilDates: [number, number][] = [
        [1,2],[1,3],[1,4],[1,7],[1,17],[1,20],[1,28],[1,30],
        [2,10],[5,8],[5,21],[6,30],[7,20],[7,27],
        [8,16],[8,24],[9,26],[10,20],[10,26],[11,8],[11,9],
    ];
    for (const [m, d] of noneOrOilDates) noneOrOilWedFri(m, d);

    // --- NONE on non-Wed/Fri, FISH on Wed/Fri ---
    const noneOrFishWedFri = (month: number, day: number) => {
        const { doy, dow } = getFasting(month, day);
        map.set(doy, (dow === 3 || dow === 5) ? 'FISH' : 'NONE');
    };

    // 02/02 has a ? in the rules but we include it
    noneOrFishWedFri(2, 2);
    noneOrFishWedFri(6, 29);
    noneOrFishWedFri(8, 15);
    noneOrFishWedFri(9, 8);

    // --- OIL on weekdays, FISH on Sat/Sun ---
    const oilWeekdayFishWeekend = (month: number, day: number) => {
        const { doy, dow } = getFasting(month, day);
        map.set(doy, (dow === 0 || dow === 6) ? 'FISH' : 'OIL');
    };

    oilWeekdayFishWeekend(11, 25);
    oilWeekdayFishWeekend(11, 30);
    oilWeekdayFishWeekend(12, 6);
    oilWeekdayFishWeekend(12, 12);

    // --- Special cases: 03/09, 04/23, 06/24 ---
    apply0309(map, year, pascha);
    apply0423(map, year, pascha);
    apply0624(map, year, pascha);

    // --- Apostles' Fast (PaschaOffset > 56 and before 06/29) ---
    applyApostlesFast(map, year, pascha);
}

function apply0309(map: Map<number, FastingLevel>, year: number, pascha: Date): void {
    const date = utcDate(year, 2, 9); // March 9
    const doy = dayOfYear(date);
    const dow = getDow(date);
    const offset = daysBetween(pascha, date);

    if (offset < -48) {
        // Before Clean Monday
        map.set(doy, (dow === 3 || dow === 5) ? 'OIL' : 'NONE');
    } else if (offset >= -48 && offset <= -44) {
        // First week of Great Lent (Mon-Fri)
        map.set(doy, 'STRICT');
    } else if (offset > -44) {
        // After first Friday of Great Lent
        map.set(doy, 'OIL');
    }
}

function apply0423(map: Map<number, FastingLevel>, year: number, pascha: Date): void {
    const date = utcDate(year, 3, 23); // April 23
    const doy = dayOfYear(date);
    const dow = getDow(date);
    const offset = daysBetween(pascha, date);

    if (offset < 0) {
        // Before Pascha: STRICT on weekdays or Holy Saturday
        map.set(doy, 'STRICT');
    } else if (offset === 3 || offset === 5) {
        // Bright week Wed/Fri
        map.set(doy, 'NONE');
    } else if (offset > 7 && (dow === 3 || dow === 5)) {
        // After Thomas Sunday, Wed or Fri
        map.set(doy, 'OIL');
    } else if (offset > 0 && (dow === 0 || dow === 6) && offset !== -1) {
        // After Pascha on Sat/Sun (not Holy Saturday)
        map.set(doy, 'OIL');
    } else if (offset > 0) {
        // After Pascha on Mon/Tue/Thu/Sat/Sun
        map.set(doy, 'NONE');
    }
}

function apply0624(map: Map<number, FastingLevel>, year: number, pascha: Date): void {
    const date = utcDate(year, 5, 24); // June 24
    const doy = dayOfYear(date);
    const dow = getDow(date);
    const offset = daysBetween(pascha, date);

    if (offset < 57) {
        // Before Monday after All Saints
        map.set(doy, (dow === 3 || dow === 5) ? 'OIL' : 'NONE');
    } else {
        // On or after Monday after All Saints (during Apostles' Fast)
        map.set(doy, 'OIL');
    }
}

function applyApostlesFast(map: Map<number, FastingLevel>, year: number, pascha: Date): void {
    // PaschaOffset > 56 and before 06/29
    const startDate = addDays(pascha, 57); // Day after All Saints
    const endDate = utcDate(year, 5, 28); // June 28 (day before 06/29)

    if (startDate.getUTCFullYear() !== year) return;

    const current = new Date(startDate);
    while (current.getTime() <= endDate.getTime() && current.getUTCFullYear() === year) {
        const mmdd = formatMMDD(current);
        // Exception: 06/24 has its own rule (applied separately above)
        if (mmdd !== '06-24') {
            const doy = dayOfYear(current);
            const dow = getDow(current);
            if (dow === 1 || dow === 3 || dow === 5) map.set(doy, 'STRICT');
            else if (dow === 2 || dow === 4) map.set(doy, 'OIL');
            else map.set(doy, 'FISH'); // Sat/Sun
        }
        current.setUTCDate(current.getUTCDate() + 1);
    }
}
