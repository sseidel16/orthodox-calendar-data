/**
 * Data layer types produced by the rules engine.
 * These are separate from the UI types in types.ts.
 */

export type EnrichedDateData = {
    date: number;
    fasting: 'NONE' | 'DAIRY' | 'FISH' | 'OIL' | 'STRICT';
    lengthyNotes: string[]; // [] or [english, greek]
    feast?: string[];       // [english, greek]
    saint?: string[];       // [english, greek]
    note?: string[];        // [english, greek]
    tone?: string;
    readings: string[];
};

export type FastingLevel = 'NONE' | 'DAIRY' | 'FISH' | 'OIL' | 'STRICT';
export type MoonPhase = 'NONE' | 'NEW' | 'FIRST' | 'FULL' | 'LAST';
