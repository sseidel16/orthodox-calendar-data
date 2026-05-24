/**
 * NoteRules — lengthy bilingual notes per CalendarRules.md § LengthyNotesRules.
 *
 * These are extended notes (too long for the DateBox) that get displayed in
 * NoteBoxes at the UI layer. At the data layer, they're stored as [english, greek].
 *
 * Four trigger conditions:
 * 1. PASCHA-67, PASCHA-65, PASCHA-53, PASCHA-51: "Some traditions allow for no fasting"
 * 2. Wed/Fri in Pentecostarion (PASCHA+8 through PASCHA+48): monastery fasting note
 * 3. Palm Sunday (PASCHA-7): "Some traditions allow for fish"
 * 4. Wed/Fri in 01/02-01/04 and 12/26-12/31: "Some traditions allow for no fasting"
 */

import { PhysicalDay } from '../physicalDay.js';
import { CalendarSystem } from '../calendarSystem.js';
import { dayOfYear, daysInYear, utcDate } from './dateUtils.js';

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

/** Dates where the monastery note does NOT apply (even if Wed/Fri in Pentecostarion) */
const MONASTERY_EXCLUDED_DATES = new Set(['04-23', '05-08', '05-21', '06-24']);

/**
 * Build a note map for the entire year. Returns a Map keyed by day-of-year (0-based).
 * Only days with a lengthy note will have entries.
 */
export function buildNoteMap(year: number, pascha: PhysicalDay, cal: CalendarSystem): Map<number, [string, string]> {
    const map = new Map<number, [string, string]>();
    const totalDays = daysInYear(year);

    for (let doy = 0; doy < totalDays; doy++) {
        const date = utcDate(year, 0, 1 + doy);
        const dow = date.dayOfWeek();
        const mmdd = cal.getMMDD(date);
        const offset = date.daysSince(pascha);

        // Rule 1: PASCHA-67, PASCHA-65, PASCHA-53, PASCHA-51 (no-fasting tradition days)
        if (offset === -67 || offset === -65 || offset === -53 || offset === -51) {
            map.set(doy, NOTE_NO_FASTING);
            continue;
        }

        // Rule 2: Wed/Fri during Pentecostarion (strictly between Thomas Sunday and Pentecost)
        if ((dow === 3 || dow === 5) && offset > 7 && offset < 49) {
            if (MONASTERY_EXCLUDED_DATES.has(mmdd)) continue;  // excluded fixed dates
            if (offset === 24 || offset === 38) continue;       // Mid-Pentecost and Apodosis
            map.set(doy, NOTE_MONASTERY);
            continue;
        }

        // Rule 3: Palm Sunday
        if (offset === -7) {
            map.set(doy, NOTE_PALM_SUNDAY_FISH);
            continue;
        }

        // Rule 4: Wed/Fri in the Nativity/Theophany afterfeast periods (calendar dates)
        if (dow === 3 || dow === 5) {
            const [month, day] = mmdd.split('-').map(Number);
            const inJanRange = month === 1 && day >= 2 && day <= 4;
            const inDecRange = month === 12 && day >= 26 && day <= 31;
            if (inJanRange || inDecRange) {
                map.set(doy, NOTE_NO_FASTING);
            }
        }
    }

    return map;
}
