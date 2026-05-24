/**
 * Browser parser — CSV data is inlined at build time by esbuild's csv-loader plugin.
 * This file replaces parser.ts when building for the browser.
 */

// @ts-ignore — resolved by esbuild csv-loader plugin
import TextImmovableCSV from '../../data/TextImmovable.csv';
// @ts-ignore
import TextMovableCSV from '../../data/TextMovable.csv';
// @ts-ignore
import TextSpecialCSV from '../../data/TextSpecial.csv';
// @ts-ignore
import MovableReferencesCSV from '../../data/MovableReferences.csv';
// @ts-ignore
import ReadingsMovableCSV from '../../data/ReadingsMovable.csv';
// @ts-ignore
import ReadingsImmovableCSV from '../../data/ReadingsImmovable.csv';
// @ts-ignore
import PaschaDatesCSV from '../../data/PaschaDates.csv';

import {
    parseTextImmovableFromString,
    parseTextMovableFromString,
    parseTextSpecialFromString,
    parseMovableReferencesFromString,
    parseReadingsMovableFromString,
    parseReadingsImmovableFromString,
    parsePaschaDatesFromString,
} from './parserCore.js';

export type {
    TextImmovableEntry,
    TextMovableEntry,
    TextSpecialEntry,
    MovableReferenceEntry,
    ReadingsMovableEntry,
    ReadingsImmovableEntry,
    PaschaDateEntry,
} from './parserCore.js';

export const parseTextImmovable = () => parseTextImmovableFromString(TextImmovableCSV as string);
export const parseTextMovable = () => parseTextMovableFromString(TextMovableCSV as string);
export const parseTextSpecial = () => parseTextSpecialFromString(TextSpecialCSV as string);
export const parseMovableReferences = () => parseMovableReferencesFromString(MovableReferencesCSV as string);
export const parseReadingsMovable = () => parseReadingsMovableFromString(ReadingsMovableCSV as string);
export const parseReadingsImmovable = () => parseReadingsImmovableFromString(ReadingsImmovableCSV as string);
export const parsePaschaDates = () => parsePaschaDatesFromString(PaschaDatesCSV as string);
