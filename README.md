# Orthodox Calendar Data Generator

A TypeScript library that generates Orthodox Christian calendar data from CSV source files. Produces structured JSON representing saints, feasts, fasting rules, tones, readings, and liturgical notes for any year with available Pascha dates (2000-2050).

## Architecture

The library is organized in layers, each building on the one below:

```
CLI (src/cli.ts)
  commands: date, range, month, year

Year API — getYearCalendar(year)
  builds 1 YearContext, passes to all 12 months

Month API — getMonthGrid(month, year)
  transforms EnrichedDate[] into the 5x7 UI grid

Range API — getDateRange(start, end)
  cross-year safe, splits into per-year batches
  getDate(date) calls range with same start/end

Engine — generateDateRange(start, end, year)
  builds YearContext once, applies rules to each date

YearContext (precomputed per year)
  Pascha dates, fasting map, tone cycle, DRS, specials
```

### Data Layer (lowest)

The engine produces `EnrichedDate` objects — flat, raw calendar data for individual dates. This is what the rules operate on. See `rules/CalendarRules.md` for the full rule specification.

```ts
type EnrichedDate = {
    date: Date;
    paschaOffset: number;
    newDate: number;        // Gregorian date number
    oldDate: number;        // Julian date number (13 days behind)
    fasting: 'NONE' | 'DAIRY' | 'FISH' | 'OIL' | 'STRICT';
    moon: 'NONE' | 'NEW' | 'FIRST' | 'FULL' | 'LAST';
    notes: string[];        // [] or [english, greek] — lengthy note text
    mainText: {
        feast?: string[];   // [english, greek]
        saint?: string[];   // [english, greek]
        note?: string[];    // [english, greek]
    };
    lowerText: {
        tone?: string;      // e.g. "2nd Tone", "Plagal 1st Tone"
        readings: string[];
    };
};
```

### UI Layer (month/year)

The month grid builder transforms `EnrichedDate[]` into a `MonthData` structure suitable for calendar rendering. This involves:

1. Converting `EnrichedDate` to `DateBox` (adding `type: 'DATE'`, computing `background` from `fasting`)
2. Processing lengthy notes into indicator symbols and `NoteBox` entries
3. Calculating `SplitBox` for overflow dates
4. Laying out the 5x7 grid with `EmptyBox` padding

## UI Types

### CalendarData

Top-level output for a full year:

```ts
type CalendarData = {
    year: string;
    months: MonthData[];  // 12 entries
}
```

### MonthData

```ts
type MonthData = {
    name: string[];  // [english, greek] e.g. ["January", "Ἰανουάριος"]
    grid: GridData;  // 5x7 array
}
```

### GridData — The 5x7 Grid

Every month is rendered as exactly 5 rows by 7 columns. Each cell is one of four `BoxData` types:

```ts
type GridData = BoxData[][];  // always 5 rows, 7 columns
type BoxData = EmptyBox | NoteBox | SplitBox | DateBox;
```

**Why 5x7?** A month has at most 31 days. Starting on any day of the week, plus up to 4 NoteBoxes, the maximum needed is 35 cells — which is exactly 5x7. SplitBoxes are used to compress overflow when a month would otherwise need a 6th row.

### EmptyBox

Unused cells (before the 1st of the month, or after the last date/note):

```ts
type EmptyBox = { type: 'EMPTY' };
```

### DateBox

The primary cell type — one per calendar date:

```ts
type DateBox = {
    type: 'DATE';
    newDate: number;
    oldDate: number;
    background: 'STANDARD' | 'FASTING';
    moon: 'NONE' | 'NEW' | 'FIRST' | 'FULL' | 'LAST';
    fasting: 'NONE' | 'DAIRY' | 'FISH' | 'OIL' | 'STRICT';
    note?: string;          // indicator symbol linking to a NoteBox
    mainText: {
        feast?: string[];   // [english, greek]
        saint?: string[];   // [english, greek]
        note?: string[];    // [english, greek]
    };
    lowerText: {
        tone?: string;
        readings: string[];
    };
};
```

The `background` field is derived from `fasting`: NONE maps to STANDARD, anything else maps to FASTING.

The `note` field (when present) contains an indicator symbol that links to a `NoteBox` in the same month's grid. This is how lengthy notes are referenced without cluttering the date cell.

### SplitBox

When a month's dates would overflow into a 6th row, the last dates are paired into SplitBoxes. Each SplitBox occupies one grid cell but displays two dates stacked vertically:

```ts
type SplitBox = {
    type: 'SPLIT';
    top: DateBox;
    bottom: DateBox;
};
```

