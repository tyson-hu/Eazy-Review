#!/usr/bin/env node

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  TEST_TOKEN,
  scanContent,
  scanRepository,
  shouldScanPath,
  listCandidateFiles,
  redactValue,
  jwtPayloadHasServiceRole,
  main,
} = require('./check-secrets.cjs');

/** Build assignment lines at runtime so fixture secrets are not committed as literals. */
function serviceRoleAssignmentLine(value) {
  const name = ['SUPABASE', 'SERVICE', 'ROLE', 'KEY'].join('_');
  return `${name}=${value}\n`;
}

function modernSupabaseSecretKey() {
  return [
    ['sb', 'secret'].join('_'),
    'N7UND0UgjKTVK-Uodkm0Hg',
    'xSvEMPvz',
  ].join('_');
}

function serviceRoleJwt() {
  const header = Buffer.from(
    JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
  ).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({ role: 'service_role', iss: 'supabase' }),
  ).toString('base64url');
  return `${header}.${payload}.fakesignature`;
}

function postgresConnectionUrl() {
  return [
    ['postgres', 'ql'].join(''),
    '://',
    'fixture-user',
    ':',
    'fixture-password',
    '@',
    'example.invalid',
    ':5432',
    '/fixture-db',
  ].join('');
}

function databasePasswordAssignmentLine(value) {
  const name = ['SUPABASE', 'DB', 'PASSWORD'].join('_');
  return `${name}=${value}\n`;
}

function jwtSigningSecretAssignmentLine(value, prefix = '') {
  const name = [prefix, 'SUPABASE', 'JWT', 'SECRET']
    .filter(Boolean)
    .join('_');
  return `${name}=${value}\n`;
}

function managementTokenAssignmentLine(value, prefix = '') {
  const name = [prefix, 'SUPABASE', 'ACCESS', 'TOKEN']
    .filter(Boolean)
    .join('_');
  return `${name}=${value}\n`;
}

function createTempRepo(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eazy-review-secrets-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'app'), { recursive: true });
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
  fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
  return root;
}

function write(root, relativePath, contents) {
  const absolute = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, contents, 'utf8');
}

