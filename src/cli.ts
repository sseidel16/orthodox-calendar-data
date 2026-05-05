import { getDate, getDateRange } from './api/range.js';
import { getMonthGrid } from './api/month.js';
import { getYearCalendar } from './api/year.js';
import { CalendarOptions } from './options.js';

function printUsage(): void {
    console.log(`
Orthodox Calendar Data Generator

Usage:
  node dist/cli.js <command> [options]

Commands:
  date <YYYY-MM-DD>              Get enriched data for a single date
  range <YYYY-MM-DD> <YYYY-MM-DD> Get enriched data for a date range
  month <month> <year>           Get full month grid (UI mode)
  year <year>                    Get full year calendar data (UI mode)

Options:
  --timezone <tz>                IANA timezone for moon phases (default: America/Phoenix)

Examples:
  node dist/cli.js date 2026-04-12
  node dist/cli.js range 2026-01-01 2026-01-31
  node dist/cli.js month 4 2026 --timezone America/New_York
  node dist/cli.js year 2026
`);
}

function parseDate(str: string): Date {
    const d = new Date(str + 'T00:00:00Z');
    if (isNaN(d.getTime())) {
        throw new Error(`Invalid date: ${str}`);
    }
    return d;
}

function parseArgs(args: string[]): { positional: string[]; options: CalendarOptions } {
    const positional: string[] = [];
    const options: CalendarOptions = {};

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--timezone' && i + 1 < args.length) {
            options.timezone = args[++i];
        } else if (!args[i].startsWith('--')) {
            positional.push(args[i]);
        }
    }

    return { positional, options };
}

function main(): void {
    const { positional, options } = parseArgs(process.argv.slice(2));

    if (positional.length === 0) {
        printUsage();
        process.exit(0);
    }

    const command = positional[0];

    switch (command) {
        case 'date': {
            if (positional.length < 2) {
                console.error('Error: date command requires a date argument (YYYY-MM-DD)');
                process.exit(1);
            }
            const date = parseDate(positional[1]);
            const result = getDate(date, options);
            console.log(JSON.stringify(result, null, 2));
            break;
        }

        case 'range': {
            if (positional.length < 3) {
                console.error('Error: range command requires start and end dates (YYYY-MM-DD YYYY-MM-DD)');
                process.exit(1);
            }
            const start = parseDate(positional[1]);
            const end = parseDate(positional[2]);
            const results = getDateRange(start, end, options);
            console.log(JSON.stringify(results, null, 2));
            break;
        }

        case 'month': {
            if (positional.length < 3) {
                console.error('Error: month command requires month (1-12) and year');
                process.exit(1);
            }
            const month = parseInt(positional[1], 10) - 1;
            const year = parseInt(positional[2], 10);
            if (month < 0 || month > 11) {
                console.error('Error: month must be between 1 and 12');
                process.exit(1);
            }
            const result = getMonthGrid(month, year, options);
            console.log(JSON.stringify(result, null, 2));
            break;
        }

        case 'year': {
            if (positional.length < 2) {
                console.error('Error: year command requires a year');
                process.exit(1);
            }
            const year = parseInt(positional[1], 10);
            const result = getYearCalendar(year, options);
            console.log(JSON.stringify(result, null, 2));
            break;
        }

        default:
            console.error(`Unknown command: ${command}`);
            printUsage();
            process.exit(1);
    }
}

main();
