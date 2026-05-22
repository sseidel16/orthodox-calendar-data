/**
 * MoonRules — computes the 4 key lunar phases using the Meeus algorithm.
 * Accurate to within ~2 minutes. Date assignment uses a configurable timezone.
 *
 * Reference: Jean Meeus, "Astronomical Algorithms", Chapter 49
 */

import { daysInYear, utcDate, dayOfYear } from './dateUtils.js';
import { MoonPhase } from '../enrichedTypes.js';

/** Default timezone for determining which date a phase falls on */
const DEFAULT_TIMEZONE = 'America/Phoenix';

/**
 * Build a map of day-of-year -> MoonPhase for all phases in a year.
 * Uses the Meeus algorithm to find exact phase times, then assigns
 * them to dates in the specified timezone.
 */
export function buildMoonMap(year: number, timezone: string = DEFAULT_TIMEZONE): Map<number, MoonPhase> {
    const map = new Map<number, MoonPhase>();
    const phases = computePhasesForYear(year);

    for (const { date, phase } of phases) {
        // Convert UTC instant to a date in the target timezone
        const localDate = getDateInTimezone(date, timezone);
        if (localDate.getFullYear() !== year) continue;

        const doy = dayOfYear(utcDate(year, localDate.getMonth(), localDate.getDate()));
        map.set(doy, phase);
    }

    return map;
}

type PhaseResult = { date: Date; phase: MoonPhase };

/**
 * Compute all 4 phase types for every lunation that overlaps the given year.
 */
function computePhasesForYear(year: number): PhaseResult[] {
    const results: PhaseResult[] = [];

    // Approximate lunation number for Jan 1 of the year
    // (lunation 0 = first new moon of year 2000, Jan 6)
    const k0 = Math.floor((year - 2000) * 12.3685);

    // Check lunations from a bit before the year to a bit after
    for (let k = k0 - 1; k <= k0 + 14; k++) {
        results.push({ date: computePhaseJDE(k, 0), phase: 'NEW' });
        results.push({ date: computePhaseJDE(k, 0.25), phase: 'FIRST' });
        results.push({ date: computePhaseJDE(k, 0.5), phase: 'FULL' });
        results.push({ date: computePhaseJDE(k, 0.75), phase: 'LAST' });
    }

    return results;
}

/**
 * Meeus algorithm: compute the Julian Ephemeris Date of a moon phase.
 * @param k - Lunation number (integer = new moon, +0.25 = first quarter, etc.)
 * @param phaseOffset - 0, 0.25, 0.5, or 0.75
 */
