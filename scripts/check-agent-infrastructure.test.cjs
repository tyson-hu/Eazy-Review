'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  extractTaskReferences,
  reportImpactedDocuments,
  runCheck,
  validateConfig,
} = require('./check-agent-infrastructure.cjs');

const TASK_FIELDS = [
  'Status',
  'Depends on',
  'Unlocks',
  'Execution owner',
  'Parallel-safe with',
  'Human gate',
];
const REPO_ROOT = path.resolve(__dirname, '..');

function write(root, relativePath, content) {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content, 'utf8');
}

function taskDocument({
  cycle = false,
  laterCycle = false,
  omitHumanGate = false,
  unknownLaterTask = false,
} = {}) {
  const task13HumanGate = omitHumanGate ? [] : ['Human gate: None.'];
  let task13Dependency = 'Depends on: Task 12.';
  if (cycle) {
    task13Dependency = 'Depends on: Task 14.';
  } else if (laterCycle) {
    task13Dependency = 'Depends on: Tasks 12 and 14.';
  } else if (unknownLaterTask) {
    task13Dependency = 'Depends on: Tasks 12, 999.';
  }
  return [
    '# Fixture Tasks',
    '',
    '## Task 13: First fixture task',
    '',
    'Status: **Next — not started.**',
    task13Dependency,
    'Unlocks: Task 14.',
    'Execution owner: Parent.',
    'Parallel-safe with: None.',
    ...task13HumanGate,
    '',
    'Goal: prove strict metadata parsing.',
    '',
    '## Task 14: Second fixture task',
    '',
    'Status: Pending.',
    'Depends on: Task 13.',
    'Unlocks: None.',
    'Execution owner: Parent.',
    'Parallel-safe with: None.',
    'Human gate: None.',
    '',
    'Goal: prove dependency parsing.',
    '',
  ].join('\n');
}

function baseConfig() {
  return {
    version: 1,
    owners: [
      { id: 'generated-command', description: 'Generated fixture owner.' },
      { id: 'historical-record', description: 'Historical fixture owner.' },
      { id: 'parent-agent', description: 'Canonical fixture owner.' },
      { id: 'tool-adapter', description: 'Mirror fixture owner.' },
    ],
    documents: [
      {
        path: 'canonical-a.md',
        lifecycle: 'evergreen',
        owner: 'parent-agent',
      },
      {
        path: 'canonical-b.md',
        lifecycle: 'evergreen',
        owner: 'parent-agent',
      },
      {
        path: 'docs/TASKS.md',
        lifecycle: 'status',
        owner: 'parent-agent',
      },
      {
        path: 'generated.md',
        lifecycle: 'generated',
        owner: 'generated-command',
      },
      {
        path: 'history',
        lifecycle: 'historical',
        owner: 'historical-record',
      },
      {
        path: 'mirror.md',
        lifecycle: 'mirror',
        owner: 'tool-adapter',
      },
    ],
    mirrors: [
      {
        source: 'canonical-a.md',
        mirror: 'mirror.md',
        relationship: 'summary',
      },
    ],
    generatedFiles: [
      {
        path: 'generated.md',
        source: 'canonical-b.md',
        checkCommand: 'npm run check:generated',
      },
    ],
    dependencies: [
      {
        document: 'canonical-b.md',
        dependsOn: 'canonical-a.md',
        reason: 'Fixture B consumes fixture A.',
      },
    ],
    staleTerms: {
      scanLifecycles: ['evergreen', 'mirror', 'status'],
      historicalAllowlist: ['history', 'history/**'],
      rules: [
        {
          id: 'old-expo-sdk',
          pattern: '\\bExpo SDK (?:[0-9]|[1-4][0-9]|5[0-6])\\b',
          flags: 'g',
          allowlist: [],
        },
      ],
    },
    impactRules: [
      {
        id: 'source-impact',
        changedPaths: ['src/**'],
        requiredDocuments: ['canonical-a.md'],
      },
    ],
    taskGraph: {
      document: 'docs/TASKS.md',
      firstTask: 13,
      lastTask: 14,
      allowedExternalTasks: [12],
      fields: TASK_FIELDS,
    },
  };
}

function createFixture(t) {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), 'eazy-review-agent-infrastructure-'),
  );
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  write(root, 'canonical-a.md', '# Canonical A\n');
  write(root, 'canonical-b.md', '# Canonical B\n');
  write(root, 'mirror.md', 'Canonical source: canonical-a.md\n');
  write(root, 'generated.md', 'Generated fixture.\n');
  write(root, 'history/old.md', 'Historical Expo SDK 50 reference.\n');
  write(root, 'docs/TASKS.md', taskDocument());
  write(
    root,
    'package.json',
    `${JSON.stringify({ scripts: { 'check:generated': 'node --version' } }, null, 2)}\n`,
  );
  return root;
}

