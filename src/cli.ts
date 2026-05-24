import { generateData, generateDataRange } from './engine/dataEngine.js';
import { generateCalendarYear } from './api/calendar.js';
import { GREGORIAN } from './engine/calendarSystem.js';
import { CalendarDate } from './engine/calendarDate.js';

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

function parseDateString(str: string): { year: number; month: number; day: number } {
    const d = new Date(str + 'T00:00:00Z');
    if (isNaN(d.getTime())) {
        throw new Error(`Invalid date: ${str}`);
    }
    return {
        year: d.getUTCFullYear(),
        month: d.getUTCMonth() + 1,
        day: d.getUTCDate(),
    };
}

type CliOptions = {
    timezone?: string;
};

function parseArgs(args: string[]): { positional: string[]; options: CliOptions } {
    const positional: string[] = [];
    const options: CliOptions = {};

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
            const { year, month, day } = parseDateString(positional[1]);
            const result = generateData(year, month, day, GREGORIAN);
            console.log(JSON.stringify(result, null, 2));
            break;
        }

        case 'range': {
            if (positional.length < 3) {
                console.error('Error: range command requires start and end dates (YYYY-MM-DD YYYY-MM-DD)');
                process.exit(1);
            }
            const startParts = parseDateString(positional[1]);
            const endParts = parseDateString(positional[2]);
            const start: CalendarDate = { year: startParts.year, month: startParts.month, day: startParts.day };
            const end: CalendarDate = { year: endParts.year, month: endParts.month, day: endParts.day };
            const results = generateDataRange(start, end, GREGORIAN);
            console.log(JSON.stringify(results, null, 2));
            break;
        }

        case 'month': {
            if (positional.length < 3) {
                console.error('Error: month command requires month (1-12) and year');
                process.exit(1);
            }
            const month = parseInt(positional[1], 10);
            const year = parseInt(positional[2], 10);
            if (month < 1 || month > 12) {
                console.error('Error: month must be between 1 and 12');
                process.exit(1);
            }
            const genOpts: Parameters<typeof generateCalendarYear>[1] = {};
            if (options.timezone) genOpts.timezone = options.timezone;
            const calendarData = generateCalendarYear(year, genOpts);
            const monthData = calendarData.months[month - 1];
            console.log(JSON.stringify(monthData, null, 2));
            break;
        }

        case 'year': {
            if (positional.length < 2) {
                console.error('Error: year command requires a year');
                process.exit(1);
            }
            const year = parseInt(positional[1], 10);
            const genOpts: Parameters<typeof generateCalendarYear>[1] = {};
            if (options.timezone) genOpts.timezone = options.timezone;
            const result = generateCalendarYear(year, genOpts);
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