function computePhaseJDE(k: number, phaseOffset: number): Date {
    const kp = k + phaseOffset;
    const T = kp / 1236.85;
    const T2 = T * T;
    const T3 = T2 * T;
    const T4 = T3 * T;

    // Mean phase JDE (Meeus eq. 49.1)
    let JDE = 2451550.09766 + 29.530588861 * kp
        + 0.00015437 * T2
        - 0.000000150 * T3
        + 0.00000000073 * T4;

    // Sun's mean anomaly (eq. 49.4)
    const M = deg2rad(2.5534 + 29.10535670 * kp
        - 0.0000014 * T2
        - 0.00000011 * T3);

    // Moon's mean anomaly (eq. 49.5)
    const Mp = deg2rad(201.5643 + 385.81693528 * kp
        + 0.0107582 * T2
        + 0.00001238 * T3
        - 0.000000058 * T4);

    // Moon's argument of latitude (eq. 49.6)
    const F = deg2rad(160.7108 + 390.67050284 * kp
        - 0.0016118 * T2
        - 0.00000227 * T3
        + 0.000000011 * T4);

    // Longitude of ascending node (eq. 49.7)
    const Omega = deg2rad(124.7746 - 1.56375588 * kp
        + 0.0020672 * T2
        + 0.00000215 * T3);

    // Correction terms
    const E = 1 - 0.002516 * T - 0.0000074 * T2;
    const E2 = E * E;

    let correction: number;

    if (phaseOffset === 0) {
        // New Moon corrections
        correction = -0.40720 * Math.sin(Mp)
            + 0.17241 * E * Math.sin(M)
            + 0.01608 * Math.sin(2 * Mp)
            + 0.01039 * Math.sin(2 * F)
            + 0.00739 * E * Math.sin(Mp - M)
            - 0.00514 * E * Math.sin(Mp + M)
            + 0.00208 * E2 * Math.sin(2 * M)
            - 0.00111 * Math.sin(Mp - 2 * F)
            - 0.00057 * Math.sin(Mp + 2 * F)
            + 0.00056 * E * Math.sin(2 * Mp + M)
            - 0.00042 * Math.sin(3 * Mp)
            + 0.00042 * E * Math.sin(M + 2 * F)
            + 0.00038 * E * Math.sin(M - 2 * F)
            - 0.00024 * E * Math.sin(2 * Mp - M)
            - 0.00017 * Math.sin(Omega)
            - 0.00007 * Math.sin(Mp + 2 * M)
            + 0.00004 * Math.sin(2 * Mp - 2 * F)
            + 0.00004 * Math.sin(3 * M)
            + 0.00003 * Math.sin(Mp + M - 2 * F)
            + 0.00003 * Math.sin(2 * Mp + 2 * F)
            - 0.00003 * Math.sin(Mp + M + 2 * F)
            + 0.00003 * Math.sin(Mp - M + 2 * F)
            - 0.00002 * Math.sin(Mp - M - 2 * F)
            - 0.00002 * Math.sin(3 * Mp + M)
            + 0.00002 * Math.sin(4 * Mp);
    } else if (phaseOffset === 0.5) {
        // Full Moon corrections
        correction = -0.40614 * Math.sin(Mp)
            + 0.17302 * E * Math.sin(M)
            + 0.01614 * Math.sin(2 * Mp)
            + 0.01043 * Math.sin(2 * F)
            + 0.00734 * E * Math.sin(Mp - M)
            - 0.00515 * E * Math.sin(Mp + M)
            + 0.00209 * E2 * Math.sin(2 * M)
            - 0.00111 * Math.sin(Mp - 2 * F)
            - 0.00057 * Math.sin(Mp + 2 * F)
            + 0.00056 * E * Math.sin(2 * Mp + M)
            - 0.00042 * Math.sin(3 * Mp)
            + 0.00042 * E * Math.sin(M + 2 * F)
            + 0.00038 * E * Math.sin(M - 2 * F)
            - 0.00024 * E * Math.sin(2 * Mp - M)
            - 0.00017 * Math.sin(Omega)
            - 0.00007 * Math.sin(Mp + 2 * M)
            + 0.00004 * Math.sin(2 * Mp - 2 * F)
            + 0.00004 * Math.sin(3 * M)
            + 0.00003 * Math.sin(Mp + M - 2 * F)
            + 0.00003 * Math.sin(2 * Mp + 2 * F)
            - 0.00003 * Math.sin(Mp + M + 2 * F)
            + 0.00003 * Math.sin(Mp - M + 2 * F)
            - 0.00002 * Math.sin(Mp - M - 2 * F)
            - 0.00002 * Math.sin(3 * Mp + M)
            + 0.00002 * Math.sin(4 * Mp);
    } else {
        // First and Last Quarter corrections
        correction = -0.62801 * Math.sin(Mp)
            + 0.17172 * E * Math.sin(M)
            - 0.01183 * E * Math.sin(Mp + M)
            + 0.00862 * Math.sin(2 * Mp)
            + 0.00804 * Math.sin(2 * F)
            + 0.00454 * E * Math.sin(Mp - M)
            + 0.00204 * E2 * Math.sin(2 * M)
            - 0.00180 * Math.sin(Mp - 2 * F)
            - 0.00070 * Math.sin(Mp + 2 * F)
            - 0.00040 * Math.sin(3 * Mp)
            - 0.00034 * E * Math.sin(2 * Mp - M)
            + 0.00032 * E * Math.sin(M + 2 * F)
            + 0.00032 * E * Math.sin(M - 2 * F)
            - 0.00028 * E2 * Math.sin(Mp + 2 * M)
            + 0.00027 * E * Math.sin(2 * Mp + M)
            - 0.00017 * Math.sin(Omega)
            - 0.00005 * Math.sin(Mp - M - 2 * F)
            + 0.00004 * Math.sin(2 * Mp + 2 * F)
            - 0.00004 * Math.sin(Mp + M + 2 * F)
            + 0.00004 * Math.sin(Mp - 2 * M)
            + 0.00003 * Math.sin(Mp + M - 2 * F)
            + 0.00003 * Math.sin(3 * M)
            + 0.00002 * Math.sin(2 * Mp - 2 * F)
            + 0.00002 * Math.sin(Mp - M + 2 * F)
            - 0.00002 * Math.sin(3 * Mp + M);

        // Additional quarter correction (W term)
        const W = 0.00306
            - 0.00038 * E * Math.cos(M)
            + 0.00026 * Math.cos(Mp)
            - 0.00002 * Math.cos(Mp - M)
            + 0.00002 * Math.cos(Mp + M)
            + 0.00002 * Math.cos(2 * F);

        correction += (phaseOffset === 0.25) ? W : -W;
    }

    JDE += correction;

    // Convert JDE to JavaScript Date
    return jdeToDate(JDE);
}

/** Convert Julian Ephemeris Date to JavaScript Date */
function jdeToDate(jde: number): Date {
    // JDE 2440587.5 = Unix epoch (Jan 1, 1970 00:00 UTC)
    const ms = (jde - 2440587.5) * 86400000;
    return new Date(ms);
}

/** Convert degrees to radians */
function deg2rad(deg: number): number {
    return deg * Math.PI / 180;
}

/**
 * Get the local date (year, month, day) for a UTC instant in a given timezone.
 * Handles DST transitions correctly via the Intl API.
 */
function getDateInTimezone(date: Date, timezone: string): { getFullYear(): number; getMonth(): number; getDate(): number } {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(date);

    const year = parseInt(parts.find(p => p.type === 'year')!.value);
    const month = parseInt(parts.find(p => p.type === 'month')!.value) - 1;
    const day = parseInt(parts.find(p => p.type === 'day')!.value);

    return { getFullYear: () => year, getMonth: () => month, getDate: () => day };
}