test('validateConfig rejects malformed manifest data', () => {
  assert.throws(() => validateConfig(null), /must be a JSON object/);
  assert.throws(
    () => validateConfig({ ...baseConfig(), surprise: true }),
    /unexpected surprise/,
  );
  const malformed = baseConfig();
  malformed.documents[0] = { ...malformed.documents[0], lifecycle: 'temporary' };
  assert.throws(() => validateConfig(malformed), /supported lifecycle/);

  const invalidRequirement = baseConfig();
  invalidRequirement.documents[0] = {
    ...invalidRequirement.documents[0],
    requiredOnDisk: 'sometimes',
  };
  assert.throws(
    () => validateConfig(invalidRequirement),
    /requiredOnDisk must be a boolean/,
  );
});

test('runCheck reports every declared missing path', (t) => {
  const root = createFixture(t);
  fs.unlinkSync(path.join(root, 'canonical-b.md'));
  assert.throws(
    () => runCheck({ repoRoot: root, config: baseConfig() }),
    /Missing document: canonical-b\.md/,
  );
});

test('runCheck allows an explicitly optional document to be absent', (t) => {
  const root = createFixture(t);
  const config = baseConfig();
  config.documents[0] = {
    ...config.documents[0],
    requiredOnDisk: false,
  };
  fs.unlinkSync(path.join(root, 'canonical-a.md'));
  assert.doesNotThrow(() => runCheck({ repoRoot: root, config }));
});

test('validateConfig rejects document dependency cycles', () => {
  const config = baseConfig();
  config.dependencies.push({
    document: 'canonical-a.md',
    dependsOn: 'canonical-b.md',
    reason: 'Invalid reverse fixture dependency.',
  });
  assert.throws(() => validateConfig(config), /Document dependency cycle/);
});

test('validateConfig rejects invalid source and mirror relationships', () => {
  const config = baseConfig();
  config.mirrors[0].source = 'mirror.md';
  config.mirrors[0].mirror = 'canonical-a.md';
  assert.throws(
    () => validateConfig(config),
    /source must be an active canonical document|mirror must have lifecycle/,
  );
});

test('GEMINI.md is registered as an AGENTS.md pointer and pointer content is validated', (t) => {
  const repositoryConfig = JSON.parse(
    fs.readFileSync(
      path.join(REPO_ROOT, 'config', 'agent-infrastructure.json'),
      'utf8',
    ),
  );
  assert.deepEqual(
    repositoryConfig.documents.find(({ path: documentPath }) =>
      documentPath === 'GEMINI.md'
    ),
    {
      path: 'GEMINI.md',
      lifecycle: 'mirror',
      owner: 'tool-adapter',
    },
  );
  assert.deepEqual(
    repositoryConfig.mirrors.find(({ mirror }) => mirror === 'GEMINI.md'),
    {
      source: 'AGENTS.md',
      mirror: 'GEMINI.md',
      relationship: 'pointer',
    },
  );

  const root = createFixture(t);
  const config = baseConfig();
  config.documents.push({
    path: 'GEMINI.md',
    lifecycle: 'mirror',
    owner: 'tool-adapter',
  });
  config.mirrors.push({
    source: 'canonical-b.md',
    mirror: 'GEMINI.md',
    relationship: 'pointer',
  });
  write(root, 'GEMINI.md', '@canonical-b.md\n');
  assert.doesNotThrow(() => runCheck({ repoRoot: root, config }));

  write(
    root,
    'GEMINI.md',
    '@different-source.md\n<!-- canonical-b.md is the expected source. -->\n',
  );
  assert.throws(
    () => runCheck({ repoRoot: root, config }),
    /Pointer mirror GEMINI\.md must contain exactly @canonical-b\.md/,
  );
});

test('stale-term line allowlists and historical allowlists are explicit', (t) => {
  const root = createFixture(t);
  const config = baseConfig();
  config.staleTerms.rules[0].allowlist = [
    {
      path: 'canonical-a.md',
      linePattern: '\\bobsolete\\b',
      flags: 'i',
    },
  ];

  write(root, 'canonical-a.md', 'Expo SDK 50 is obsolete.\n');
  assert.doesNotThrow(() => runCheck({ repoRoot: root, config }));

  write(root, 'canonical-a.md', 'Use Expo SDK 50.\n');
  assert.throws(
    () => runCheck({ repoRoot: root, config }),
    /canonical-a\.md:1: \[old-expo-sdk\]/,
  );
});

