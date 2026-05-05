/**
 * NoteRules — lengthy bilingual notes triggered by PaschaOffset or date conditions.
 * Each date gets at most one note (as [english, greek]).
 */

import { dayOfYear, daysInYear, utcDate, getDow, formatMMDD, addDays, daysBetween } from './dateUtils.js';

// Note texts
const NOTE_NO_FASTING: [string, string] = [
    'Some traditions allow for no fasting on this day.',
    'Κατ\' ἄλλη ἐκδοχὴ δὲν ἔχει νηστεία αὐτὴ τὴν ἡμέρα.',
];

const NOTE_MONASTERY: [string, string] = [
    "Some monasteries, including St. Anthony's, follow fasting rules that do not permit wine and oil on Wednesdays and Fridays between Bright Week and Pentecost.",
    'Ἡ Ἱ.Μ. Ἁγ. Ἀντωνίου καὶ ἄλλα μοναστήρια ἀκολουθοῦν κανόνες, ποὺ δὲν ἐπιτρέπουν κατάλυση οἴνου καὶ ἐλαίου τὴν Τετάρτη καὶ Παρασκευὴ μετὰ τὴν διακαινήσιμο ἑβδομάδα ἕως καὶ τὴν Πεντηκοστή.',
];

const NOTE_PALM_SUNDAY_FISH: [string, string] = [
    'Some traditions allow for fish on Palm Sunday.',
    'Κατ\' ἄλλη ἐκδοχὴ ἐπιτρέπεται κατάλυσις ἰχθύος τὴν Κυριακὴ τῶν Βαΐων.',
];

// Dates that exclude the monastery note
const MONASTERY_EXCLUDED_DATES = new Set(['04-23', '05-08', '05-21', '06-24']);

export function buildNoteAssignments(year: number, pascha: Date): Map<number, [string, string]> {
    const map = new Map<number, [string, string]>();
    const totalDays = daysInYear(year);

    for (let doy = 0; doy < totalDays; doy++) {
        const date = utcDate(year, 0, 1 + doy);
        const dow = getDow(date);
        const mmdd = formatMMDD(date);
        const offset = daysBetween(pascha, date);

        // Rule 1: PaschaOffset -53 and -51
        if (offset === -53 || offset === -51) {
            map.set(doy, NOTE_NO_FASTING);
            continue;
        }

        // Rule 2: Wed/Fri when 7 < PaschaOffset < 49
        if ((dow === 3 || dow === 5) && offset > 7 && offset < 49) {
            // Exceptions by date
            if (MONASTERY_EXCLUDED_DATES.has(mmdd)) continue;
            // Exceptions by offset
            if (offset === 24 || offset === 38) continue;
            map.set(doy, NOTE_MONASTERY);
            continue;
        }

        // Rule 3: Palm Sunday (PaschaOffset -7)
        if (offset === -7) {
            map.set(doy, NOTE_PALM_SUNDAY_FISH);
            continue;
        }

        // Rule 4: Wed/Fri between 01/02-01/04 and 12/26-12/31
        if (dow === 3 || dow === 5) {
            const month = date.getUTCMonth() + 1;
            const day = date.getUTCDate();
            const inJanRange = month === 1 && day >= 2 && day <= 4;
            const inDecRange = month === 12 && day >= 26 && day <= 31;
            if (inJanRange || inDecRange) {
                map.set(doy, NOTE_NO_FASTING);
            }
        }
    }

    return map;
}
