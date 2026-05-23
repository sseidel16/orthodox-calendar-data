import * as esbuild from 'esbuild';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, 'data');

// Plugin: load .csv files as raw text strings
const csvLoaderPlugin = {
    name: 'csv-loader',
    setup(build) {
        build.onResolve({ filter: /\.csv\?raw$/ }, args => ({
            path: join(dataDir, args.path.replace('?raw', '').replace('../../data/', '')),
            namespace: 'csv-raw',
        }));
        // Also handle imports from parser-browser that reference ../../data/*.csv?raw
        build.onResolve({ filter: /\.csv/ }, args => {
            if (args.namespace === 'csv-raw') return;
            if (args.path.includes('data/') && args.path.endsWith('.csv')) {
                const filename = args.path.split('/').pop();
                return { path: join(dataDir, filename), namespace: 'csv-raw' };
            }
        });
        build.onLoad({ filter: /.*/, namespace: 'csv-raw' }, args => ({
            contents: JSON.stringify(readFileSync(args.path, 'utf-8')),
            loader: 'json',
        }));
    },
};

// Plugin: replace parser.ts with parser-browser.ts
const replaceParserPlugin = {
    name: 'replace-parser',
    setup(build) {
        build.onResolve({ filter: /\/data\/parser\.js$|\/data\/parser$/ }, () => ({
            path: join(__dirname, 'src', 'data', 'parser-browser.ts'),
        }));
    },
};

await esbuild.build({
    entryPoints: ['src/browser.ts'],
    bundle: true,
    outfile: 'dist/orthodox-calendar-data.js',
    format: 'iife',
    globalName: 'OrthodoxCalendar',
    platform: 'browser',
    target: 'es2020',
    plugins: [replaceParserPlugin, csvLoaderPlugin],
});

await esbuild.build({
    entryPoints: ['src/browser.ts'],
    bundle: true,
    outfile: 'dist/orthodox-calendar-data.esm.js',
    format: 'esm',
    platform: 'browser',
    target: 'es2020',
    plugins: [replaceParserPlugin, csvLoaderPlugin],
});

console.log('Browser builds: dist/orthodox-calendar-data.js (IIFE) + dist/orthodox-calendar-data.esm.js (ESM)');
