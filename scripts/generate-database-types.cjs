#!/usr/bin/env node
/**
 * Regenerate or check committed Supabase Database types from the local schema.
 *
 * Usage:
 *   node scripts/generate-database-types.cjs           # write file
 *   node scripts/generate-database-types.cjs --check   # exit 1 if stale
 *
 * Requires local Supabase to be running (`supabase start`).
 * Does not contact staging or production.
 */

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'src/types/database.generated.ts');
const checkMode = process.argv.includes('--check');

const HEADER = `/**
 * Generated from the local Supabase schema. Do not edit manually.
 *
 * Regenerate:
 *   npm run types:generate
 *
 * Verify committed types match the local schema:
 *   npm run types:check
 */
`;

function generate() {
  const body = execFileSync(
    'supabase',
    ['gen', 'types', 'typescript', '--local'],
    {
      cwd: ROOT,
      encoding: 'utf8',
      env: { ...process.env, DO_NOT_TRACK: '1' },
    },
  );
  return `${HEADER}\n${body.trimEnd()}\n`;
}

const next = generate();

if (checkMode) {
  if (!fs.existsSync(OUT)) {
    console.error(`Missing generated types at ${OUT}`);
    process.exit(1);
  }
  const current = fs.readFileSync(OUT, 'utf8');
  if (current !== next) {
    console.error(
      'src/types/database.generated.ts is stale or diverged from the local schema.',
    );
    console.error('Run: npm run types:generate');
    process.exit(1);
  }
  console.log('Generated database types match the local schema.');
  process.exit(0);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, next, 'utf8');
console.log(`Wrote ${path.relative(ROOT, OUT)}`);
