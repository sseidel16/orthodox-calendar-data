export type CalendarData = {
    year: string;
    months: MonthData[];
}

export type CalendarScriptSettings = {
    duplicationPreference: "skip" | "replace";
    headerTemplatePageIndex: number;
    gridTemplatePageIndex: number;
    monthsStartPageIndex: number;
    verticalGridSpacing: number; // inches
    horizontalGridSpacing: number; // inches
    gridDividerWeight: string; // e.g. "1pt"
    gridDividerColor: [number, number, number]; // RGB
};

export type MonthData = {
    name: string[]; // [english, greek]
    grid: GridData;
}

export type GridData = BoxData[][]; // always 5 by 7

export type BoxData = EmptyBox | NoteBox | SplitBox | DateBox;

export type EmptyBox = {
    type: 'EMPTY';
};

/**
 * Note boxes show the note for an indicator found in a date box
 */
export type NoteBox = {
    type: 'NOTE';
    note: string; // symbol indicator like * or ** or +
    text: string[]; // [english, greek]
};

/**
 * Split boxes are used occasionally for dates 30 and 31 when they spill into a 6th row
 */
export type SplitBox = {
    type: 'SPLIT';
    top: DateBox;
    bottom: DateBox;
};

export type DateBox = {
    type: 'DATE';
    newDate: number; // new calendar date
    oldDate: number; // old calendar date
    background: 'STANDARD' | 'FASTING'; // any fasting rule beyond no meat
    moon: 'NONE' | 'NEW' | 'FIRST' | 'FULL' | 'LAST'; // the moon phase
    fasting: 'NONE' | 'DAIRY' | 'FISH' | 'OIL' | 'STRICT';
    note?: string; // note indicator like *, links to a NoteBox in the same month
    newFeast: boolean; // indicates if it's a new calendar feast and newDate should be in red
    oldFeast: boolean; // indicates if it's a new calendar feast and oldDate should be in red
    mainText: {
        feast?: string[]; // [english, greek]
        saint?: string[]; // [english, greek]
        note?: string[]; // small note, longer notes go in the NoteBox, linked from top-level note indicator
    };
    lowerText: {
        tone?: string; // tone of the week, only for Sundays, ex: 1st Tone, Plagal 2nd Tone, Grave Tone, etc
        readings: string[]; // bible readings
    };
};
