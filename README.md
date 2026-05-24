# Orthodox Calendar Data

A TypeScript library that generates Orthodox Christian calendar data from CSV source files. Produces structured JSON representing saints, feasts, fasting rules, tones, readings, and liturgical notes for any year with available Pascha dates (2000-2050).

## Installation

```bash
npm install
npm run build
```

## Quick Start

```ts
import {
    generateCalendarYear,
    generateCalendarDate,
    generateCalendarRange,
    generateData,
    generateDataRange,
    GREGORIAN,
    JULIAN,
} from 'orthodox-calendar-data';

// Full year calendar with UI grids (primary: Gregorian, secondary: Julian)
const calendar = generateCalendarYear(2026);

// Single date composite (primary + secondary + moon)
const day = generateCalendarDate(2026, 4, 12); // Pascha 2026
console.log(day.primaryData.feast);   // ["Holy Pascha...", "..."]
console.log(day.secondaryData.feast); // same — Pascha is the same physical day
console.log(day.moon);                // "NONE" | "NEW" | "FIRST" | "FULL" | "LAST"

// Date range composite
const holyWeek = generateCalendarRange(
    { year: 2026, month: 4, day: 5 },
    { year: 2026, month: 4, day: 12 },
);

// Raw data layer — single calendar, no moon, no secondary
const data = generateData(2026, 1, 1, GREGORIAN);
const oldData = generateData(2026, 1, 1, JULIAN);

// Raw data range
const year = generateDataRange(
    { year: 2026, month: 1, day: 1 },
    { year: 2026, month: 12, day: 31 },
    GREGORIAN,
);
```

## Architecture

```
UI Layer (src/api/calendar.ts)
  generateCalendarYear    → CalendarData (12 months with 5x7 grids)
  generateCalendarRange   → CalendarDayData[] (primary + secondary + moon)
  generateCalendarDate    → CalendarDayData (single day)

Data Layer (src/engine/dataEngine.ts)
  generateDataRange       → EnrichedDateData[] (single calendar system)
  generateData            → EnrichedDateData (single date, single calendar)

Calendar Systems (src/engine/calendarSystem.ts)
  GREGORIAN               → new calendar (physical dates = calendar dates)
  JULIAN                  → old calendar (calendar dates are 13 days behind physical)

Primitives
  PhysicalDay             → opaque physical day (no month/day extraction without CalendarSystem)
  CalendarDate            → { year, month, day } in a calendar's coordinate system
```

### Data Layer

The data layer computes `EnrichedDateData` for a given calendar system. It handles year-splitting internally (one context per physical year), with a maximum range of 5 years.

```ts
type EnrichedDateData = {
    date: number;                // calendar day number (1-31)
    fasting: 'NONE' | 'DAIRY' | 'FISH' | 'OIL' | 'STRICT';
    lengthyNotes: string[];     // [] or [english, greek]
    feast?: string[];           // [english, greek]
    saint?: string[];           // [english, greek]
    note?: string[];            // [english, greek]
    tone?: string;              // e.g. "2nd Tone", "Plagal 1st Tone"
    readings: string[];         // e.g. ["Acts 1:1-8", "John 1:1-17"]
};
```

**Calendar date inputs** are specified in the target calendar's coordinate system:
- `generateData(2026, 3, 25, GREGORIAN)` — Gregorian March 25 (Annunciation)
- `generateData(2026, 3, 25, JULIAN)` — Julian March 25 (= physical April 7)

### UI Layer

The UI layer orchestrates two data-layer calls (primary + secondary calendar), adds moon phases, and optionally assembles into display-ready month grids.

```ts
type CalendarDayData = {
    primaryData: EnrichedDateData;
    secondaryData: EnrichedDateData;
    moon: 'NONE' | 'NEW' | 'FIRST' | 'FULL' | 'LAST';
};
```

**`generateCalendarYear`** produces the full grid structure used by rendering clients:

```ts
type CalendarData = {
    year: string;
    months: MonthData[];  // 12 entries
};

type MonthData = {
    name: string[];       // [english, greek]
    grid: GridData;       // 5 rows x 7 columns
};
```

### Options

```ts
type GenerateCalendarOptions = {
    calendar?: CalendarSystem;          // default: GREGORIAN
    secondaryCalendar?: CalendarSystem; // default: JULIAN
    timezone?: string;                  // for moon phases, default: 'America/Phoenix'
    noteIndicators?: string[];          // default: ['*', '†', '‡']
    readingsLayout?: ReadingsLayoutOptions; // if provided, readings are formatted to fit
};

type ReadingsLayoutOptions = {
    maxLines: number;           // max number of output lines
    maxLineWidth: number;       // target width per line (in character units)
    charWidth?: (char: string) => number; // optional width function (default: monospace)
};
```

```ts
// Default — raw readings, no formatting
const cal = generateCalendarYear(2026);

// With timezone override
const cal = generateCalendarYear(2026, { timezone: 'America/New_York' });

// With readings formatting (abbreviate books to fit 3 lines at 28 chars wide)
const cal = generateCalendarYear(2026, {
    readingsLayout: { maxLines: 3, maxLineWidth: 28 },
});

// Proportional width estimation for variable-width fonts
import { PROPORTIONAL } from 'orthodox-calendar-data/engine/rules/readingsFormatter';
const cal = generateCalendarYear(2026, {
    readingsLayout: { maxLines: 3, maxLineWidth: 22, charWidth: PROPORTIONAL },
});
```

**`timezone`** — Moon phases are astronomical instants. Which calendar date they land on depends on timezone.

