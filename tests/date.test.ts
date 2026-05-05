import { describe, it, expect } from 'vitest';
import { getDate } from '../src/api/range.js';
import { EnrichedDate } from '../src/engine/dateEngine.js';

function d(dateStr: string): Date {
    return new Date(dateStr + 'T00:00:00Z');
}

function enriched(dateStr: string): EnrichedDate {
    return getDate(d(dateStr));
}

/** Strip the `date` field (Date object) for clean deep-equal comparisons */
function data(dateStr: string): Omit<EnrichedDate, 'date'> {
    const { date, ...rest } = enriched(dateStr);
    return rest;
}

describe('Jan 1, 2026 (Thursday) — Circumcision, Basil, New Year', () => {
    it('generates correct data', () => {
        expect(data('2026-01-01')).toEqual({
            paschaOffset: 256,
            newDate: 1,
            oldDate: 19,
            fasting: 'NONE',
            moon: 'NONE',
            notes: [],
            mainText: {
                feast: [
                    'Circumcision of Our Lord Jesus Christ',
                    'Ἡ Περιτομὴ τοῦ Κυρίου ἡμῶν Ἰησοῦ Χριστοῦ',
                ],
                saint: [
                    'Basil the Great\nGregory, bishop of Nazianzus',
                    'Βασιλείου τοῦ Μεγάλου\nΓρηγορίου ἐπισκόπου Ναζιανζοῦ',
                ],
                note: [
                    "New Year\u2019s Day",
                    'Πρωτοχρονιά',
                ],
            },
            lowerText: {
                readings: [],
            },
        });
    });
});

describe('Jan 18, 2026 (Sunday) — 12th Sunday of Luke, PaschaOffset -84', () => {
    it('generates correct data', () => {
        expect(data('2026-01-18')).toEqual({
            paschaOffset: -84,
            newDate: 18,
            oldDate: 5,
            fasting: 'NONE',
            moon: 'NEW',
            notes: [],
            mainText: {
                feast: [
                    '12th Sunday of Luke',
                    'ΙΒ΄ Λουκᾶ',
                ],
                saint: [
                    'Patriarchs Athanasios & Cyril of Alexandria\nMartyr Theodula',
                    'Ἀθανασίου & Κυρίλλου, Πατρ. Ἀλεξανδρείας\nΘεοδούλης μάρτυρος',
                ],
            },
            lowerText: {
                tone: 'Grave Tone',
                readings: [],
            },
        });
    });
});

describe('Feb 23, 2026 (Monday) — Clean Monday, PaschaOffset -48', () => {
    it('generates correct data', () => {
        expect(data('2026-02-23')).toEqual({
            paschaOffset: -48,
            newDate: 23,
            oldDate: 10,
            fasting: 'STRICT',
            moon: 'NONE',
            notes: [],
            mainText: {
                saint: [
                    'Polycarp, bishop of Smyrna\nVen. Gorgonia',
                    'Πολυκάρπου, ἐπισκ. Σμύρνης\nΓοργονίας ὁσίας',
                ],
                note: [
                    'Beginning of Lent\nClean Monday',
                    'Ἀρχὴ νηστείας\nΚαθαρὰ Δευτέρα',
                ],
            },
            lowerText: {
                readings: [],
            },
        });
    });
});

describe('Mar 25, 2026 (Wednesday) — Annunciation, PaschaOffset -18', () => {
    it('generates correct data', () => {
        expect(data('2026-03-25')).toEqual({
            paschaOffset: -18,
            newDate: 25,
            oldDate: 12,
            fasting: 'FISH',
            moon: 'FIRST',
            notes: [],
            mainText: {
                feast: [
                    'Annunciation of the Theotokos',
                    'Ὁ Εὐαγγελισμὸς τῆς Θεοτόκου',
                ],
            },
            lowerText: {
                readings: [],
            },
        });
    });
});

describe('Apr 5, 2026 (Sunday) — Palm Sunday, PaschaOffset -7', () => {
    it('generates correct data', () => {
        expect(data('2026-04-05')).toEqual({
            paschaOffset: -7,
            newDate: 5,
            oldDate: 23,
            fasting: 'OIL',
            moon: 'NONE',
            notes: [
                'Some traditions allow for fish on Palm Sunday.',
                'Κατ\' ἄλλη ἐκδοχὴ ἐπιτρέπεται κατάλυσις ἰχθύος τὴν Κυριακὴ τῶν Βαΐων.',
            ],
            mainText: {
                feast: [
                    'Palm Sunday',
                    'Τῶν Βαΐων',
                ],
                saint: [
                    'Martyr Claudios & his companions\nVen. Theodora of Thessalonica',
                    'Κλαυδίου μάρτ. & τῶν σὺν αὐτῷ\nΘεοδώρας, ὁσίας τῆς Θεσσαλονίκης',
                ],
            },
            lowerText: {
                readings: [],
            },
        });
    });
});

