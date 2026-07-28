#!/usr/bin/env node

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const config = fs.readFileSync(
  path.join(ROOT, 'supabase', 'config.toml'),
  'utf8',
);
const projectIdMatch = config.match(/^project_id\s*=\s*"([^"]+)"\s*$/m);

if (!projectIdMatch) {
  throw new Error('supabase/config.toml must define project_id');
}

const container = `supabase_db_${projectIdMatch[1]}`;
const productId = '66666666-6666-6666-6666-666666666661';
const deleteProductAId = '66666666-6666-6666-6666-666666666662';
const deleteProductBId = '66666666-6666-6666-6666-666666666663';
const userAId = '77777777-7777-7777-7777-777777777771';
const userBId = '77777777-7777-7777-7777-777777777772';
const deleteUserAId = '77777777-7777-7777-7777-777777777773';
const deleteUserBId = '77777777-7777-7777-7777-777777777774';
const sessionBName = 'eazy-review-concurrency-b';
const deleteSessionAName = 'eazy-review-delete-a';
const deleteSessionBName = 'eazy-review-delete-b';
const deleteGateKey = 18273741;

function dockerPsqlArgs(extra = []) {
  return [
    'exec',
    ...extra,
    container,
    'psql',
    '-U',
    'postgres',
    '-d',
    'postgres',
    '-X',
    '-qAt',
    '-v',
    'ON_ERROR_STOP=1',
  ];
}

function runSql(sql) {
  const result = spawnSync('docker', [...dockerPsqlArgs(), '-c', sql], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'docker psql failed');
  }
  return result.stdout.trim();
}

function startSession(applicationName) {
  const child = spawn(
    'docker',
    dockerPsqlArgs(['-i', '-e', `PGAPPNAME=${applicationName}`]),
    {
      cwd: ROOT,
      stdio: ['pipe', 'pipe', 'pipe'],
    },
  );
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  return child;
}

function waitForMarker(child, marker, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';

    const timeout = setTimeout(() => {
      cleanup();
      reject(
        new Error(
          `timed out waiting for ${marker}; stderr=${stderr.trim() || '(none)'}`,
        ),
      );
    }, timeoutMs);

    function cleanup() {
      clearTimeout(timeout);
      child.stdout.off('data', onStdout);
      child.stderr.off('data', onStderr);
      child.off('exit', onExit);
    }

    function onStdout(chunk) {
      stdout += chunk;
      if (stdout.includes(marker)) {
        cleanup();
        resolve();
      }
    }

    function onStderr(chunk) {
      stderr += chunk;
    }

    function onExit(code) {
      cleanup();
      reject(
        new Error(
          `session exited with ${code} before ${marker}; stderr=${
            stderr.trim() || '(none)'
          }`,
        ),
      );
    }

    child.stdout.on('data', onStdout);
    child.stderr.on('data', onStderr);
    child.on('exit', onExit);
  });
}

function waitForExit(child, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    if (child.exitCode !== null) {
      resolve(child.exitCode);
      return;
    }

    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error('timed out waiting for database session to exit'));
    }, timeoutMs);

    child.once('exit', (code) => {
      clearTimeout(timeout);
      resolve(code);
    });
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForAdvisoryBlock(timeoutMs = 3000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const waitEvent = runSql(`
      select coalesce((
        select wait_event_type || ':' || wait_event
        from pg_stat_activity
        where application_name = '${sessionBName}'
          and state = 'active'
      ), '');
    `);
    if (waitEvent === 'Lock:advisory') {
      return;
    }
    await delay(50);
  }
  throw new Error('second writer did not block on the advisory lock');
}

async function waitForAdvisoryBlocks(applicationNames, timeoutMs = 3000) {
  const quotedNames = applicationNames
    .map((name) => `'${name.replaceAll("'", "''")}'`)
    .join(', ');
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const blockedCount = Number(
      runSql(`
        select count(*)
        from pg_stat_activity
        where application_name in (${quotedNames})
          and wait_event_type = 'Lock'
          and wait_event = 'advisory';
      `),
    );
    if (blockedCount === applicationNames.length) {
      return;
    }
    await delay(50);
  }
  throw new Error(
    `expected ${applicationNames.length} sessions to block on the advisory gate`,
  );
}

