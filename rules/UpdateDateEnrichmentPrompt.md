# Update Data Enrichment Prompt

You are updating the Orthodox calendar data enrichment engine. The rules in `rules/CalendarRules.md` have been modified, and you need to update both the tests and the implementation to match.

## Step 1: Understand What Changed

Read `rules/CalendarRules.md` in full, then determine what changed:

```bash
git diff rules/CalendarRules.md
```

If no diff is available, compare the rules against test expectations and implementation to identify gaps.

## Step 2: Update Tests

Tests live in `tests/date.test.ts`. They test the data layer directly:

```ts
import { generateData, generateDataRange, GREGORIAN, JULIAN } from '../src/index.js';

// Single date — returns EnrichedDateData
const result = generateData(2026, 4, 12, GREGORIAN);
expect(result.feast[0]).toContain('Pascha');

// Old calendar date (Julian Mar 25 = physical Apr 7)
const old = generateData(2026, 3, 25, JULIAN);
expect(old.feast[0]).toContain('Annunciation');

// Range
const range = generateDataRange({year: 2026, month: 1, day: 1}, {year: 2026, month: 12, day: 31}, GREGORIAN);
```

Key principles:

- **Pick dates that exercise the changed rules.** If fasting rules changed, test affected dates. If a movable reference rule changed, test the dates that fall in that window for the test year.
- **Use 2026 as the primary test year.** Pascha 2026 = April 12 (both calendars).
- **Verify existing tests still hold.** Rule changes may affect dates already tested. Check that existing expectations are still correct under the new rules.
- **Bilingual fields** are always `[english, greek]`. Look up both languages in the CSV files.
- **Optional fields** (`feast`, `saint`, `note`, `tone`) must be omitted entirely when not applicable — never `undefined` in an assertion.

To find immovable data for a date, search `data/TextImmovable.csv`. To find movable data, search `data/TextMovable.csv` by reference and offset. To find readings, check `data/ReadingsMovable.csv` and `data/ReadingsImmovable.csv`.

## Step 3: Update the Implementation

The implementation is organized as:

| Layer | Entry point | Purpose |
|-------|-------------|---------|
| Data engine | `src/engine/dataEngine.ts` | `generateData` / `generateDataRange` — produces `EnrichedDateData` for a calendar date range |
| Context | `src/engine/yearContext.ts` | `buildCalendarContextForYear` — precomputes all rule maps for one calendar system for one year |
| Rules | `src/engine/rules/*.ts` | Individual rule modules (fasting, tones, notes, text, readings) |
| Calendar | `src/engine/calendarSystem.ts` | `CalendarSystem` interface — polymorphic Gregorian/Julian conversion |

Each rule module builds a precomputed map during context construction. The data engine does O(1) lookups per date against these maps.

When updating, identify which rule module is affected by the change in `CalendarRules.md` and modify accordingly. The rules in that file map directly to the modules:

- GeneralRules → `movableResolver.ts`, `yearContext.ts`
- FastingRules → `rules/fastingRules.ts`
- LengthyNotesRules → `rules/noteRules.ts`
- FeastSaintNoteRules → `rules/textRules.ts`
- ToneRules → `rules/toneRules.ts`
- ReadingsRules → `rules/readingsRules.ts`

## Step 4: Verify

```bash
npm run build
npm test
```

All tests should pass. If a test fails, determine whether the test expectation is wrong (go back to Step 2) or the implementation has a bug (fix in Step 3).
