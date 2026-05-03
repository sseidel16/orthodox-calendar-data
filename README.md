# Orthodox Calendar Data

Generates structured calendar JSON from Orthodox liturgical CSV data.

## Project Structure

```
├── data/                  # Source CSV files
│   ├── Immovables.csv     # Fixed-date saints and feasts (one per calendar date)
│   ├── Movables.csv       # Pascha-relative feasts (offset from Pascha, no fixed date)
│   ├── Specials.csv       # Special entries (DRS, notes) with no date or offset
│   ├── PaschaDates.csv    # Pascha dates by year (2000–2050)
│   ├── SaintsFeasts.csv   # Combined master file (all entries with dates)
│   └── SaintsFeastsOg.csv # Original unprocessed source
├── src/                   # TypeScript source
│   ├── types.ts           # CalendarData type definitions
│   ├── index.ts           # Entry point — orchestrates CSV parsing and JSON generation
│   └── ...                # Parsers, builders, utilities
├── dist/                  # Compiled JS + generated calendar JSON output
├── package.json
└── tsconfig.json
```

## Data Pipeline

1. **Immovables** — keyed by calendar date (month/day). Same every year.
2. **Movables** — keyed by PaschaOffset. Actual date computed per year using `PaschaDates.csv`.
3. **Specials** — entries like "Sunday before Theophany" (DRS) or notes that are placed by rule.
4. The generator merges all three into a single `CalendarData` JSON for a given year.

## Output

The generated JSON conforms to the `CalendarData` type defined in `src/types.ts`, structured as 12 months each containing a 5×7 grid of box data (dates, saints, feasts, fasting, readings, etc.).

## Usage

```bash
npm install
npm run generate    # compile + run, outputs to dist/
```

## Scripts

| Command           | Description                              |
| ----------------- | ---------------------------------------- |
| `npm run build`   | Compile TypeScript to `dist/`            |
| `npm run generate`| Compile and run the calendar generator   |
| `npm run clean`   | Remove `dist/`                           |