const dropDeletePauseSql = `
  drop trigger if exists zz_test_user_ratings_delete_pause
    on public.user_ratings;
  drop function if exists public.zz_test_pause_after_rating_delete();
`;

const cleanupSql = `
  ${dropDeletePauseSql}
  delete from public.products
  where id in (
    '${productId}'::uuid,
    '${deleteProductAId}'::uuid,
    '${deleteProductBId}'::uuid
  );
  delete from auth.users
  where id in (
    '${userAId}'::uuid,
    '${userBId}'::uuid,
    '${deleteUserAId}'::uuid,
    '${deleteUserBId}'::uuid
  );
`;

const setupSql = `
  ${cleanupSql}
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) values
    (
      '00000000-0000-0000-0000-000000000000',
      '${userAId}'::uuid,
      'authenticated',
      'authenticated',
      'task11-concurrency-a@example.com',
      'schema-test-only',
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    ),
    (
      '00000000-0000-0000-0000-000000000000',
      '${userBId}'::uuid,
      'authenticated',
      'authenticated',
      'task11-concurrency-b@example.com',
      'schema-test-only',
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    ),
    (
      '00000000-0000-0000-0000-000000000000',
      '${deleteUserAId}'::uuid,
      'authenticated',
      'authenticated',
      'task11-delete-concurrency-a@example.com',
      'schema-test-only',
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    ),
    (
      '00000000-0000-0000-0000-000000000000',
      '${deleteUserBId}'::uuid,
      'authenticated',
      'authenticated',
      'task11-delete-concurrency-b@example.com',
      'schema-test-only',
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
  insert into public.products (id, brand, name)
  values
    ('${productId}'::uuid, 'Race Brand', 'Concurrent Aggregate Fixture'),
    ('${deleteProductAId}'::uuid, 'Race Brand', 'Delete Aggregate Fixture A'),
    ('${deleteProductBId}'::uuid, 'Race Brand', 'Delete Aggregate Fixture B');

  insert into public.user_ratings (
    product_id, user_id, look, comfort, quality, outfit, value, overall
  ) values
    (
      '${deleteProductAId}'::uuid,
      '${deleteUserAId}'::uuid,
      4, 4, 4, 4, 4, 4
    ),
    (
      '${deleteProductBId}'::uuid,
      '${deleteUserAId}'::uuid,
      6, 6, 6, 6, 6, 6
    ),
    (
      '${deleteProductBId}'::uuid,
      '${deleteUserBId}'::uuid,
      8, 8, 8, 8, 8, 8
    ),
    (
      '${deleteProductAId}'::uuid,
      '${deleteUserBId}'::uuid,
      10, 10, 10, 10, 10, 10
    );
`;

async function runSameProductInsertRace() {
  let sessionA;
  let sessionB;

  try {
    sessionA = startSession('eazy-review-concurrency-a');
    const sessionAReady = waitForMarker(sessionA, 'SESSION_A_READY');
    sessionA.stdin.write(`
      begin;
      insert into public.user_ratings (
        product_id, user_id, look, comfort, quality, outfit, value, overall
      ) values (
        '${productId}'::uuid,
        '${userAId}'::uuid,
        4, 4, 4, 4, 4, 4
      );
      select 'SESSION_A_READY';
    `);
    await sessionAReady;

    sessionB = startSession(sessionBName);
    const sessionBReady = waitForMarker(sessionB, 'SESSION_B_READY');
    sessionB.stdin.end(`
      begin;
      insert into public.user_ratings (
        product_id, user_id, look, comfort, quality, outfit, value, overall
      ) values (
        '${productId}'::uuid,
        '${userBId}'::uuid,
        8, 8, 8, 8, 8, 8
      );
      select 'SESSION_B_READY';
      commit;
      \\q
    `);

    await waitForAdvisoryBlock();
    sessionA.stdin.end('commit;\n\\q\n');

    await sessionBReady;
    assert.equal(await waitForExit(sessionA), 0);
    assert.equal(await waitForExit(sessionB), 0);

    const finalAggregate = runSql(`
      select rating_count || '|' || overall_avg || '|' || score
      from public.rating_aggregates
      where product_id = '${productId}'::uuid;
    `);
    assert.equal(
      finalAggregate,
      '2|6.00|60',
      'both committed ratings must be visible in the final aggregate',
    );

    process.stdout.write(
      'test:db:concurrency — same-product insert race pass (second writer blocked; final aggregate 2|6.00|60)\n',
    );
  } finally {
    if (sessionA && sessionA.exitCode === null) {
      sessionA.kill('SIGTERM');
    }
    if (sessionB && sessionB.exitCode === null) {
      sessionB.kill('SIGTERM');
    }
  }
}

