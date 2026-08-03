const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const canonicalPath = path.join(root, 'supabase', 'seed.sql');
const reapplyPath = path.join(
  root,
  'supabase',
  'tests',
  'support',
  'task13_seed_reapply.sql.inc',
);

const canonical = fs.readFileSync(canonicalPath);
const reapply = fs.readFileSync(reapplyPath);

if (!canonical.equals(reapply)) {
  console.error(
    'Task 13 seed reapply copy is stale. Make supabase/tests/support/task13_seed_reapply.sql.inc byte-identical to supabase/seed.sql.',
  );
  process.exit(1);
}

console.log('Task 13 seed reapply copy matches supabase/seed.sql.');