describe('Apr 12, 2026 (Sunday) — Pascha, PaschaOffset 0', () => {
    it('generates correct data', () => {
        expect(data('2026-04-12')).toEqual({
            paschaOffset: 0,
            newDate: 12,
            oldDate: 30,
            fasting: 'NONE',
            moon: 'NONE',
            notes: [],
            mainText: {
                feast: [
                    'Holy Pascha - The Resurrection of Christ',
                    'Τὸ Ἅγιον Πάσχα - Ἡ Ἀνάστασις τοῦ Κυρίου',
                ],
                saint: [
                    'Basil the Confessor\nAnthousa of Constantinople',
                    'Βασιλείου τοῦ ὁμολογητοῦ\nἈνθούσης ΚΠόλεως',
                ],
            },
            lowerText: {
                readings: [],
            },
        });
    });
});

describe('Apr 26, 2026 (Sunday) — Myrrh-bearers, PaschaOffset +14, 2nd Tone', () => {
    it('generates correct data', () => {
        expect(data('2026-04-26')).toEqual({
            paschaOffset: 14,
            newDate: 26,
            oldDate: 13,
            fasting: 'NONE',
            moon: 'NONE',
            notes: [],
            mainText: {
                feast: [
                    'Sunday of the Myrrh-bearers',
                    'Τῶν Μυροφόρων',
                ],
                saint: [
                    'Hieromartyr Basil, bishop of Amasea\nGlaphyra of Nicomedia',
                    'Βασιλέως ἱερομ., ἐπ. Ἀμασείας\nΓλαφύρας τῆς Νικομηδείας',
                ],
            },
            lowerText: {
                tone: '2nd Tone',
                readings: [],
            },
        });
    });
});

describe('Apr 29, 2026 (Wednesday) — Pentecostarion, PaschaOffset +17, lengthy note', () => {
    it('generates correct data', () => {
        expect(data('2026-04-29')).toEqual({
            paschaOffset: 17,
            newDate: 29,
            oldDate: 16,
            fasting: 'STRICT',
            moon: 'NONE',
            notes: [
                'Some monasteries, including St. Anthony\'s, follow fasting rules that do not permit wine and oil on Wednesdays and Fridays between Bright Week and Pentecost.',
                'Ἡ Ἱ.Μ. Ἁγ. Ἀντωνίου καὶ ἄλλα μοναστήρια ἀκολουθοῦν κανόνες, ποὺ δὲν ἐπιτρέπουν κατάλυση οἴνου καὶ ἐλαίου τὴν Τετάρτη καὶ Παρασκευὴ μετὰ τὴν διακαινήσιμο ἑβδομάδα ἕως καὶ τὴν Πεντηκοστή.',
            ],
            mainText: {
                saint: [
                    'Apostles Jason and Sosipater of the 70\nMetr. Basil of Ostrog',
                    'Ἰάσωνος & Σωσιπάτρου, ἐκ τῶν 70 ἀποστόλων\nΒασιλείου, μητροπ. Ὀστρόγκ',
                ],
            },
            lowerText: {
                readings: [],
            },
        });
    });
});

describe('May 31, 2026 (Sunday) — Pentecost, PaschaOffset +49, tone skipped', () => {
    it('generates correct data', () => {
        expect(data('2026-05-31')).toEqual({
            paschaOffset: 49,
            newDate: 31,
            oldDate: 18,
            fasting: 'NONE',
            moon: 'FULL',
            notes: [],
            mainText: {
                feast: [
                    'Pentecost',
                    'Πεντηκοστή',
                ],
                saint: [
                    'Martyr Hermias\nFive martyrs of Ascalon',
                    'Ἑρμείου μάρτυρος\nΤῶν ἐν Ἀσκάλωνι 5 μαρτύρων',
                ],
            },
            lowerText: {
                readings: [],
            },
        });
    });
});

describe('Sep 14, 2026 (Monday) — Elevation of the Cross, eliminates movables', () => {
    it('generates correct data', () => {
        expect(data('2026-09-14')).toEqual({
            paschaOffset: 155,
            newDate: 14,
            oldDate: 1,
            fasting: 'STRICT',
            moon: 'NONE',
            notes: [],
            mainText: {
                feast: [
                    'Elevation of the Precious and Life-Giving Cross',
                    'Ἡ Ὕψωσις τοῦ Τιμίου καὶ Ζωοποιοῦ Σταυροῦ',
                ],
            },
            lowerText: {
                readings: [],
            },
        });
    });
});

describe('Dec 25, 2026 (Friday) — Nativity, eliminates movables', () => {
    it('generates correct data', () => {
        expect(data('2026-12-25')).toEqual({
            paschaOffset: 257,
            newDate: 25,
            oldDate: 12,
            fasting: 'NONE',
            moon: 'NONE',
            notes: [],
            mainText: {
                feast: [
                    'Nativity according to the flesh of our Lord, God and Saviour Jesus Christ',
                    'Ἡ κατὰ σάρκα Γέννησις τοῦ Κυρίου καὶ Θεοῦ καὶ Σωτῆρος ἡμῶν Ἰησοῦ Χριστοῦ',
                ],
            },
            lowerText: {
                readings: [],
            },
        });
    });
});
