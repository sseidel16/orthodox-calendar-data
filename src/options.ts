/**
 * Options for calendar data generation.
 * Passed through all API layers.
 */
export type CalendarOptions = {
    /** IANA timezone for moon phase date assignment (default: 'America/Phoenix') */
    timezone?: string;
    /** Indicator symbols for NoteBox references (default: ['*', '**', '†', '‡']) */
    noteIndicators?: string[];
};

export const DEFAULT_OPTIONS: Required<CalendarOptions> = {
    timezone: 'America/Phoenix',
    noteIndicators: ['*', '**', '†', '‡'],
};

export function resolveOptions(options?: CalendarOptions): Required<CalendarOptions> {
    return { ...DEFAULT_OPTIONS, ...options };
}
