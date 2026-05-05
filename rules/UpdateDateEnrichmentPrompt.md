# Update Data Enrichment Prompt

You are updating the Orthodox calendar data enrichment engine. The rules in `rules/CalendarRules.md` have been modified, and you need to update both the tests and the implementation to match.

## Step 1: Understand What Changed

Start by reading the current rules:

- Read `rules/CalendarRules.md` in full

Then determine what changed. If git access is available:

```bash
git diff rules/CalendarRules.md
```

If no diff is available, read the rules carefully and compare against the current test expectations and implementation to identify gaps.

## Step 2: Update Tests

Tests live in `tests/date.test.ts`. Each test validates a single date by deep-equaling the entire `EnrichedDate` output (minus the `date` field). The pattern is:

```ts
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
```

Key principles:

- **One `toEqual` per test.** The entire `EnrichedDate` shape is validated in a single deep-equal assertion. This makes it impossible to miss a field.
- **Hard-coded expected values.** Look up the actual data from the CSV files in `data/text/` to determine the correct strings. Do not guess — verify against the source data.
- **Pick dates that exercise the changed rules.** If fasting rules changed, add/update tests for dates affected by those changes. If a DRS rule changed, test the Sunday that falls in that date window for 2026.
- **Verify existing tests still hold.** Rule changes may affect dates already tested. Re-read each existing test and confirm the expected values are still correct under the new rules. Update any that are now wrong.
- **Use 2026 as the test year.** Pascha 2026 = April 12. All test dates should be in 2026 unless testing cross-year Pascha offset behavior.
- **Bilingual fields** are always `[english, greek]`. Look up both languages in the CSV files.
- **The `notes` field** is `[]` when no lengthy note applies, or `[english, greek]` when one does. Check `CalendarRules.md` NoteRules section for trigger conditions.
- **Optional fields** (`feast`, `saint`, `note` in mainText, `tone` in lowerText) must be omitted entirely when not applicable — never include them as `undefined`.

To find immovable data for a date, search `data/text/Immovables.csv` for the MM-DD pattern. To find movable data, search `data/text/Movables.csv` for the PaschaOffset. To find DRS/Special text, check `data/text/Specials.csv`.

## Step 3: Update the Implementation

The implementation files to modify:

| File | Purpose |
|------|---------|
| `src/engine/yearContext.ts` | Precomputed per-year state. Add rule data that benefits from batch computation (fasting basemap, tone cycle, DRS assignments, special assignments, note triggers). |
| `src/engine/dateEngine.ts` | The `generateSingleDate` function applies precomputed rules to individual dates. This is where `EnrichedDate` fields get populated from the `YearContext`. |
| `src/data/parser.ts` | CSV parsing. Only modify if new data fields are needed or parsing logic is wrong. |
| `src/data/pascha.ts` | Pascha offset calculation. Should already be correct — only modify if GeneralRules changed. |

### Implementation guidance

**YearContext** should precompute anything that:
- Depends on Pascha date (fasting movable overrides, tone cycle start, DRS window scanning)
- Requires iterating across the whole year (fasting basemap, tone sequence)
- Is looked up per-date but expensive to recompute (note trigger conditions)

Suggested context fields:
```ts
type YearContext = {
    year: number;
    pascha: Date;
    prevPascha: Date;
    fastingMap: Map<string, Fasting>;       // "MM-DD" -> fasting level
    toneMap: Map<string, string>;           // "MM-DD" -> tone string (Sundays only)
    drsMap: Map<string, SpecialEntry[]>;    // "MM-DD" -> DRS entries
    specialMap: Map<string, SpecialEntry[]>;// "MM-DD" -> Special entries
    noteMap: Map<string, string[]>;         // "MM-DD" -> [english, greek] note text
    eliminatorDates: Set<string>;           // "01-06", "08-06", "09-14", "12-25"
};
```

**generateSingleDate** should:
1. Format the date as "MM-DD" key
2. Compute PaschaOffset from the context
3. Look up `fasting` from `ctx.fastingMap`
4. Look up `mainText` by merging: immovables (by MM-DD) + movables (by PaschaOffset) + DRS + specials — unless the date is an eliminator date (only immovables survive)
5. Look up `tone` from `ctx.toneMap`
6. Look up `notes` from `ctx.noteMap`
7. Concatenate multi-entry fields with `\n` per language, omit empty fields entirely

### Implementation order

Follow the order presented in `rules/CalendarRules.md`. Each section in that file (GeneralRules, MainTextRules, LowerTextRules, FastingRules, NoteRules) describes a layered set of rules. Implement them in the order they appear, respecting the override hierarchy described within each section. When a section says "then apply" or "these override", the later rules overwrite earlier ones.

For rules that produce per-date lookups (fasting, tones, notes, DRS assignments), precompute them into maps in `YearContext` keyed by `"MM-DD"`. For rules that are naturally per-date (immovable/movable lookups), resolve them in `generateSingleDate`.

## Step 4: Verify

After implementation:

```bash
npm test
```

All tests should pass. If a test fails, diagnose whether:
- The test expectation is wrong (go back to Step 2)
- The implementation has a bug (fix in Step 3)

Also run the CLI to spot-check output:

```bash
node dist/cli.js date 2026-01-01
node dist/cli.js date 2026-04-12
node dist/cli.js range 2026-04-05 2026-04-19
```

Visually confirm the output looks reasonable for those liturgical dates.
