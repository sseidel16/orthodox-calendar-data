import { getPaschaDate, getPaschaOffset } from '../data/pascha.js';
import { MovableEntry, SpecialEntry } from '../data/parser.js';
import {
    buildFastingMap,
    buildToneMap,
    buildDrsAssignments,
    buildSpecialAssignments,
    buildNoteAssignments,
    buildMoonMap,
    getMovablesIndex,
    type FastingLevel,
    type MoonPhase,
} from './rules/index.js';

/**
 * Precomputed context for a calendar year.
 * Built once, then shared across all date generation within that year.
 */
export type YearContext = {
    year: number;
    pascha: Date;
    prevPascha: Date;

    // Fasting: day-of-year -> fasting level
    fastingMap: Map<number, FastingLevel>;

    // Tones: day-of-year -> tone string (Sundays only)
    toneMap: Map<number, string>;

    // DRS: "MM-DD" -> SpecialEntry[]
    drsAssignments: Map<string, SpecialEntry[]>;

    // Specials: "MM-DD" -> SpecialEntry[]
    specialAssignments: Map<string, SpecialEntry[]>;

    // Notes: day-of-year -> [english, greek]
    noteAssignments: Map<number, [string, string]>;

    // Moon phases: day-of-year -> phase
    moonMap: Map<number, MoonPhase>;

    // Movables indexed by PaschaOffset (static, but stored here for convenience)
    movablesByOffset: Map<number, MovableEntry[]>;
};

/**
 * Build a YearContext with all precomputed data for a given year.
 * @param timezone - IANA timezone for moon phase date assignment (default: America/Phoenix)
 */
export function buildYearContext(year: number, timezone?: string): YearContext {
    const pascha = getPaschaDate(year);
    const prevPascha = getPaschaDate(year - 1);

    return {
        year,
        pascha,
        prevPascha,
        fastingMap: buildFastingMap(year, pascha),
        toneMap: buildToneMap(year, pascha, prevPascha),
        drsAssignments: buildDrsAssignments(year),
        specialAssignments: buildSpecialAssignments(year),
        noteAssignments: buildNoteAssignments(year, pascha),
        moonMap: buildMoonMap(year, timezone),
        movablesByOffset: getMovablesIndex(),
    };
}

/**
 * Get the PaschaOffset for a date using the precomputed year context.
 */
export function getPaschaOffsetFromCtx(date: Date, ctx: YearContext): number {
    return getPaschaOffset(date, ctx.year);
}
