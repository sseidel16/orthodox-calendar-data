/**
 * PhysicalDay — an opaque representation of a calendar-independent physical day.
 *
 * Hides month/day extraction (which is calendar-system-dependent) and only
 * exposes operations that are valid on any physical day regardless of calendar:
 * day-of-week, temporal comparison, offset arithmetic, and year.
 *
 * To get a calendar-specific month or day number, use CalendarSystem.getMMDD()
 * or CalendarSystem.getDateNumber().
 */
export class PhysicalDay {
    readonly #ms: number;

    private constructor(ms: number) {
        this.#ms = ms;
    }

    /** Create from year, month (1-12), day (1-31) in Gregorian physical coordinates. */
    static of(year: number, month: number, day: number): PhysicalDay {
        return new PhysicalDay(Date.UTC(year, month - 1, day));
    }

    /** Create from a JS Date (takes the UTC midnight of that date). */
    static fromDate(date: Date): PhysicalDay {
        return new PhysicalDay(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    }

    /** Day of week: 0=Sunday, 1=Monday, ..., 6=Saturday. */
    dayOfWeek(): number {
        return new Date(this.#ms).getUTCDay();
    }

    /** Gregorian year this physical day falls in. */
    year(): number {
        return new Date(this.#ms).getUTCFullYear();
    }

    /** Return a new PhysicalDay offset by the given number of days. */
    addDays(n: number): PhysicalDay {
        const d = new Date(this.#ms);
        d.setUTCDate(d.getUTCDate() + n);
        return new PhysicalDay(d.getTime());
    }

    isBefore(other: PhysicalDay): boolean {
        return this.#ms < other.#ms;
    }

    isAfter(other: PhysicalDay): boolean {
        return this.#ms > other.#ms;
    }

    /** Inclusive: isBefore || equals. */
    isOnOrBefore(other: PhysicalDay): boolean {
        return this.#ms <= other.#ms;
    }

    equals(other: PhysicalDay): boolean {
        return this.#ms === other.#ms;
    }

    /** Signed number of days from reference to this day. */
    daysSince(reference: PhysicalDay): number {
        return Math.round((this.#ms - reference.#ms) / 86_400_000);
    }

    /**
     * Escape hatch for CalendarSystem implementations that need raw epoch ms.
     * Do NOT use outside of CalendarSystem to extract month/day.
     */
    _epochMs(): number {
        return this.#ms;
    }

    /** Convert back to a JS Date (UTC midnight). For public API boundaries only. */
    toDate(): Date {
        return new Date(this.#ms);
    }
}