**When SplitBoxes occur:**
- Overflow of 1 (e.g., 31 days starting Friday): 1 SplitBox pairing the last 2 dates (30, 31)
- Overflow of 2 (e.g., 31 days starting Saturday): 2 SplitBoxes pairing the last 4 dates (28+29, 30+31)

### NoteBox

Lengthy notes (e.g., "Some traditions allow for fish on Palm Sunday") are too long to display inside a DateBox. Instead:

1. The `EnrichedDate.notes` field contains the full bilingual note text at the data layer
2. The month grid builder collects all unique notes for the month
3. Each unique note gets an indicator symbol assigned in priority order (configurable via `noteIndicators` option, default: `*`, `**`, `†`, `‡`)
4. DateBoxes that trigger a note get the indicator in their `note` field
5. A `NoteBox` is placed in the grid with the indicator and full text

```ts
type NoteBox = {
    type: 'NOTE';
    note: string;     // indicator symbol (*, **, †, ‡)
    text: string[];   // [english, greek] — the full lengthy note
};
```

**Placement rules:**
- NoteBoxes are placed next to the 1st of the month when empty cells are available (before the first date in that row)
- If no room next to the 1st, they go near the end of the month
- Dates sharing the same lengthy note text share the same indicator and NoteBox

## Options

All public API functions accept an optional `CalendarOptions` object:

```ts
type CalendarOptions = {
    timezone?: string;         // IANA timezone for moon phase dates (default: 'America/Phoenix')
    noteIndicators?: string[]; // Indicator symbols for NoteBoxes (default: ['*', '**', '†', '‡'])
};
```

```ts
import { getDate, getDateRange, getMonthGrid, getYearCalendar } from 'orthodox-calendar-data';

getDate(date, { timezone: 'America/New_York' });
getDateRange(start, end, { timezone: 'America/Phoenix' });
getMonthGrid(3, 2026, { timezone: 'Europe/Athens', noteIndicators: ['†', '‡', '§', '¶'] });
getYearCalendar(2026, { timezone: 'America/Phoenix' });
```

**`timezone`** — Moon phases are astronomical instants. Which calendar date they land on depends on timezone. Arizona (`America/Phoenix`) never observes DST. If your audience is in a different timezone, set this accordingly.

**`noteIndicators`** — The symbols used to link DateBoxes to NoteBoxes. Assigned in order to unique notes within each month. If a month has more unique notes than indicators, the array wraps and a warning is emitted.

## CLI

```bash
npm run build

# Single date (EnrichedDate)
node dist/cli.js date 2026-04-12

# Date range (EnrichedDate[])
node dist/cli.js range 2026-01-01 2026-01-31

# Month grid (MonthData with full UI types)
node dist/cli.js month 4 2026

# Full year (CalendarData)
node dist/cli.js year 2026

# With timezone override
node dist/cli.js year 2026 --timezone America/New_York
```

## Testing

```bash
npm test            # run once
npm run test:watch  # watch mode
```

Tests are organized by level:
- `tests/date.test.ts` — Individual date generation with hard-coded expected outputs. Each test validates a complete `EnrichedDate` via deep equality.
- `tests/month.test.ts` — Grid structure, SplitBox calculation, day-of-week alignment.

## Data Sources

All source data lives in `data/`:

| File | Key | Content |
|------|-----|---------|
| `data/PaschaDates.csv` | Year | Pascha date for years 2000-2050 |
| `data/text/Immovables.csv` | MM-DD | Fixed calendar feasts, saints, notes |
| `data/text/Movables.csv` | PaschaOffset | Pascha-relative feasts, saints, notes |
| `data/text/Specials.csv` | Category | DRS (date-related Sundays) and Special rules |

## Project Structure

```
src/
  index.ts              Library entrypoint (exports all public APIs)
  cli.ts                CLI commands
  types.ts              UI types (CalendarData, DateBox, etc.)
  api/
    range.ts            getDate(), getDateRange() — cross-year safe
    month.ts            getMonthGrid() — EnrichedDate[] -> 5x7 grid
    year.ts             getYearCalendar() — full year generation
  engine/
    dateEngine.ts       EnrichedDate type, batch date generation
    yearContext.ts      Precomputed per-year state
  data/
    parser.ts           CSV parsing utilities
    pascha.ts           Pascha date lookup and offset calculation
tests/
  date.test.ts          Individual date assertions
  month.test.ts         Grid structure tests
rules/
  CalendarRules.md      Full rule specification for EnrichedDate generation
```