async function runMultiProductDeleteRace() {
  let gateSession;
  let sessionA;
  let sessionB;

  try {
    runSql(`
      create or replace function public.zz_test_pause_after_rating_delete()
      returns trigger
      language plpgsql
      security invoker
      set search_path = ''
      as $$
      begin
        perform pg_sleep(0.35);
        return old;
      end;
      $$;

      revoke execute
        on function public.zz_test_pause_after_rating_delete()
        from public, anon, authenticated;

      create trigger zz_test_user_ratings_delete_pause
        after delete on public.user_ratings
        for each row
        execute function public.zz_test_pause_after_rating_delete();
    `);

    gateSession = startSession('eazy-review-delete-gate');
    const gateReady = waitForMarker(gateSession, 'DELETE_GATE_READY');
    gateSession.stdin.write(`
      select pg_advisory_lock(${deleteGateKey});
      select 'DELETE_GATE_READY';
    `);
    await gateReady;

    sessionA = startSession(deleteSessionAName);
    const sessionAComplete = waitForMarker(sessionA, 'DELETE_A_COMPLETE');
    sessionA.stdin.end(`
      begin;
      select pg_advisory_xact_lock_shared(${deleteGateKey});
      delete from auth.users where id = '${deleteUserAId}'::uuid;
      select 'DELETE_A_COMPLETE';
      commit;
      \\q
    `);

    sessionB = startSession(deleteSessionBName);
    const sessionBComplete = waitForMarker(sessionB, 'DELETE_B_COMPLETE');
    sessionB.stdin.end(`
      begin;
      select pg_advisory_xact_lock_shared(${deleteGateKey});
      delete from auth.users where id = '${deleteUserBId}'::uuid;
      select 'DELETE_B_COMPLETE';
      commit;
      \\q
    `);

    await waitForAdvisoryBlocks([deleteSessionAName, deleteSessionBName]);
    gateSession.stdin.end(`
      select pg_advisory_unlock(${deleteGateKey});
      \\q
    `);

    await Promise.all([sessionAComplete, sessionBComplete]);
    assert.equal(await waitForExit(gateSession), 0);
    assert.equal(await waitForExit(sessionA), 0);
    assert.equal(await waitForExit(sessionB), 0);

    const finalAggregates = runSql(`
      select string_agg(
        product_id::text
          || '|' || rating_count::text
          || '|' || coalesce(score::text, 'null'),
        ','
        order by product_id
      )
      from public.rating_aggregates
      where product_id in (
        '${deleteProductAId}'::uuid,
        '${deleteProductBId}'::uuid
      );
    `);
    assert.equal(
      finalAggregates,
      `${deleteProductAId}|0|null,${deleteProductBId}|0|null`,
      'both multi-product user deletes must commit with zeroed aggregates',
    );

    process.stdout.write(
      'test:db:concurrency — multi-product delete race pass (both deletes committed; aggregates zeroed)\n',
    );
  } finally {
    for (const session of [gateSession, sessionA, sessionB]) {
      if (session && session.exitCode === null) {
        session.kill('SIGTERM');
      }
    }
    runSql(dropDeletePauseSql);
  }
}

async function main() {
  const containerCheck = spawnSync(
    'docker',
    ['inspect', '-f', '{{.State.Running}}', container],
    {
      cwd: ROOT,
      encoding: 'utf8',
    },
  );
  assert.equal(
    containerCheck.status,
    0,
    `local Supabase database container is unavailable: ${container}`,
  );
  assert.equal(containerCheck.stdout.trim(), 'true');

  try {
    runSql(setupSql);
    await runSameProductInsertRace();
    await runMultiProductDeleteRace();
  } finally {
    runSql(cleanupSql);
  }
}

main().catch((error) => {
  process.stderr.write(`test:db:concurrency — fail: ${error.message}\n`);
  process.exitCode = 1;
});