function runGit(root, args) {
  const result = require('node:child_process').spawnSync('git', args, {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(
    result.status,
    0,
    `git ${args.join(' ')} failed: ${result.stderr || result.stdout}`,
  );
  return result;
}

test('shouldScanPath allows documented prefixes and skips noise', () => {
  assert.equal(shouldScanPath('app/index.tsx'), true);
  assert.equal(shouldScanPath('assets/config.json'), true);
  assert.equal(shouldScanPath('assets/config.js'), true);
  assert.equal(shouldScanPath('src/lib/client.ts'), true);
  assert.equal(shouldScanPath('docs/SECURITY.md'), true);
  assert.equal(shouldScanPath('supabase/config.toml'), true);
  assert.equal(shouldScanPath('scripts/check-secrets.cjs'), true);
  assert.equal(shouldScanPath('.github/workflows/expo-ci.yml'), true);
  assert.equal(shouldScanPath('.env.example'), true);
  assert.equal(shouldScanPath('.env'), true);
  assert.equal(shouldScanPath('.env.local'), true);
  assert.equal(shouldScanPath('.env.staging'), true);
  assert.equal(shouldScanPath('package.json'), true);
  assert.equal(shouldScanPath('app.config.ts'), true);
  assert.equal(shouldScanPath('app.config.js'), true);
  assert.equal(shouldScanPath('eas.json'), true);
  assert.equal(shouldScanPath('.npmrc'), true);
  assert.equal(shouldScanPath('.editorconfig'), true);
  assert.equal(shouldScanPath('package-lock.json'), true);
  assert.equal(shouldScanPath('yarn.lock'), true);
  assert.equal(shouldScanPath('pnpm-lock.yaml'), true);
  assert.equal(shouldScanPath('node_modules/foo/index.js'), false);
  assert.equal(shouldScanPath('dist/bundle.js'), false);
  assert.equal(shouldScanPath('app/assets/photo.png'), false);
  assert.equal(shouldScanPath('assets/images/photo.png'), false);
  assert.equal(shouldScanPath('assets/fonts/font.ttf'), false);
});

test('bundled textual assets are scanned while binary assets stay skipped', (t) => {
  const root = createTempRepo(t);
  write(root, 'assets/config.json', JSON.stringify({ value: TEST_TOKEN }));
  write(root, 'assets/images/photo.png', TEST_TOKEN);

  const listed = listCandidateFiles(root);
  assert.equal(listed.includes('assets/config.json'), true);
  assert.equal(listed.includes('assets/images/photo.png'), false);

  const findings = scanRepository(root);
  assert.equal(
    findings.some(
      (finding) =>
        finding.file === 'assets/config.json' &&
        finding.pattern === 'deliberate-test-token',
    ),
    true,
  );
});

test('dependency lockfiles are scanned for elevated keys', (t) => {
  const root = createTempRepo(t);
  const secret = modernSupabaseSecretKey();
  write(root, 'package-lock.json', JSON.stringify({ resolved: secret }));
  write(root, 'yarn.lock', `resolved "${secret}"\n`);
  write(root, 'pnpm-lock.yaml', `resolution: ${secret}\n`);

  const findings = scanRepository(root).filter(
    (finding) => finding.pattern === 'supabase-secret-key',
  );
  assert.deepEqual(
    new Set(findings.map((finding) => finding.file)),
    new Set(['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock']),
  );
});

test('gitignored root configs and dotfiles are scanned for elevated keys', (t) => {
  const root = createTempRepo(t);
  const secret = modernSupabaseSecretKey();
  write(root, '.gitignore', 'app.config.ts\neas.json\n.npmrc\n.editorconfig\n');
  write(root, 'docs/ok.md', 'tracked fixture\n');
  write(root, 'app.config.ts', `export default { extra: { key: "${secret}" } };\n`);
  write(root, 'eas.json', '{"build":{"preview":{"env":{"SAFE":"ok"}}}}\n');
  write(root, '.npmrc', `//registry.example.invalid/:_authToken=${secret}\n`);
  write(root, '.editorconfig', 'root = true\n');

  const templateDir = path.join(root, '.empty-git-template');
  fs.mkdirSync(templateDir);
  runGit(root, ['init', `--template=${templateDir}`]);
  runGit(root, ['config', 'user.email', 'secrets-test@example.com']);
  runGit(root, ['config', 'user.name', 'secrets-test']);
  runGit(root, ['add', '.gitignore', 'docs']);
  runGit(root, [
    '-c',
    'commit.gpgsign=false',
    'commit',
    '-m',
    'fixture',
  ]);

  const listed = listCandidateFiles(root);
  assert.equal(listed.includes('app.config.ts'), true);
  assert.equal(listed.includes('eas.json'), true);
  assert.equal(listed.includes('.npmrc'), true);
  assert.equal(listed.includes('.editorconfig'), true);

  const findings = scanRepository(root);
  assert.equal(
    findings.some(
      (finding) =>
        finding.file === 'app.config.ts' &&
        finding.pattern === 'supabase-secret-key',
    ),
    true,
  );
  assert.equal(
    findings.some(
      (finding) =>
        finding.file === '.npmrc' &&
        finding.pattern === 'supabase-secret-key',
    ),
    true,
  );
});

test('gitignored root .env files on disk are still scanned', (t) => {
  const root = createTempRepo(t);
  write(root, '.gitignore', '.env\n.env.*\n!.env.example\n');
  write(root, 'app/ok.ts', 'export {};\n');
  write(root, '.env.example', 'EXPO_PUBLIC_OK=1\n');
  write(root, '.env', `LEAK=${TEST_TOKEN}\n`);
  write(root, '.env.local', serviceRoleAssignmentLine('notarealsecretvalue'));

  // Empty template avoids sandbox/CI issues copying default hook samples.
  const templateDir = path.join(root, '.empty-git-template');
  fs.mkdirSync(templateDir);
  runGit(root, ['init', `--template=${templateDir}`]);
  runGit(root, ['config', 'user.email', 'secrets-test@example.com']);
  runGit(root, ['config', 'user.name', 'secrets-test']);
  runGit(root, ['add', '.gitignore', 'app', '.env.example']);
  runGit(root, [
    '-c',
    'commit.gpgsign=false',
    'commit',
    '-m',
    'fixture',
  ]);

  const listed = listCandidateFiles(root);
  assert.equal(listed.includes('.env'), true);
  assert.equal(listed.includes('.env.local'), true);
  assert.equal(listed.includes('.env.example'), true);

  const findings = scanRepository(root);
  assert.equal(
    findings.some(
      (f) => f.file === '.env' && f.pattern === 'deliberate-test-token',
    ),
    true,
  );
  assert.equal(
    findings.some(
      (f) =>
        f.file === '.env.local' && f.pattern === 'service-role-key-assignment',
    ),
    true,
  );
});

test('redactValue never returns the full secret', () => {
  const secret = 'super-secret-value-12345';
  const redacted = redactValue(secret);
  assert.equal(redacted.includes(secret), false);
  assert.match(redacted, /len=\d+/);
});

test('prose service_role mentions do not match', () => {
  const findings = scanContent(
    'docs/SECURITY.md',
    [
      '- `service_role` is server-only.',
      '| Relation | anon | authenticated | service_role |',
      'REVOKE ... FROM PUBLIC; -- service_role stays trusted',
      '',
    ].join('\n'),
  );
  assert.deepEqual(findings, []);
});

test('fake .env.example anon placeholder does not match JWT heuristic', () => {
  const content = [
    'EXPO_PUBLIC_SUPABASE_URL=https://example-local.supabase.co',
    'EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eazy-review-fake-anon-key-not-real',
    '',
  ].join('\n');
  assert.deepEqual(scanContent('.env.example', content), []);
});

test('modern Supabase secret key fails under an Expo public variable', () => {
  const secret = modernSupabaseSecretKey();
  const findings = scanContent(
    'src/keys.ts',
    `EXPO_PUBLIC_SUPABASE_ANON_KEY=${secret}\n`,
  );
  assert.equal(
    findings.some((f) => f.pattern === 'supabase-secret-key'),
    true,
  );
  for (const finding of findings) {
    assert.equal(finding.redacted.includes(secret), false);
  }
});

test('modern Supabase secret key requires the complete format', () => {
  const prefix = ['sb', 'secret'].join('_');
  assert.deepEqual(
    scanContent(
      'docs/SECURITY.md',
      `${prefix}_...\n${prefix}_too-short_checksum\n`,
    ),
    [],
  );
});

test('.env.example service-role JWT fails regardless of variable name', () => {
  const jwt = serviceRoleJwt();
  const findings = scanContent(
    '.env.example',
    `EXPO_PUBLIC_SUPABASE_ANON_KEY=${jwt}\n`,
  );
  assert.equal(
    findings.some((f) => f.pattern === 'jwt-service-role-claim'),
    true,
  );
  for (const finding of findings) {
    assert.equal(finding.redacted.includes(jwt), false);
  }
});

test('deliberate test token fails', () => {
  const findings = scanContent(
    'app/leak.tsx',
    `const x = '${TEST_TOKEN}';\n`,
  );
  assert.equal(findings.length, 1);
  assert.equal(findings[0].pattern, 'deliberate-test-token');
  assert.equal(findings[0].redacted.includes(TEST_TOKEN), false);
});

test('SERVICE_ROLE_KEY assignment with value fails', () => {
  const fakeJwt = [
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
    'payload',
    'sig',
  ].join('.');
  const findings = scanContent('src/bad.env', serviceRoleAssignmentLine(fakeJwt));
  assert.equal(findings.length >= 1, true);
  assert.equal(
    findings.some((f) => f.pattern === 'service-role-key-assignment'),
    true,
  );
  for (const finding of findings) {
    assert.equal(finding.redacted.includes(fakeJwt), false);
  }
});

test('quoted JSON service-role key assignments fail with redaction', () => {
  const secret = 'fixture-json-service-role-value';
  const name = ['SUPABASE', 'SERVICE', 'ROLE', 'KEY'].join('_');
  const findings = scanContent(
    'eas.json',
    JSON.stringify({ [name]: secret }),
  );
  assert.equal(
    findings.some(
      (finding) => finding.pattern === 'service-role-key-assignment',
    ),
    true,
  );
  for (const finding of findings) {
    assert.equal(finding.redacted.includes(secret), false);
  }
});

test('empty SERVICE_ROLE_KEY assignment does not fail', () => {
  const name = ['SUPABASE', 'SERVICE', 'ROLE', 'KEY'].join('_');
  assert.deepEqual(scanContent('src/empty.env', `${name}=\n`), []);
});

test('JWT with service_role role claim fails outside .env.example', () => {
  const jwt = serviceRoleJwt();
  assert.equal(jwtPayloadHasServiceRole(jwt), true);

  const findings = scanContent('src/keys.ts', `export const k = "${jwt}";\n`);
  assert.equal(findings.some((f) => f.pattern === 'jwt-service-role-claim'), true);
  for (const finding of findings) {
    assert.equal(finding.redacted.includes(jwt), false);
  }
});

test('direct PostgreSQL connection URLs fail with redacted output', () => {
  const connectionUrl = postgresConnectionUrl();
  const findings = scanContent(
    'app.config.ts',
    `EXPO_PUBLIC_DATABASE_URL=${connectionUrl}\n`,
  );
  assert.equal(
    findings.some((finding) => finding.pattern === 'postgres-connection-uri'),
    true,
  );
  for (const finding of findings) {
    assert.equal(finding.redacted.includes(connectionUrl), false);
  }
});

test('database password assignments fail while empty assignments pass', () => {
  const password = 'fixture-database-password';
  const findings = scanContent(
    '.env.example',
    databasePasswordAssignmentLine(password),
  );
  assert.equal(
    findings.some(
      (finding) => finding.pattern === 'database-password-assignment',
    ),
    true,
  );
  for (const finding of findings) {
    assert.equal(finding.redacted.includes(password), false);
  }
  assert.deepEqual(
    scanContent('.env.example', databasePasswordAssignmentLine('')),
    [],
  );
});

test('quoted JSON database password assignments fail with redaction', () => {
  const password = 'fixture-json-database-password';
  const name = ['EXPO', 'PUBLIC', 'SUPABASE', 'DB', 'PASSWORD'].join('_');
  const findings = scanContent(
    'eas.json',
    JSON.stringify({ [name]: password }),
  );
  assert.equal(
    findings.some(
      (finding) => finding.pattern === 'database-password-assignment',
    ),
    true,
  );
  for (const finding of findings) {
    assert.equal(finding.redacted.includes(password), false);
  }
});

test('Supabase management token assignments fail while empty values pass', () => {
  const token = 'fixture-management-token';
  const privateFindings = scanContent(
    '.env.example',
    managementTokenAssignmentLine(token),
  );
  const publicFindings = scanContent(
    'app.config.ts',
    managementTokenAssignmentLine(token, 'EXPO_PUBLIC'),
  );
  const managementName = ['SUPABASE', 'MANAGEMENT', 'TOKEN'].join('_');
  const jsonFindings = scanContent(
    'eas.json',
    JSON.stringify({ [managementName]: token }),
  );
  for (const findings of [
    privateFindings,
    publicFindings,
    jsonFindings,
  ]) {
    assert.equal(
      findings.some(
        (finding) =>
          finding.pattern === 'supabase-management-token-assignment',
      ),
      true,
    );
    for (const finding of findings) {
      assert.equal(finding.redacted.includes(token), false);
    }
  }
  assert.deepEqual(
    scanContent('.env.example', managementTokenAssignmentLine('')),
    [],
  );
});

test('JWT signing-secret assignments fail while empty assignments pass', () => {
  const secret = 'fixture-jwt-signing-secret';
  const envFindings = scanContent(
    'app.config.ts',
    jwtSigningSecretAssignmentLine(secret, 'EXPO_PUBLIC'),
  );
  const gotrueName = ['GOTRUE', 'JWT', 'SECRET'].join('_');
  const jsonFindings = scanContent(
    'eas.json',
    `"${gotrueName}": "${secret}"\n`,
  );
  const genericName = ['JWT', 'SIGNING', 'SECRET'].join('_');
  const jsFindings = scanContent(
    'app.config.ts',
    `${genericName}: '${secret}'\n`,
  );
  for (const findings of [envFindings, jsonFindings, jsFindings]) {
    assert.equal(
      findings.some(
        (finding) => finding.pattern === 'jwt-signing-secret-assignment',
      ),
      true,
    );
    for (const finding of findings) {
      assert.equal(finding.redacted.includes(secret), false);
    }
  }
  assert.deepEqual(
    scanContent('.env.example', jwtSigningSecretAssignmentLine('')),
    [],
  );
});

test('plant token then remove: fail then pass (temp tree)', (t) => {
  const root = createTempRepo(t);
  const planted = path.join('app', 'planted.ts');

  write(root, planted, `export const leak = "${TEST_TOKEN}";\n`);
  write(
    root,
    'docs/ok.md',
    'Prose about service_role is fine without an assignment.\n',
  );
  write(
    root,
    '.env.example',
    'EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eazy-review-fake-anon-key-not-real\n',
  );

  const dirty = scanRepository(root);
  assert.equal(
    dirty.some((f) => f.pattern === 'deliberate-test-token'),
    true,
    'planted token must fail the scan',
  );
  assert.equal(main(['--root', root]), 1);

  write(root, planted, 'export const clean = true;\n');
  const clean = scanRepository(root);
  assert.deepEqual(clean, []);
  assert.equal(main(['--root', root]), 0);
});

test('real repo checkout scan is clean (no planted token left)', () => {
  const repoRoot = path.resolve(__dirname, '..');
  const findings = scanRepository(repoRoot);
  assert.deepEqual(
    findings,
    [],
    `unexpected findings:\n${findings
      .map((f) => `${f.file}:${f.line} [${f.pattern}] ${f.redacted}`)
      .join('\n')}`,
  );
});