**`noteIndicators`** — Symbols used to link DateBoxes to NoteBoxes. Assigned globally across the year so the same note always gets the same symbol. Wraps with a warning if more unique notes exist than symbols.

**`readingsLayout`** — When provided, readings in each `DateBox.lowerText.readings` are packed into the given number of lines, abbreviating book names (e.g. "Matthew" → "Mt.") if needed to stay within `maxLineWidth`. Multiple readings may be combined onto one line with `; ` separators. When omitted, readings are raw unabbreviated strings from the source data. The formatter never drops readings — it only abbreviates and reflows.

## UI Grid Types

### GridData — The 5x7 Grid

Every month is rendered as exactly 5 rows by 7 columns:

```ts
type GridData = BoxData[][];
type BoxData = EmptyBox | NoteBox | SplitBox | DateBox;
```

### DateBox

One per calendar date:

```ts
type DateBox = {
    type: 'DATE';
    newDate: number;            // primary calendar date number
    oldDate: number;            // secondary calendar date number
    background: 'STANDARD' | 'FASTING';
    moon: 'NONE' | 'NEW' | 'FIRST' | 'FULL' | 'LAST';
    fasting: 'NONE' | 'DAIRY' | 'FISH' | 'OIL' | 'STRICT';
    newFeast: boolean;          // primary calendar has a feast
    oldFeast: boolean;          // both calendars have feasts
    note?: string;              // indicator symbol linking to a NoteBox
    mainText: {
        feast?: string[];       // [english, greek]
        saint?: string[];       // [english, greek]
        note?: string[];        // [english, greek]
    };
    lowerText: {
        tone?: string;
        readings: string[];
    };
};
```

### NoteBox

Lengthy notes displayed separately, linked by indicator symbol:

```ts
type NoteBox = {
    type: 'NOTE';
    note: string;       // indicator symbol (*, †, ‡)
    text: string[];     // [english, greek]
};
```

### SplitBox

When dates overflow into a 6th row, the last dates are paired vertically:

```ts
type SplitBox = {
    type: 'SPLIT';
    top: DateBox;
    bottom: DateBox;
};
```

### EmptyBox

Unused cells:

```ts
type EmptyBox = { type: 'EMPTY' };
```

## CLI

```bash
npm run build

# Single date (EnrichedDateData — primary calendar only)
node dist/cli.js date 2026-04-12

# Date range (EnrichedDateData[])
node dist/cli.js range 2026-01-01 2026-01-31

# Single month grid (MonthData)
node dist/cli.js month 4 2026

# Full year (CalendarData with all 12 month grids)
node dist/cli.js year 2026

# With timezone override
node dist/cli.js year 2026 --timezone America/New_York
```

## Testing

```bash
npm test
```

Test files:
- `tests/date.test.ts` — Data layer: fasting, tones, text, readings, ordering, cross-year behavior
- `tests/calendar.test.ts` — UI layer: moon phases, grid structure, composite data, Pascha alignment
- `tests/readingsFormatter.test.ts` — Readings display formatting

## PhysicalDay

Internal dates use `PhysicalDay` — an opaque type that prevents accidental extraction of month/day (which is calendar-system-dependent). You can only get a calendar date via `CalendarSystem.getMMDD(day)` or `CalendarSystem.getDateNumber(day)`.

```ts
// Available methods on PhysicalDay:
day.dayOfWeek()        // 0=Sun, 6=Sat
day.year()             // Gregorian year
day.addDays(n)         // returns new PhysicalDay
day.isBefore(other)
day.isAfter(other)
day.equals(other)
day.daysSince(ref)     // signed days from ref to this
day.toDate()           // convert to JS Date (public API boundary only)
```

## Data Sources

All source data lives in `data/`:

| File | Content |
|------|---------|
| `PaschaDates.csv` | Pascha dates by year (Gregorian + Julian columns) |
| `TextImmovable.csv` | Fixed calendar feasts, saints, notes (by MM-DD) |
| `TextMovable.csv` | Pascha-relative feasts, saints, notes (by offset) |
| `TextSpecial.csv` | Royal Hours, DST, and other conditional entries |
| `ReadingsMovable.csv` | Pascha-relative Bible readings |
| `ReadingsImmovable.csv` | Fixed-date Bible readings |

## Project Structure

```
src/
  index.ts                Public API exports
  browser.ts              Browser entry point
  cli.ts                  CLI commands
  types.ts                UI types (CalendarData, DateBox, etc.)
  api/
    calendar.ts           UI layer (generateCalendarYear/Range/Date)
  engine/
    dataEngine.ts         Data layer (generateData/DataRange)
    yearContext.ts        Precomputed per-year calendar context
    calendarSystem.ts     CalendarSystem interface (GREGORIAN, JULIAN)
    calendarDate.ts       CalendarDate type
    physicalDay.ts        PhysicalDay opaque class
    movableResolver.ts    Movable reference resolution
    rules/
      fastingRules.ts     Fasting basemap + overrides
      toneRules.ts        Tone cycle
      noteRules.ts        Lengthy note triggers
      textRules.ts        Feast/saint/note text assembly
      readingsRules.ts    Bible readings assignment
      moonRules.ts        Moon phase computation
      dateUtils.ts        Date arithmetic utilities
  data/
    parser.ts             CSV parsing
tests/
  date.test.ts            Data layer tests
  calendar.test.ts        UI layer + moon + integration tests
  readingsFormatter.test.ts  Readings formatting tests
rules/
  CalendarRules.md        Full rule specification
```