test('active document directories scan current ADRs but exclude registered archives', (t) => {
  const repositoryConfig = JSON.parse(
    fs.readFileSync(
      path.join(REPO_ROOT, 'config', 'agent-infrastructure.json'),
      'utf8',
    ),
  );
  assert.deepEqual(
    repositoryConfig.documents.find(({ path: documentPath }) =>
      documentPath === 'docs/decisions'
    ),
    {
      path: 'docs/decisions',
      lifecycle: 'evergreen',
      owner: 'parent-agent',
    },
  );
  assert.equal(
    repositoryConfig.documents.find(({ path: documentPath }) =>
      documentPath === 'docs/decisions/README.md'
    )?.lifecycle,
    'evergreen',
  );
  assert.equal(
    repositoryConfig.documents.find(({ path: documentPath }) =>
      documentPath === 'docs/decisions/archive'
    )?.lifecycle,
    'historical',
  );

  const root = createFixture(t);
  const config = baseConfig();
  config.documents.push(
    {
      path: 'docs/decisions',
      lifecycle: 'evergreen',
      owner: 'parent-agent',
    },
    {
      path: 'docs/decisions/archive',
      lifecycle: 'historical',
      owner: 'historical-record',
    },
  );
  config.staleTerms.historicalAllowlist.push(
    'docs/decisions/archive',
    'docs/decisions/archive/**',
  );
  write(root, 'docs/decisions/current.md', 'Use Expo SDK 57.\n');
  write(root, 'docs/decisions/archive/old.md', 'Use Expo SDK 50.\n');

  assert.doesNotThrow(() => runCheck({ repoRoot: root, config }));

  write(root, 'docs/decisions/current.md', 'Use Expo SDK 50.\n');
  assert.throws(
    () => runCheck({ repoRoot: root, config }),
    /docs\/decisions\/current\.md:1: \[old-expo-sdk\]/,
  );
});

test('strict task parsing rejects missing metadata instead of silently skipping it', (t) => {
  const root = createFixture(t);
  write(root, 'docs/TASKS.md', taskDocument({ omitHumanGate: true }));
  assert.throws(
    () => runCheck({ repoRoot: root, config: baseConfig() }),
    /Task 13 must contain exactly one "Human gate:" field/,
  );
});

test('task dependency graph rejects cycles', (t) => {
  const root = createFixture(t);
  write(root, 'docs/TASKS.md', taskDocument({ cycle: true }));
  assert.throws(
    () => runCheck({ repoRoot: root, config: baseConfig() }),
    /Task dependency cycle/,
  );
});

test('task references support comma and and lists without ignoring later members', (t) => {
  assert.deepEqual(extractTaskReferences('Tasks 14, 15, and 16.'), [14, 15, 16]);
  assert.deepEqual(extractTaskReferences('Tasks 14 and 16.'), [14, 16]);
  assert.throws(
    () => extractTaskReferences('Tasks 14 / 16.'),
    /Unrecognized task-number syntax/,
  );
  const root = createFixture(t);
  write(root, 'docs/TASKS.md', taskDocument({ unknownLaterTask: true }));
  assert.throws(
    () => runCheck({ repoRoot: root, config: baseConfig() }),
    /references unknown Task 999/,
  );
  write(root, 'docs/TASKS.md', taskDocument({ laterCycle: true }));
  assert.throws(
    () => runCheck({ repoRoot: root, config: baseConfig() }),
    /Task dependency cycle/,
  );
});

test('report mode expands impact rules through dependencies, mirrors, and generators', (t) => {
  const root = createFixture(t);
  const config = baseConfig();
  const report = reportImpactedDocuments(config, ['src/example.ts'], root);
  assert.deepEqual(report.changedPaths, ['src/example.ts']);
  assert.deepEqual(report.documents, [
    'canonical-a.md',
    'canonical-b.md',
    'generated.md',
    'mirror.md',
  ]);
});

test('report mode maps a changed mirror back to its canonical source', (t) => {
  const root = createFixture(t);
  const report = reportImpactedDocuments(baseConfig(), ['mirror.md'], root);
  assert.deepEqual(report.documents, [
    'canonical-a.md',
    'canonical-b.md',
    'generated.md',
    'mirror.md',
  ]);
});

test('CLI report mode remains available while active documents are stale', (t) => {
  const root = createFixture(t);
  const configPath = path.join(root, 'agent-infrastructure.json');
  write(root, 'canonical-a.md', 'Use Expo SDK 50.\n');
  write(root, 'agent-infrastructure.json', `${JSON.stringify(baseConfig())}\n`);
  const result = spawnSync(
    process.execPath,
    [
      path.join(__dirname, 'check-agent-infrastructure.cjs'),
      '--root',
      root,
      '--config',
      configPath,
      '--report',
      'src/example.ts',
    ],
    { encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Agent infrastructure impact report/);
  assert.match(result.stdout, /canonical-a\.md/);
});

test('valid fixture preserves mirror, dependency, and task-graph validation', (t) => {
  const root = createFixture(t);
  const summary = runCheck({ repoRoot: root, config: baseConfig() });
  assert.deepEqual(summary, {
    documents: 6,
    dependencies: 1,
    scannedFiles: 4,
    tasks: 2,
  });
});
