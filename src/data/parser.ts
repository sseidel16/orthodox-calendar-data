/**
 * Node parser — reads CSV files from disk and delegates to parserCore.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
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

const DATA_DIR = join(__dirname, '..', '..', 'data');

function load(filename: string): string {
    return readFileSync(join(DATA_DIR, filename), 'utf-8');
}

export const parseTextImmovable = () => parseTextImmovableFromString(load('TextImmovable.csv'));
export const parseTextMovable = () => parseTextMovableFromString(load('TextMovable.csv'));
export const parseTextSpecial = () => parseTextSpecialFromString(load('TextSpecial.csv'));
export const parseMovableReferences = () => parseMovableReferencesFromString(load('MovableReferences.csv'));
export const parseReadingsMovable = () => parseReadingsMovableFromString(load('ReadingsMovable.csv'));
export const parseReadingsImmovable = () => parseReadingsImmovableFromString(load('ReadingsImmovable.csv'));
export const parsePaschaDates = () => parsePaschaDatesFromString(load('PaschaDates.csv'));
