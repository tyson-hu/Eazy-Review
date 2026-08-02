'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  advanceRegexIndex,
  extractTaskReferences,
  globToRegExp,
  parseTaskGraph,
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
const FIXTURE_FIRST_TASK = 13;
const FIXTURE_LAST_TASK = 29;

function write(root, relativePath, content) {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content, 'utf8');
}

function fixtureTaskTitle(taskNumber) {
  if (taskNumber === 13) {
    return 'First fixture task';
  }
  if (taskNumber === 14) {
    return 'Second fixture task';
  }
  return `Fixture task ${taskNumber}`;
}

function fixtureTaskStatus(taskNumber) {
  return taskNumber === 13 ? 'Next — not started' : 'Pending';
}

function fixtureSequenceLines(firstTask, lastTask) {
  const rows = [];
  for (let taskNumber = firstTask; taskNumber <= lastTask; taskNumber += 1) {
    rows.push(
      `| ${taskNumber} | ${fixtureTaskTitle(taskNumber)} | ${fixtureTaskStatus(taskNumber)} |`,
    );
  }
  return [
    '## Revised Sequence',
    '',
    '| Task | Title | Status |',
    '| --- | --- | --- |',
    ...rows,
    '',
  ];
}

function fixtureTaskSection(taskNumber, {
  dependsOn,
  unlocks,
  owner,
  parallel = 'None.',
  status,
  humanGate,
} = {}) {
  const defaultOwner =
    taskNumber >= 16 && taskNumber <= 19
      ? 'Parent — verified strong; the generic implementer may receive only bounded non-sensitive leaf packets.'
      : 'Parent.';
  const defaultHumanGate =
    taskNumber === 19
      ? 'Human gate: Actual account deletion is human-only on every environment; the staging destructive checklist is also human-run.'
      : 'Human gate: None.';
  const lines = [
    `## Task ${taskNumber}: ${fixtureTaskTitle(taskNumber)}`,
    '',
    `Status: ${status ?? (taskNumber === 13 ? '**Next — not started.**' : 'Pending.')}`,
    `Depends on: ${dependsOn}`,
    `Unlocks: ${unlocks}`,
    `Execution owner: ${owner ?? defaultOwner}`,
    `Parallel-safe with: ${parallel}`,
  ];
  const gateLine = humanGate === null ? null : (humanGate ?? defaultHumanGate);
  if (gateLine) {
    lines.push(gateLine);
  }
  lines.push('', `Goal: prove metadata for task ${taskNumber}.`, '');
  return lines;
}

function taskDocument({
  cycle = false,
  laterCycle = false,
  omitHumanGate = false,
  firstTask = FIXTURE_FIRST_TASK,
  lastTask = FIXTURE_LAST_TASK,
  task13Owner = 'Parent.',
  task13Parallel = 'None.',
  task13Unlocks = 'Task 14.',
  task14Dependency = 'Task 13.',
  task14Owner = 'Parent.',
  task14Parallel = 'None.',
  task14Unlocks,
  unknownLaterTask = false,
} = {}) {
  let task13DependsOn = 'Task 12.';
  if (cycle) {
    task13DependsOn = 'Task 14.';
  } else if (laterCycle) {
    task13DependsOn = 'Tasks 12 and 14.';
  } else if (unknownLaterTask) {
    task13DependsOn = 'Tasks 12, 999.';
  }

  const lines = ['# Fixture Tasks', '', ...fixtureSequenceLines(firstTask, lastTask)];
  for (let taskNumber = firstTask; taskNumber <= lastTask; taskNumber += 1) {
    if (taskNumber === 13) {
      lines.push(
        ...fixtureTaskSection(13, {
          dependsOn: task13DependsOn,
          unlocks: task13Unlocks,
          owner: task13Owner,
          parallel: task13Parallel,
          status: '**Next — not started.**',
          humanGate: omitHumanGate ? null : 'Human gate: None.',
        }),
      );
      continue;
    }
    if (taskNumber === 14) {
      const unlocks =
        task14Unlocks ??
        (lastTask > 14 ? `Task ${taskNumber + 1}.` : 'None.');
      const dependsOn = task14Dependency.replace(/^Depends on:\s*/i, '');
      lines.push(
        ...fixtureTaskSection(14, {
          dependsOn,
          unlocks,
          owner: task14Owner,
          parallel: task14Parallel,
        }),
      );
      continue;
    }
    lines.push(
      ...fixtureTaskSection(taskNumber, {
        dependsOn: `Task ${taskNumber - 1}.`,
        unlocks: taskNumber === lastTask ? 'None.' : `Task ${taskNumber + 1}.`,
      }),
    );
  }
  return lines.join('\n');
}

function transitiveParallelConflictDocument() {
  return [
    '# Fixture Tasks',
    '',
    '## Revised Sequence',
    '',
    '| Task | Title | Status |',
    '| --- | --- | --- |',
    '| 13 | First fixture task | Pending |',
    '| 14 | Second fixture task | Pending |',
    '| 15 | Third fixture task | Pending |',
    '',
    '## Task 13: First fixture task',
    '',
    'Status: Pending.',
    'Depends on: Task 12.',
    'Unlocks: Task 14.',
    'Execution owner: Parent.',
    'Parallel-safe with: Task 15.',
    'Human gate: None.',
    '',
    'Goal: start the dependency chain.',
    '',
    '## Task 14: Second fixture task',
    '',
    'Status: Pending.',
    'Depends on: Task 13.',
    'Unlocks: Task 15.',
    'Execution owner: Parent.',
    'Parallel-safe with: None.',
    'Human gate: None.',
    '',
    'Goal: continue the dependency chain.',
    '',
    '## Task 15: Third fixture task',
    '',
    'Status: Pending.',
    'Depends on: Task 14.',
    'Unlocks: None.',
    'Execution owner: Parent.',
    'Parallel-safe with: None.',
    'Human gate: None.',
    '',
    'Goal: finish the dependency chain.',
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
        kind: 'file',
        lifecycle: 'evergreen',
        owner: 'parent-agent',
      },
      {
        path: 'canonical-b.md',
        kind: 'file',
        lifecycle: 'evergreen',
        owner: 'parent-agent',
      },
      {
        path: 'docs/TASKS.md',
        kind: 'file',
        lifecycle: 'status',
        owner: 'parent-agent',
      },
      {
        path: 'generated.md',
        kind: 'file',
        lifecycle: 'generated',
        owner: 'generated-command',
      },
      {
        path: 'history',
        kind: 'directory',
        lifecycle: 'historical',
        owner: 'historical-record',
      },
      {
        path: 'mirror.md',
        kind: 'file',
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
      firstTask: FIXTURE_FIRST_TASK,
      lastTask: FIXTURE_LAST_TASK,
      allowedExternalTasks: [12],
      fields: TASK_FIELDS,
    },
  };
}

function narrowTaskGraph(lastTask = 14, firstTask = FIXTURE_FIRST_TASK) {
  return {
    ...baseConfig().taskGraph,
    firstTask,
    lastTask,
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

  const incompleteScanLifecycles = baseConfig();
  incompleteScanLifecycles.staleTerms.scanLifecycles = ['mirror', 'status'];
  assert.throws(
    () => validateConfig(incompleteScanLifecycles),
    /staleTerms.scanLifecycles must include required active lifecycle "evergreen"/,
  );
  const malformed = baseConfig();
  malformed.documents[0] = { ...malformed.documents[0], lifecycle: 'temporary' };
  assert.throws(() => validateConfig(malformed), /supported lifecycle/);

  const invalidKind = baseConfig();
  invalidKind.documents[0] = { ...invalidKind.documents[0], kind: 'artifact' };
  assert.throws(() => validateConfig(invalidKind), /kind must be "file" or "directory"/);

  const invalidRequirement = baseConfig();
  invalidRequirement.documents[0] = {
    ...invalidRequirement.documents[0],
    requiredOnDisk: 'sometimes',
  };
  assert.throws(
    () => validateConfig(invalidRequirement),
    /requiredOnDisk must be a boolean/,
  );

  const stickyStaleTerm = baseConfig();
  stickyStaleTerm.staleTerms.rules[0].flags = 'y';
  assert.throws(
    () => validateConfig(stickyStaleTerm),
    /flags contains unsupported regular-expression flags/,
  );

  const stickyAllowlist = baseConfig();
  stickyAllowlist.staleTerms.rules[0].allowlist = [
    {
      path: 'canonical-a.md',
      linePattern: 'Expo SDK 50',
      flags: 'y',
    },
  ];
  assert.throws(
    () => validateConfig(stickyAllowlist),
    /flags contains unsupported regular-expression flags/,
  );

  const duplicateFlags = baseConfig();
  duplicateFlags.staleTerms.rules[0].flags = 'ii';
  assert.throws(
    () => validateConfig(duplicateFlags),
    /contains duplicate value "i"/,
  );

  const validFlags = baseConfig();
  validFlags.staleTerms.rules[0].flags = 'giu';
  assert.doesNotThrow(() => validateConfig(validFlags));
});

test('stale-term scans detect matches away from offset zero', (t) => {
  const root = createFixture(t);
  const config = baseConfig();
  write(root, 'canonical-a.md', 'prefix text Expo SDK 50 trailing\n');
  assert.throws(
    () => runCheck({ repoRoot: root, config }),
    /canonical-a\.md:1: \[old-expo-sdk\] "Expo SDK 50"/,
  );
});

test('stale official rating label rejects singular and plural forms', (t) => {
  const root = createFixture(t);
  const config = baseConfig();
  config.staleTerms.rules.push({
    id: 'obsolete-official-rating-label',
    pattern: '\\bofficial ratings?\\b',
    flags: 'gi',
    allowlist: [],
  });
  write(root, 'canonical-a.md', 'See Official Ratings for comparison.\n');
  assert.throws(
    () => runCheck({ repoRoot: root, config }),
    /\[obsolete-official-rating-label\] "Official Ratings"/,
  );
  write(root, 'canonical-a.md', 'Avoid official rating labels.\n');
  assert.throws(
    () => runCheck({ repoRoot: root, config }),
    /\[obsolete-official-rating-label\] "official rating"/,
  );
  write(root, 'canonical-a.md', '# Canonical A\n');
  assert.doesNotThrow(() => runCheck({ repoRoot: root, config }));
});

test('repository globs must be normalized relative paths', () => {
  for (const glob of [
    '/app/**',
    './app/**',
    'docs/../app/**',
    'app//**',
    'app/',
    'app\\**',
  ]) {
    assert.throws(() => globToRegExp(glob), /Invalid repository glob/, glob);
  }
  for (const glob of ['app/**', '.claude/**', '**/*.md']) {
    assert.doesNotThrow(() => globToRegExp(glob), glob);
  }
});

test('runCheck reports every declared missing path', (t) => {
  const root = createFixture(t);
  fs.unlinkSync(path.join(root, 'canonical-b.md'));
  assert.throws(
    () => runCheck({ repoRoot: root, config: baseConfig() }),
    /Missing document: canonical-b\.md/,
  );
});

test('optional documents are limited to transient session status', (t) => {
  const root = createFixture(t);
  for (const lifecycle of ['evergreen', 'generated', 'historical', 'mirror']) {
    const invalidLifecycle = baseConfig();
    invalidLifecycle.documents[0] = {
      ...invalidLifecycle.documents[0],
      lifecycle,
      requiredOnDisk: false,
    };
    assert.throws(
      () => validateConfig(invalidLifecycle),
      /requiredOnDisk may be false only for transient status documents under docs\/notes\//,
      lifecycle,
    );
  }

  const invalidPath = baseConfig();
  invalidPath.documents[0] = {
    ...invalidPath.documents[0],
    lifecycle: 'status',
    requiredOnDisk: false,
  };
  assert.throws(
    () => validateConfig(invalidPath),
    /requiredOnDisk may be false only for transient status documents under docs\/notes\//,
  );

  const valid = baseConfig();
  valid.documents.push({
    path: 'docs/notes/transient.md',
    kind: 'file',
    lifecycle: 'status',
    owner: 'parent-agent',
    requiredOnDisk: false,
  });
  assert.doesNotThrow(() => runCheck({ repoRoot: root, config: valid }));
});

test('declared paths stay inside the real repository root', (t) => {
  const root = createFixture(t);

  assert.doesNotThrow(() => runCheck({ repoRoot: root, config: baseConfig() }));

  const directLinkConfig = baseConfig();
  directLinkConfig.documents.push({
    path: 'direct-link.md',
    kind: 'file',
    lifecycle: 'evergreen',
    owner: 'parent-agent',
  });
  fs.symlinkSync('canonical-a.md', path.join(root, 'direct-link.md'));
  assert.throws(
    () => runCheck({ repoRoot: root, config: directLinkConfig }),
    /must not be a symbolic link: direct-link\.md/,
  );

  const externalRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'eazy-review-agent-infrastructure-external-'),
  );
  t.after(() => fs.rmSync(externalRoot, { recursive: true, force: true }));
  write(externalRoot, 'record.md', 'External record.\n');
  write(externalRoot, 'records/nested.md', 'External nested record.\n');
  fs.symlinkSync(externalRoot, path.join(root, 'external'));

  for (const escapedPath of ['external/record.md', 'external/records']) {
    const escapedConfig = baseConfig();
    escapedConfig.documents.push({
      path: escapedPath,
      kind: escapedPath.endsWith('/records') ? 'directory' : 'file',
      lifecycle: 'evergreen',
      owner: 'parent-agent',
    });
    assert.throws(
      () => runCheck({ repoRoot: root, config: escapedConfig }),
      new RegExp(`resolves outside the repository: ${escapedPath}`),
    );
  }

  write(root, 'contained/record.md', 'Contained record.\n');
  fs.symlinkSync('contained', path.join(root, 'contained-alias'));
  const containedConfig = baseConfig();
  containedConfig.documents.push({
    path: 'contained-alias/record.md',
    kind: 'file',
    lifecycle: 'evergreen',
    owner: 'parent-agent',
  });
  assert.doesNotThrow(() => runCheck({ repoRoot: root, config: containedConfig }));

  const optionalConfig = baseConfig();
  optionalConfig.documents.push({
    path: 'docs/notes/optional.md',
    kind: 'file',
    lifecycle: 'status',
    owner: 'parent-agent',
    requiredOnDisk: false,
  });
  assert.doesNotThrow(() => runCheck({ repoRoot: root, config: optionalConfig }));
});

test('registered document kinds reject file and directory substitutions', (t) => {
  const root = createFixture(t);

  fs.unlinkSync(path.join(root, 'canonical-a.md'));
  write(root, 'canonical-a.md/child.md', 'Wrong kind.\n');
  assert.throws(
    () => runCheck({ repoRoot: root, config: baseConfig() }),
    /Declared document must be a file: canonical-a\.md/,
  );

  fs.rmSync(path.join(root, 'canonical-a.md'), { recursive: true });
  write(root, 'canonical-a.md', '# Canonical A\n');
  fs.rmSync(path.join(root, 'history'), { recursive: true });
  write(root, 'history', 'Wrong kind.\n');
  assert.throws(
    () => runCheck({ repoRoot: root, config: baseConfig() }),
    /Declared document must be a directory: history/,
  );
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

test('generated sources must be registered active canonical documents', (t) => {
  const root = createFixture(t);
  assert.doesNotThrow(() => runCheck({ repoRoot: root, config: baseConfig() }));

  write(root, 'unregistered.md', 'Existing but unregistered.\n');
  const unregistered = baseConfig();
  unregistered.generatedFiles[0].source = 'unregistered.md';
  assert.throws(
    () => runCheck({ repoRoot: root, config: unregistered }),
    /generatedFiles\[0\]\.source is not in the document registry/,
  );

  const missing = baseConfig();
  missing.documents.push({
    path: 'missing-source.md',
    kind: 'file',
    lifecycle: 'evergreen',
    owner: 'parent-agent',
  });
  missing.generatedFiles[0].source = 'missing-source.md';
  assert.throws(
    () => runCheck({ repoRoot: root, config: missing }),
    /Missing document: missing-source\.md/,
  );

  for (const [sourcePath, lifecycle] of [
    ['generated.md', 'generated'],
    ['history', 'historical'],
    ['mirror.md', 'mirror'],
  ]) {
    const invalidLifecycle = baseConfig();
    invalidLifecycle.generatedFiles[0].source = sourcePath;
    assert.throws(
      () => validateConfig(invalidLifecycle),
      /generatedFiles\[0\]\.source must be an active canonical document/,
      lifecycle,
    );
  }

  const repositoryConfig = JSON.parse(
    fs.readFileSync(
      path.join(REPO_ROOT, 'config', 'agent-infrastructure.json'),
      'utf8',
    ),
  );
  assert.doesNotThrow(() => validateConfig(repositoryConfig));
  assert.deepEqual(
    [...new Set(repositoryConfig.generatedFiles.map(({ source }) => source))].sort(),
    ['docs/decisions', 'skills/manifest.json'],
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
      kind: 'file',
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
    kind: 'file',
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

test('UI_STYLE.md is registered as an active DESIGN.md mirror', () => {
  const repositoryConfig = JSON.parse(
    fs.readFileSync(
      path.join(REPO_ROOT, 'config', 'agent-infrastructure.json'),
      'utf8',
    ),
  );
  assert.deepEqual(
    repositoryConfig.documents.find(({ path: documentPath }) =>
      documentPath === 'docs/UI_STYLE.md'
    ),
    {
      path: 'docs/UI_STYLE.md',
      kind: 'file',
      lifecycle: 'mirror',
      owner: 'tool-adapter',
    },
  );
  assert.deepEqual(
    repositoryConfig.mirrors.find(({ mirror }) => mirror === 'docs/UI_STYLE.md'),
    {
      source: 'docs/DESIGN.md',
      mirror: 'docs/UI_STYLE.md',
      relationship: 'summary',
    },
  );

  const report = reportImpactedDocuments(
    repositoryConfig,
    ['docs/UI_STYLE.md'],
    REPO_ROOT,
  );
  assert.ok(report.documents.includes('docs/UI_STYLE.md'));
  assert.ok(report.documents.includes('docs/DESIGN.md'));
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
      kind: 'directory',
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
      kind: 'directory',
      lifecycle: 'evergreen',
      owner: 'parent-agent',
    },
    {
      path: 'docs/decisions/archive',
      kind: 'directory',
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

test('session notes are active while the transient handoff remains optional', (t) => {
  const repositoryConfig = JSON.parse(
    fs.readFileSync(
      path.join(REPO_ROOT, 'config', 'agent-infrastructure.json'),
      'utf8',
    ),
  );
  assert.deepEqual(
    repositoryConfig.documents.find(({ path: documentPath }) =>
      documentPath === 'docs/notes'
    ),
    {
      path: 'docs/notes',
      kind: 'directory',
      lifecycle: 'status',
      owner: 'parent-agent',
    },
  );
  assert.equal(
    repositoryConfig.documents.find(({ path: documentPath }) =>
      documentPath === 'docs/notes/handoff.md'
    )?.requiredOnDisk,
    false,
  );
  const report = reportImpactedDocuments(
    repositoryConfig,
    ['docs/notes/README.md'],
    REPO_ROOT,
  );
  assert.ok(report.documents.includes('docs/notes'));

  const root = createFixture(t);
  const config = baseConfig();
  config.documents.push(
    {
      path: 'docs/notes',
      kind: 'directory',
      lifecycle: 'status',
      owner: 'parent-agent',
    },
    {
      path: 'docs/notes/handoff.md',
      kind: 'file',
      lifecycle: 'status',
      owner: 'parent-agent',
      requiredOnDisk: false,
    },
  );
  write(root, 'docs/notes/README.md', '# Session notes\n');
  assert.doesNotThrow(() => runCheck({ repoRoot: root, config }));

  write(root, 'docs/notes/blocker-example.md', 'Use Expo SDK 50.\n');
  assert.throws(
    () => runCheck({ repoRoot: root, config }),
    /docs\/notes\/blocker-example\.md:1: \[old-expo-sdk\]/,
  );

  fs.unlinkSync(path.join(root, 'docs/notes/blocker-example.md'));
  fs.symlinkSync(
    path.join(root, 'canonical-a.md'),
    path.join(root, 'docs/notes/blocker-example.md'),
  );
  assert.throws(
    () => runCheck({ repoRoot: root, config }),
    /Active document traversal must not include a symbolic link: docs\/notes\/blocker-example\.md/,
  );
});

test('historical evidence directories are registered, required, and excluded from stale scans', (t) => {
  const historicalPaths = [
    'docs/evidence/pr-24-review-correction',
    'docs/evidence/ui-audit-remediation-20260719',
    'docs/evidence/ui-audit-remediation-20260719-attempt1',
    'docs/evidence/ui-audit-remediation-20260719-attempt2',
  ];
  const repositoryConfig = JSON.parse(
    fs.readFileSync(
      path.join(REPO_ROOT, 'config', 'agent-infrastructure.json'),
      'utf8',
    ),
  );
  for (const historicalPath of historicalPaths) {
    assert.deepEqual(
      repositoryConfig.documents.find(({ path: documentPath }) =>
        documentPath === historicalPath
      ),
      {
        path: historicalPath,
        kind: 'directory',
        lifecycle: 'historical',
        owner: 'historical-record',
      },
    );
    assert.ok(
      repositoryConfig.staleTerms.historicalAllowlist.includes(historicalPath),
    );
    assert.ok(
      repositoryConfig.staleTerms.historicalAllowlist.includes(`${historicalPath}/**`),
    );
  }

  const root = createFixture(t);
  const config = baseConfig();
  for (const historicalPath of historicalPaths) {
    config.documents.push({
      path: historicalPath,
      kind: 'directory',
      lifecycle: 'historical',
      owner: 'historical-record',
    });
    config.staleTerms.historicalAllowlist.push(
      historicalPath,
      `${historicalPath}/**`,
    );
    write(root, `${historicalPath}/RESULT.md`, 'Use Expo SDK 50.\n');
  }
  assert.doesNotThrow(() => runCheck({ repoRoot: root, config }));

  fs.rmSync(path.join(root, historicalPaths[0]), { recursive: true });
  assert.throws(
    () => runCheck({ repoRoot: root, config }),
    /Missing document: docs\/evidence\/pr-24-review-correction/,
  );
});

test('zero-width regex advancement follows Unicode code points and always progresses', (t) => {
  assert.equal(advanceRegexIndex('😀', 0, true), 2);
  assert.equal(advanceRegexIndex('A', 0, true), 1);
  assert.equal(advanceRegexIndex('😀', 0, false), 1);
  assert.equal(advanceRegexIndex('', 0, true), 1);

  const root = createFixture(t);
  const config = baseConfig();
  config.staleTerms.rules[0] = {
    id: 'unicode-zero-width',
    pattern: '(?=😀)',
    flags: 'u',
    allowlist: [],
  };
  write(root, 'canonical-a.md', '😀\n');
  const configPath = path.join(root, 'agent-infrastructure.json');
  write(root, 'agent-infrastructure.json', `${JSON.stringify(config)}\n`);
  const result = spawnSync(
    process.execPath,
    [
      path.join(__dirname, 'check-agent-infrastructure.cjs'),
      '--root',
      root,
      '--config',
      configPath,
    ],
    { encoding: 'utf8', timeout: 1_000 },
  );
  assert.ifError(result.error);
  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /canonical-a\.md:1: \[unicode-zero-width\] ""/,
  );

  config.staleTerms.rules[0] = {
    id: 'unicode-bmp-zero-width',
    pattern: '(?=A)',
    flags: 'u',
    allowlist: [],
  };
  write(root, 'canonical-a.md', 'A\n');
  assert.throws(
    () => runCheck({ repoRoot: root, config }),
    /canonical-a\.md:1: \[unicode-bmp-zero-width\] ""/,
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

test('task parsing ignores HTML-comment-hidden headings, fields, and references', () => {
  const content = taskDocument();
  const secondTask = content.indexOf('## Task 14:');
  const hiddenFirstTask = `<!--\n${content.slice(0, secondTask)}-->\n${content.slice(secondTask)}`;
  assert.throws(
    () => parseTaskGraph(hiddenFirstTask, baseConfig().taskGraph),
    /Task graph requires exactly Task 13 through Task 29 in order; found 14/,
  );

  const inlineComment = taskDocument({
    task13Parallel: 'None. <!-- Task 999 is prose-only. -->',
  });
  assert.doesNotThrow(() => parseTaskGraph(inlineComment, baseConfig().taskGraph));
});

test('task graph rejects raw HTML block wrappers in the machine-parsed region', () => {
  const taskConfig = baseConfig().taskGraph;
  const content = taskDocument();
  const sequenceStart = content.indexOf('## Revised Sequence');
  const wrapped = `${content.slice(0, sequenceStart)}<pre>\n${content.slice(sequenceStart)}\n</pre>\n`;
  assert.throws(
    () => parseTaskGraph(wrapped, taskConfig),
    /forbids raw HTML block syntax/,
  );

  const wrappedAcrossBlank = `${content.slice(0, sequenceStart)}<pre>\n\n${content.slice(sequenceStart)}\n</pre>\n`;
  assert.throws(
    () => parseTaskGraph(wrappedAcrossBlank, taskConfig),
    /forbids raw HTML block syntax/,
  );

  for (const opener of [
    '<script>',
    '<style>',
    '<table>',
    '<div>',
    '<!DOCTYPE html>',
    '<![CDATA[',
  ]) {
    const withOpener = `${content.slice(0, sequenceStart)}${opener}\n${content.slice(sequenceStart)}`;
    assert.throws(
      () => parseTaskGraph(withOpener, taskConfig),
      /forbids raw HTML block syntax/,
      opener,
    );
  }

  const htmlOutsideRegion = [
    '<div>historical note outside the machine region</div>',
    '',
    content,
  ].join('\n');
  assert.doesNotThrow(() => parseTaskGraph(htmlOutsideRegion, taskConfig));

  const angleBracketsInFence = [
    '```html',
    '<pre>example</pre>',
    '```',
    '',
    content,
  ].join('\n');
  assert.doesNotThrow(() => parseTaskGraph(angleBracketsInFence, taskConfig));

  assert.doesNotThrow(() => parseTaskGraph(content, taskConfig));

  const repositoryConfig = JSON.parse(
    fs.readFileSync(
      path.join(REPO_ROOT, 'config', 'agent-infrastructure.json'),
      'utf8',
    ),
  );
  const liveTasks = fs.readFileSync(
    path.join(REPO_ROOT, repositoryConfig.taskGraph.document),
    'utf8',
  );
  assert.doesNotThrow(() =>
    parseTaskGraph(liveTasks, repositoryConfig.taskGraph),
  );
});

test('revised sequence requires header, delimiter, and contiguous data rows', () => {
  const taskConfig = baseConfig().taskGraph;
  assert.doesNotThrow(() => parseTaskGraph(taskDocument(), taskConfig));

  const missingDelimiter = taskDocument().replace(
    '| --- | --- | --- |\n',
    '',
  );
  assert.throws(
    () => parseTaskGraph(missingDelimiter, taskConfig),
    /missing the required delimiter row/,
  );

  const malformedDelimiter = taskDocument().replace(
    '| --- | --- | --- |',
    '| --- | --- |',
  );
  assert.throws(
    () => parseTaskGraph(malformedDelimiter, taskConfig),
    /missing the required delimiter row/,
  );

  const missingHeader = taskDocument().replace(
    '| Task | Title | Status |\n',
    '',
  );
  assert.throws(
    () => parseTaskGraph(missingHeader, taskConfig),
    /missing a Revised Sequence table|missing the required delimiter row|non-canonical table before the required header/,
  );

  const gapAfterDelimiter = taskDocument().replace(
    '| --- | --- | --- |\n| 13 |',
    '| --- | --- | --- |\n\n| 13 |',
  );
  assert.throws(
    () => parseTaskGraph(gapAfterDelimiter, taskConfig),
    /must begin immediately after the delimiter/,
  );

  const gapBetweenRows = taskDocument().replace(
    '| 13 | First fixture task | Next — not started |\n| 14 |',
    '| 13 | First fixture task | Next — not started |\n\n| 14 |',
  );
  assert.throws(
    () => parseTaskGraph(gapBetweenRows, taskConfig),
    /must remain contiguous after the delimiter/,
  );
});

test('staleScan false is limited to machine-readable JSON configuration', () => {
  const allowed = baseConfig();
  allowed.documents.push({
    path: 'config/fixture.json',
    kind: 'file',
    lifecycle: 'evergreen',
    owner: 'parent-agent',
    staleScan: false,
  });
  assert.doesNotThrow(() => validateConfig(allowed));

  const evergreenEscape = baseConfig();
  evergreenEscape.documents[0] = {
    ...evergreenEscape.documents[0],
    staleScan: false,
  };
  assert.throws(
    () => validateConfig(evergreenEscape),
    /staleScan may be false only for machine-readable JSON configuration files/,
  );
});

test('task references enforce singular Task and plural Tasks grammar', () => {
  assert.deepEqual(extractTaskReferences('Task 13.'), [13]);
  assert.deepEqual(extractTaskReferences('Tasks 13–14.'), [13, 14]);
  assert.deepEqual(extractTaskReferences('Tasks 13, 14, and 15.'), [13, 14, 15]);
  assert.throws(
    () => extractTaskReferences('Task 13–14.'),
    /Singular "Task" cannot introduce a range or list/,
  );
  assert.throws(
    () => extractTaskReferences('Tasks 13.'),
    /Plural "Tasks" requires a range or list/,
  );
});

test('stale Task 10+ ownership phrase is detected at word boundaries after plus', (t) => {
  const root = createFixture(t);
  const config = JSON.parse(
    fs.readFileSync(
      path.join(REPO_ROOT, 'config', 'agent-infrastructure.json'),
      'utf8',
    ),
  );
  const rule = config.staleTerms.rules.find(
    (entry) => entry.id === 'stale-task-10-query-owner',
  );
  assert.ok(rule);
  const local = baseConfig();
  local.staleTerms.rules = [rule];
  write(root, 'canonical-a.md', 'Owned by Task 10+ for query work.\n');
  assert.throws(
    () => runCheck({ repoRoot: root, config: local }),
    /\[stale-task-10-query-owner\] "Task 10\+"/,
  );
  write(root, 'canonical-a.md', 'Mentions Task 10+x only as a non-match.\n');
  assert.doesNotThrow(() => runCheck({ repoRoot: root, config: local }));
});

test('task parsing requires a bare fenced-code closing marker', () => {
  const invalidClosingFence = [
    '```text',
    'fixture content',
    '```not-a-closing-fence',
    taskDocument(),
  ].join('\n');
  assert.throws(
    () => parseTaskGraph(invalidClosingFence, baseConfig().taskGraph),
    /found none/,
  );

  const validClosingFence = [
    '```text',
    'fixture content',
    '```   ',
    taskDocument(),
  ].join('\n');
  assert.doesNotThrow(() => parseTaskGraph(validClosingFence, baseConfig().taskGraph));
});

test('task parsing recognizes fence markers only with zero to three leading spaces', () => {
  const taskConfig = baseConfig().taskGraph;
  const liveTasks = fs.readFileSync(path.join(REPO_ROOT, 'docs', 'TASKS.md'), 'utf8');
  const repositoryConfig = JSON.parse(
    fs.readFileSync(
      path.join(REPO_ROOT, 'config', 'agent-infrastructure.json'),
      'utf8',
    ),
  );

  for (const indent of ['', ' ', '  ', '   ']) {
    const indentedFence = [
      `${indent}\`\`\`text`,
      'fixture content',
      `${indent}\`\`\`   `,
      taskDocument(),
    ].join('\n');
    assert.doesNotThrow(() => parseTaskGraph(indentedFence, taskConfig));
  }

  const fourSpaceOpener = ['    ```text', taskDocument()].join('\n');
  assert.doesNotThrow(() => parseTaskGraph(fourSpaceOpener, taskConfig));

  const fourSpaceCloser = [
    '```text',
    '    ```',
    taskDocument(),
  ].join('\n');
  assert.throws(
    () => parseTaskGraph(fourSpaceCloser, taskConfig),
    /found none/,
  );

  const ledgerReproduction = ['```text', '    ```', liveTasks].join('\n');
  assert.throws(
    () => parseTaskGraph(ledgerReproduction, repositoryConfig.taskGraph),
    /found none/,
  );

  const whitespaceOnlyCloser = [
    '```text',
    'fixture content',
    '```\t  ',
    taskDocument(),
  ].join('\n');
  assert.doesNotThrow(() => parseTaskGraph(whitespaceOnlyCloser, taskConfig));

  const closerWithTrailingText = [
    '```text',
    'fixture content',
    '``` still-open',
    taskDocument(),
  ].join('\n');
  assert.throws(
    () => parseTaskGraph(closerWithTrailingText, taskConfig),
    /found none/,
  );

  assert.doesNotThrow(() =>
    parseTaskGraph(liveTasks, repositoryConfig.taskGraph),
  );
});

test('task execution owners are recognized and protected tasks remain parent-owned', () => {
  assert.throws(
    () =>
      parseTaskGraph(
        taskDocument({ task13Owner: 'Unrecognized reviewer.' }),
        baseConfig().taskGraph,
      ),
    /Task 13 has unrecognized Execution owner metadata/,
  );
  assert.doesNotThrow(() =>
    parseTaskGraph(
      taskDocument({ task13Owner: 'Generic implementer under one bounded feature packet;' }),
      baseConfig().taskGraph,
    ),
  );

  const repositoryConfig = JSON.parse(
    fs.readFileSync(
      path.join(REPO_ROOT, 'config', 'agent-infrastructure.json'),
      'utf8',
    ),
  );
  const currentTasks = fs.readFileSync(
    path.join(REPO_ROOT, repositoryConfig.taskGraph.document),
    'utf8',
  );
  const protectedOwner =
    'Parent — verified strong; the generic implementer may receive only bounded non-sensitive leaf packets.';
  const graph = parseTaskGraph(currentTasks, repositoryConfig.taskGraph);
  for (const taskNumber of [16, 17, 18, 19]) {
    assert.equal(
      graph.records.get(taskNumber).fields['Execution owner'],
      protectedOwner,
    );
  }

  const protectedOwnerSource =
    'Execution owner: Parent — verified strong; the generic implementer may receive\nonly bounded non-sensitive leaf packets.';
  const genericImplementerOwner = currentTasks.replace(
    protectedOwnerSource,
    'Execution owner: Generic implementer under one bounded feature packet;',
  );
  assert.throws(
    () => parseTaskGraph(genericImplementerOwner, repositoryConfig.taskGraph),
    /Task 16 is protected and must have Parent — verified strong/,
  );

  const unknownOwner = currentTasks.replace(
    protectedOwnerSource,
    'Execution owner: Unrecognized reviewer.',
  );
  assert.throws(
    () => parseTaskGraph(unknownOwner, repositoryConfig.taskGraph),
    /Task 16 has unrecognized Execution owner metadata/,
  );

  const contradictorySuffix = currentTasks.replace(
    protectedOwnerSource,
    'Execution owner: Parent — verified strong; Generic implementer owns the integrated auth slice.',
  );
  assert.throws(
    () => parseTaskGraph(contradictorySuffix, repositoryConfig.taskGraph),
    /Task 16 is protected and must have Parent — verified strong/,
  );

  const unauthorizedExtraProse = currentTasks.replace(
    protectedOwnerSource,
    `Execution owner: ${protectedOwner.slice(0, -1)} plus optional notes.`,
  );
  assert.throws(
    () => parseTaskGraph(unauthorizedExtraProse, repositoryConfig.taskGraph),
    /Task 16 is protected and must have Parent — verified strong/,
  );

  assert.doesNotThrow(() =>
    parseTaskGraph(currentTasks, repositoryConfig.taskGraph),
  );
});

test('task 19 human gate keeps account deletion human-only', () => {
  const repositoryConfig = JSON.parse(
    fs.readFileSync(
      path.join(REPO_ROOT, 'config', 'agent-infrastructure.json'),
      'utf8',
    ),
  );
  const currentTasks = fs.readFileSync(
    path.join(REPO_ROOT, repositoryConfig.taskGraph.document),
    'utf8',
  );
  const canonicalGate =
    'Actual account deletion is human-only on every environment; the staging destructive checklist is also human-run.';
  assert.equal(
    parseTaskGraph(currentTasks, repositoryConfig.taskGraph).records.get(19)
      .fields['Human gate'],
    canonicalGate,
  );

  const noneGate = currentTasks.replace(
    'Human gate: Actual account deletion is human-only on every environment; the\nstaging destructive checklist is also human-run.',
    'Human gate: None.',
  );
  assert.throws(
    () => parseTaskGraph(noneGate, repositoryConfig.taskGraph),
    /Task 19 Human gate must keep actual account deletion human-only/,
  );

  const genericApproval = currentTasks.replace(
    'Human gate: Actual account deletion is human-only on every environment; the\nstaging destructive checklist is also human-run.',
    'Human gate: Human approval required.',
  );
  assert.throws(
    () => parseTaskGraph(genericApproval, repositoryConfig.taskGraph),
    /Task 19 Human gate must keep actual account deletion human-only/,
  );

  const contradictoryGate = currentTasks.replace(
    'Human gate: Actual account deletion is human-only on every environment; the\nstaging destructive checklist is also human-run.',
    `Human gate: ${canonicalGate} Agents may delete accounts in staging.`,
  );
  assert.throws(
    () => parseTaskGraph(contradictoryGate, repositoryConfig.taskGraph),
    /Task 19 Human gate must keep actual account deletion human-only/,
  );

  assert.doesNotThrow(() =>
    parseTaskGraph(
      taskDocument({ omitHumanGate: false }),
      baseConfig().taskGraph,
    ),
  );
  assert.doesNotThrow(() =>
    parseTaskGraph(currentTasks, repositoryConfig.taskGraph),
  );
});

test('task sections end at every active level-two heading', () => {
  const taskConfig = narrowTaskGraph(14);
  const twoTaskSequence = fixtureSequenceLines(13, 14);
  const interrupted = [
    '# Fixture Tasks',
    '',
    '## Task 13: First fixture task',
    '## Deferred metadata',
    'Status: **Next — not started.**',
    'Depends on: Task 12.',
    'Unlocks: Task 14.',
    'Execution owner: Parent.',
    'Parallel-safe with: None.',
    'Human gate: None.',
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
  assert.throws(
    () => parseTaskGraph(interrupted, taskConfig),
    /Task 13 (?:must contain exactly one "Status:" field|is missing Goal metadata boundary)/,
  );

  const withSubsection = [
    '# Fixture Tasks',
    '',
    ...twoTaskSequence,
    '## Task 13: First fixture task',
    '',
    'Status: **Next — not started.**',
    'Depends on: Task 12.',
    'Unlocks: Task 14.',
    'Execution owner: Parent.',
    'Parallel-safe with: None.',
    'Human gate: None.',
    '',
    '### Notes',
    '',
    'Goal: prove subsections do not end the task.',
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
  assert.doesNotThrow(() => parseTaskGraph(withSubsection, taskConfig));

  const fencedH2 = [
    '# Fixture Tasks',
    '',
    ...twoTaskSequence,
    '## Task 13: First fixture task',
    '',
    '```text',
    '## Deferred metadata',
    '```',
    '',
    'Status: **Next — not started.**',
    'Depends on: Task 12.',
    'Unlocks: Task 14.',
    'Execution owner: Parent.',
    'Parallel-safe with: None.',
    'Human gate: None.',
    '',
    'Goal: prove fenced headings stay inactive.',
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
  assert.doesNotThrow(() => parseTaskGraph(fencedH2, taskConfig));

  const commentedH2 = [
    '# Fixture Tasks',
    '',
    ...twoTaskSequence,
    '## Task 13: First fixture task',
    '',
    '<!--',
    '## Deferred metadata',
    '-->',
    '',
    'Status: **Next — not started.**',
    'Depends on: Task 12.',
    'Unlocks: Task 14.',
    'Execution owner: Parent.',
    'Parallel-safe with: None.',
    'Human gate: None.',
    '',
    'Goal: prove commented headings stay inactive.',
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
  assert.doesNotThrow(() => parseTaskGraph(commentedH2, taskConfig));

  assert.doesNotThrow(() => parseTaskGraph(taskDocument({ lastTask: 14 }), taskConfig));

  const repositoryConfig = JSON.parse(
    fs.readFileSync(
      path.join(REPO_ROOT, 'config', 'agent-infrastructure.json'),
      'utf8',
    ),
  );
  const liveTasks = fs.readFileSync(
    path.join(REPO_ROOT, repositoryConfig.taskGraph.document),
    'utf8',
  );
  assert.doesNotThrow(() =>
    parseTaskGraph(liveTasks, repositoryConfig.taskGraph),
  );
});

test('task headings reject leading-zero task numbers', () => {
  const zeroPadded = taskDocument().replace('## Task 13:', '## Task 013:');
  assert.throws(
    () => parseTaskGraph(zeroPadded, baseConfig().taskGraph),
    /found 14/,
  );
});

test('task references reject noncanonical leading-zero numbers', () => {
  assert.throws(() => extractTaskReferences('Task 013.'), /Noncanonical task number "013"/);
  assert.throws(
    () => extractTaskReferences('Tasks 013–14.'),
    /Noncanonical task number "013"/,
  );
  assert.throws(
    () => extractTaskReferences('Tasks 13–014.'),
    /Noncanonical task number "014"/,
  );
  assert.deepEqual(extractTaskReferences('Task 13.'), [13]);
  assert.deepEqual(extractTaskReferences('Tasks 13–14.'), [13, 14]);
  assert.deepEqual(extractTaskReferences('Tasks 13, 14, and 15.'), [13, 14, 15]);

  const taskConfig = baseConfig().taskGraph;
  for (const [fieldLabel, replacement] of [
    ['Depends on', 'Depends on: Task 013.'],
    ['Unlocks', 'Unlocks: Task 014.'],
    ['Parallel-safe with', 'Parallel-safe with: Task 014.'],
  ]) {
    const padded = taskDocument().replace(
      fieldLabel === 'Depends on'
        ? 'Depends on: Task 12.'
        : fieldLabel === 'Unlocks'
          ? 'Unlocks: Task 14.'
          : 'Parallel-safe with: None.',
      replacement,
    );
    assert.throws(
      () => parseTaskGraph(padded, taskConfig),
      /Noncanonical task number "0\d+"/,
    );
  }

  assert.doesNotThrow(() => parseTaskGraph(taskDocument(), taskConfig));
});

test('revised sequence table must match task metadata', () => {
  const taskConfig = baseConfig().taskGraph;
  assert.doesNotThrow(() => parseTaskGraph(taskDocument(), taskConfig));

  const driftedStatus = taskDocument().replace(
    '| 13 | First fixture task | Next — not started |',
    '| 13 | First fixture task | Completed |',
  );
  assert.throws(
    () => parseTaskGraph(driftedStatus, taskConfig),
    /Task 13 Revised Sequence status "Completed" does not match Status metadata/,
  );

  const driftedTitle = taskDocument().replace(
    '| 13 | First fixture task | Next — not started |',
    '| 13 | Renamed fixture task | Next — not started |',
  );
  assert.throws(
    () => parseTaskGraph(driftedTitle, taskConfig),
    /Task 13 Revised Sequence title "Renamed fixture task" does not match task heading/,
  );

  const repositoryConfig = JSON.parse(
    fs.readFileSync(
      path.join(REPO_ROOT, 'config', 'agent-infrastructure.json'),
      'utf8',
    ),
  );
  const liveTasks = fs.readFileSync(
    path.join(REPO_ROOT, repositoryConfig.taskGraph.document),
    'utf8',
  );
  assert.doesNotThrow(() =>
    parseTaskGraph(liveTasks, repositoryConfig.taskGraph),
  );
});

test('reference fields reject None mixed with task references', () => {
  const taskConfig = baseConfig().taskGraph;
  assert.doesNotThrow(() => parseTaskGraph(taskDocument(), taskConfig));

  for (const [fieldLabel, replacement] of [
    ['Depends on', 'Depends on: None; Task 12.'],
    ['Unlocks', 'Unlocks: None; Task 14.'],
    ['Parallel-safe with', 'Parallel-safe with: None; Task 14.'],
  ]) {
    const mixed = taskDocument().replace(
      fieldLabel === 'Depends on'
        ? 'Depends on: Task 12.'
        : fieldLabel === 'Unlocks'
          ? 'Unlocks: Task 14.'
          : 'Parallel-safe with: None.',
      replacement,
    );
    assert.throws(
      () => parseTaskGraph(mixed, taskConfig),
      new RegExp(`Task 13 field "${fieldLabel}" mixes None with references`),
    );
  }

  const repositoryConfig = JSON.parse(
    fs.readFileSync(
      path.join(REPO_ROOT, 'config', 'agent-infrastructure.json'),
      'utf8',
    ),
  );
  const liveTasks = fs.readFileSync(
    path.join(REPO_ROOT, repositoryConfig.taskGraph.document),
    'utf8',
  );
  assert.doesNotThrow(() =>
    parseTaskGraph(liveTasks, repositoryConfig.taskGraph),
  );
});

test('unlock metadata requires the target to depend on the source task', () => {
  const taskConfig = baseConfig().taskGraph;
  assert.throws(
    () =>
      parseTaskGraph(
        taskDocument({ task14Dependency: 'Task 12.' }),
        taskConfig,
      ),
    /Task 13 cannot unlock Task 14 because Task 14 does not depend on it/,
  );
  assert.doesNotThrow(() => parseTaskGraph(taskDocument(), taskConfig));
});

test('task dependency graph rejects later in-range dependencies and self-deps', (t) => {
  const root = createFixture(t);
  write(root, 'docs/TASKS.md', taskDocument({ cycle: true }));
  assert.throws(
    () => runCheck({ repoRoot: root, config: baseConfig() }),
    /Task 13 cannot depend on later in-range Task 14/,
  );
  write(root, 'docs/TASKS.md', taskDocument({ laterCycle: true }));
  assert.throws(
    () => runCheck({ repoRoot: root, config: baseConfig() }),
    /Task 13 cannot depend on later in-range Task 14/,
  );
  assert.throws(
    () =>
      parseTaskGraph(
        taskDocument({ task14Dependency: 'Task 14.' }),
        baseConfig().taskGraph,
      ),
    /Task 14 depends on itself/,
  );
  assert.doesNotThrow(() =>
    parseTaskGraph(
      taskDocument({ task14Dependency: 'Task 13.' }),
      baseConfig().taskGraph,
    ),
  );
  assert.doesNotThrow(() =>
    parseTaskGraph(
      taskDocument({
        task13Unlocks: 'None.',
        task14Dependency: 'Task 12.',
      }),
      baseConfig().taskGraph,
    ),
  );

  const repositoryConfig = JSON.parse(
    fs.readFileSync(
      path.join(REPO_ROOT, 'config', 'agent-infrastructure.json'),
      'utf8',
    ),
  );
  const liveTasks = fs.readFileSync(
    path.join(REPO_ROOT, repositoryConfig.taskGraph.document),
    'utf8',
  );
  assert.doesNotThrow(() =>
    parseTaskGraph(liveTasks, repositoryConfig.taskGraph),
  );
  const laterDependency = liveTasks.replace(
    '## Task 27: Post-Launch Operations\n\nStatus: Pending.\n\nDepends on: Task 26.\n',
    '## Task 27: Post-Launch Operations\n\nStatus: Pending.\n\nDepends on: Task 28.\n',
  );
  assert.throws(
    () => parseTaskGraph(laterDependency, repositoryConfig.taskGraph),
    /Task 27 cannot depend on later in-range Task 28/,
  );
});

test('task references support comma and and lists without ignoring later members', (t) => {
  assert.deepEqual(extractTaskReferences('Tasks 14, 15, and 16.'), [14, 15, 16]);
  assert.deepEqual(extractTaskReferences('Tasks 14 and 16.'), [14, 16]);
  assert.throws(
    () => extractTaskReferences('Tasks 14 / 16.'),
    /Plural "Tasks" requires a range or list|Unrecognized task-number syntax/,
  );
  const root = createFixture(t);
  write(root, 'docs/TASKS.md', taskDocument({ unknownLaterTask: true }));
  assert.throws(
    () => runCheck({ repoRoot: root, config: baseConfig() }),
    /references unknown Task 999/,
  );
});

test('parallel-safe metadata rejects self and direct dependencies', () => {
  const taskConfig = baseConfig().taskGraph;
  assert.throws(
    () => parseTaskGraph(taskDocument({ task13Parallel: 'Task 12.' }), taskConfig),
    /Parallel-safe with must name an in-range Task 13–29/,
  );
  assert.throws(
    () => parseTaskGraph(taskDocument({ task13Parallel: 'Task 13.' }), taskConfig),
    /Task 13 is parallel-safe with itself/,
  );
  assert.doesNotThrow(() =>
    parseTaskGraph(
      taskDocument({
        task13Parallel: 'Task 14 after all prerequisites are accepted.',
        task13Unlocks: 'None.',
        task14Dependency: 'Task 12.',
        task14Parallel: 'Task 13 after all prerequisites are accepted.',
      }),
      taskConfig,
    ),
  );
  assert.doesNotThrow(() => parseTaskGraph(taskDocument(), taskConfig));
  assert.throws(
    () => parseTaskGraph(taskDocument({ task13Parallel: 'Task 999.' }), taskConfig),
    /references unknown Task 999/,
  );
  assert.throws(
    () =>
      parseTaskGraph(
        taskDocument({
          task13Parallel: 'Task 12 after prerequisites.',
          task13Unlocks: 'None.',
          task14Dependency: 'Task 12.',
        }),
        taskConfig,
      ),
    /Parallel-safe with must name an in-range Task 13–29/,
  );
});

test('parallel-safe metadata must be reciprocal for in-range tasks', () => {
  const taskConfig = baseConfig().taskGraph;
  assert.throws(
    () =>
      parseTaskGraph(
        taskDocument({
          task13Parallel: 'Task 14.',
          task13Unlocks: 'None.',
          task14Dependency: 'Task 12.',
        }),
        taskConfig,
      ),
    /Task 13 and Task 14 must declare their parallel-safe relationship reciprocally/,
  );
  assert.doesNotThrow(() =>
    parseTaskGraph(
      taskDocument({
        task13Parallel: 'Task 14.',
        task13Unlocks: 'None.',
        task14Dependency: 'Task 12.',
        task14Parallel: 'Task 13.',
      }),
      taskConfig,
    ),
  );
});

test('parallel-safe metadata rejects prerequisite relationships from either endpoint', () => {
  const taskConfig = baseConfig().taskGraph;
  assert.throws(
    () => parseTaskGraph(taskDocument({ task13Parallel: 'Task 14.' }), taskConfig),
    /Task 13 cannot be parallel-safe with prerequisite-related Task 14/,
  );

  assert.throws(
    () =>
      parseTaskGraph(transitiveParallelConflictDocument(), {
        ...taskConfig,
        lastTask: 15,
      }),
    /Task 13 cannot be parallel-safe with prerequisite-related Task 15/,
  );

  assert.throws(
    () =>
      parseTaskGraph(
        taskDocument({ task14Parallel: 'Task 12.' }),
        taskConfig,
      ),
    /Parallel-safe with must name an in-range Task 13–29/,
  );
});

test('validateConfig pins the published task range to Tasks 13–29', () => {
  assert.doesNotThrow(() => validateConfig(baseConfig()));

  const shrinksRange = baseConfig();
  shrinksRange.taskGraph = {
    ...shrinksRange.taskGraph,
    firstTask: 14,
    lastTask: 29,
    allowedExternalTasks: [12, 13],
  };
  assert.throws(
    () => validateConfig(shrinksRange),
    /taskGraph\.firstTask and taskGraph\.lastTask must be exactly 13 and 29/,
  );

  const expandsRange = baseConfig();
  expandsRange.taskGraph = {
    ...expandsRange.taskGraph,
    firstTask: 13,
    lastTask: 30,
  };
  assert.throws(
    () => validateConfig(expandsRange),
    /taskGraph\.firstTask and taskGraph\.lastTask must be exactly 13 and 29/,
  );

  const repositoryConfig = JSON.parse(
    fs.readFileSync(
      path.join(REPO_ROOT, 'config', 'agent-infrastructure.json'),
      'utf8',
    ),
  );
  assert.equal(repositoryConfig.taskGraph.firstTask, 13);
  assert.equal(repositoryConfig.taskGraph.lastTask, 29);
  assert.doesNotThrow(() => validateConfig(repositoryConfig));
});

test('revised sequence rejects duplicate Revised Sequence headings', () => {
  const taskConfig = baseConfig().taskGraph;
  const duplicate = [
    '# Fixture Tasks',
    '',
    '## Revised Sequence',
    '',
    '| Task | Title | State |',
    '| --- | --- | --- |',
    '| 13 | Stale fixture | Completed |',
    '',
    taskDocument().replace(/^# Fixture Tasks\n\n/m, ''),
  ].join('\n');
  assert.throws(
    () => parseTaskGraph(duplicate, taskConfig),
    /exactly one Revised Sequence heading/,
  );

  const closingHashDuplicate = [
    '# Fixture Tasks',
    '',
    '## Revised Sequence ##',
    '',
    '| Task | Title | State |',
    '| --- | --- | --- |',
    '| 13 | Stale fixture | Completed |',
    '',
    taskDocument().replace(/^# Fixture Tasks\n\n/m, ''),
  ].join('\n');
  assert.throws(
    () => parseTaskGraph(closingHashDuplicate, taskConfig),
    /exactly one Revised Sequence heading/,
  );
  assert.doesNotThrow(() => parseTaskGraph(taskDocument(), taskConfig));
});

test('validateConfig pins the task ledger path and predecessor-only externals', () => {
  assert.doesNotThrow(() => validateConfig(baseConfig()));

  const otherDocument = baseConfig();
  otherDocument.documents.push({
    path: 'docs/other-tasks.md',
    kind: 'file',
    lifecycle: 'status',
    owner: 'parent-agent',
  });
  otherDocument.taskGraph = {
    ...otherDocument.taskGraph,
    document: 'docs/other-tasks.md',
  };
  assert.throws(
    () => validateConfig(otherDocument),
    /taskGraph\.document must be exactly "docs\/TASKS\.md"/,
  );

  const futureExternal = baseConfig();
  futureExternal.taskGraph = {
    ...futureExternal.taskGraph,
    allowedExternalTasks: [12, 30],
  };
  assert.throws(
    () => validateConfig(futureExternal),
    /allowedExternalTasks must be strictly before Task 13/,
  );

  const inRangeExternal = baseConfig();
  inRangeExternal.taskGraph = {
    ...inRangeExternal.taskGraph,
    allowedExternalTasks: [12, 20],
  };
  assert.throws(
    () => validateConfig(inRangeExternal),
    /allowedExternalTasks must be strictly before Task 13/,
  );
});

test('revised sequence rejects non-canonical tables before the required header', () => {
  const taskConfig = baseConfig().taskGraph;
  const staleLeadingTable = taskDocument().replace(
    '## Revised Sequence\n\n| Task | Title | Status |\n',
    [
      '## Revised Sequence',
      '',
      '| Task | Title | State |',
      '| --- | --- | --- |',
      '| 13 | Stale fixture | Completed |',
      '',
      '| Task | Title | Status |',
      '',
    ].join('\n'),
  );
  assert.throws(
    () => parseTaskGraph(staleLeadingTable, taskConfig),
    /non-canonical table before the required header/,
  );
  assert.doesNotThrow(() => parseTaskGraph(taskDocument(), taskConfig));
});

test('validateConfig rejects historical documents as impact targets', () => {
  const historicalTarget = baseConfig();
  historicalTarget.impactRules[0] = {
    ...historicalTarget.impactRules[0],
    requiredDocuments: ['history'],
  };
  assert.throws(
    () => validateConfig(historicalTarget),
    /requiredDocuments must not list historical lifecycle entry "history"/,
  );
  assert.doesNotThrow(() => validateConfig(baseConfig()));
});

test('current Tasks 13-29 preserve the accepted Task 17 and 18 relationship', () => {
  const repositoryConfig = JSON.parse(
    fs.readFileSync(
      path.join(REPO_ROOT, 'config', 'agent-infrastructure.json'),
      'utf8',
    ),
  );
  const content = fs.readFileSync(
    path.join(REPO_ROOT, repositoryConfig.taskGraph.document),
    'utf8',
  );
  const graph = parseTaskGraph(content, repositoryConfig.taskGraph);
  assert.equal(graph.records.size, 17);
  assert.deepEqual(
    extractTaskReferences(graph.records.get(17).fields['Depends on']),
    [16],
  );
  assert.deepEqual(
    extractTaskReferences(graph.records.get(18).fields['Depends on']),
    [16],
  );
  assert.deepEqual(
    extractTaskReferences(graph.records.get(17).fields['Parallel-safe with']),
    [18],
  );
  assert.deepEqual(
    extractTaskReferences(graph.records.get(18).fields['Parallel-safe with']),
    [17],
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

test('report mode propagates generated outputs and sources bidirectionally', () => {
  const config = {
    documents: [
      { path: '.agents/skills' },
      { path: '.claude/skills' },
      { path: 'docs/DECISIONS.md' },
      { path: 'docs/decisions' },
      { path: 'skills/manifest.json' },
    ],
    dependencies: [],
    mirrors: [],
    generatedFiles: [
      {
        path: '.agents/skills',
        source: 'skills/manifest.json',
      },
      {
        path: '.claude/skills',
        source: 'skills/manifest.json',
      },
      {
        path: 'docs/DECISIONS.md',
        source: 'docs/decisions',
      },
    ],
    impactRules: [],
  };
  const wrapperDocuments = [
    '.agents/skills',
    '.claude/skills',
    'skills/manifest.json',
  ];
  const decisionDocuments = [
    'docs/DECISIONS.md',
    'docs/decisions',
  ];
  const cases = [
    ['.agents/skills/bugfix-debug-loop/SKILL.md', wrapperDocuments],
    ['.claude/skills/bugfix-debug-loop/SKILL.md', wrapperDocuments],
    ['docs/DECISIONS.md', decisionDocuments],
    ['skills/manifest.json', wrapperDocuments],
    [
      'docs/decisions/2026-07-03-persist-session-and-blocker-state.md',
      decisionDocuments,
    ],
    ['src/unrelated.ts', []],
  ];

  for (const [changedPath, expectedDocuments] of cases) {
    const report = reportImpactedDocuments(config, [changedPath], REPO_ROOT);
    assert.deepEqual(report.documents, expectedDocuments);
    assert.deepEqual(report.documents, [...new Set(report.documents)].sort());
  }
});

test('agent-infrastructure reports include the manifest for tool configuration paths', () => {
  const repositoryConfig = JSON.parse(
    fs.readFileSync(
      path.join(REPO_ROOT, 'config', 'agent-infrastructure.json'),
      'utf8',
    ),
  );
  for (const changedPath of [
    'skills/example-new-skill/SKILL.md',
    '.cursor/rules/example-new-rule.mdc',
    '.claude/settings.json',
  ]) {
    const report = reportImpactedDocuments(
      repositoryConfig,
      [changedPath],
      REPO_ROOT,
    );
    assert.ok(report.documents.includes('config/agent-infrastructure.json'));
    assert.deepEqual(report.documents, [...new Set(report.documents)].sort());
  }
  assert.deepEqual(
    repositoryConfig.documents.find(({ path: documentPath }) =>
      documentPath === '.claude/settings.json'
    ),
    {
      path: '.claude/settings.json',
      kind: 'file',
      lifecycle: 'status',
      owner: 'parent-agent',
      staleScan: false,
    },
  );
});

test('release-readiness reports include static and dynamic Expo configs', () => {
  const repositoryConfig = JSON.parse(
    fs.readFileSync(
      path.join(REPO_ROOT, 'config', 'agent-infrastructure.json'),
      'utf8',
    ),
  );
  const expectedDocuments = [
    'README.md',
    'docs/RELEASE_CHECKLIST.md',
    'docs/TASKS.md',
  ];
  for (const changedPath of [
    'app.config.js',
    'app.config.ts',
    'app.json',
    'eas.json',
  ]) {
    const report = reportImpactedDocuments(
      repositoryConfig,
      [changedPath],
      REPO_ROOT,
    );
    for (const expectedDocument of expectedDocuments) {
      assert.ok(report.documents.includes(expectedDocument));
    }
    assert.deepEqual(report.documents, [...new Set(report.documents)].sort());
  }
  assert.equal(
    repositoryConfig.impactRules
      .find(({ id }) => id === 'release-readiness')
      .changedPaths.includes('app.example.ts'),
    false,
  );
});

test('bundled product and release assets report their documentation contracts', () => {
  const repositoryConfig = JSON.parse(
    fs.readFileSync(
      path.join(REPO_ROOT, 'config', 'agent-infrastructure.json'),
      'utf8',
    ),
  );
  const uiDocuments = ['docs/DESIGN.md', 'docs/TASKS.md'];
  const releaseDocuments = [
    'README.md',
    'docs/RELEASE_CHECKLIST.md',
    'docs/TASKS.md',
  ];

  const productImageReport = reportImpactedDocuments(
    repositoryConfig,
    ['assets/images/products/product-01-stan-smith-orange.png'],
    REPO_ROOT,
  );
  for (const expectedDocument of uiDocuments) {
    assert.ok(productImageReport.documents.includes(expectedDocument));
  }
  assert.deepEqual(
    productImageReport.documents,
    [...new Set(productImageReport.documents)].sort(),
  );

  for (const changedPath of [
    'assets/images/icon.png',
    'assets/images/android-icon-foreground.png',
    'assets/images/android-icon-background.png',
    'assets/images/android-icon-monochrome.png',
    'assets/images/favicon.png',
    'assets/images/splash-icon.png',
  ]) {
    const report = reportImpactedDocuments(
      repositoryConfig,
      [changedPath],
      REPO_ROOT,
    );
    for (const expectedDocument of releaseDocuments) {
      assert.ok(
        report.documents.includes(expectedDocument),
        `${changedPath} should require ${expectedDocument}`,
      );
    }
    assert.deepEqual(report.documents, [...new Set(report.documents)].sort());
  }

  const unrelatedAssetReport = reportImpactedDocuments(
    repositoryConfig,
    ['assets/images/unrelated-placeholder.bin'],
    REPO_ROOT,
  );
  assert.equal(unrelatedAssetReport.documents.includes('docs/DESIGN.md'), false);
  assert.equal(
    unrelatedAssetReport.documents.includes('docs/RELEASE_CHECKLIST.md'),
    false,
  );
});

test('active build configuration paths trigger their documentation contracts', () => {
  const repositoryConfig = JSON.parse(
    fs.readFileSync(
      path.join(REPO_ROOT, 'config', 'agent-infrastructure.json'),
      'utf8',
    ),
  );
  const toolingDocuments = [
    '.cursor/rules/react-native-expo.mdc',
    'AGENTS.md',
    'README.md',
    'docs/AGENT_WORKFLOW.md',
    'docs/DOCUMENTATION_POLICY.md',
    'docs/SECURITY.md',
    'docs/TASKS.md',
  ];
  for (const changedPath of [
    'babel.config.js',
    'eslint.config.js',
    'metro.config.js',
    'nativewind-env.d.ts',
    'package.json',
    'tsconfig.json',
  ]) {
    const report = reportImpactedDocuments(
      repositoryConfig,
      [changedPath],
      REPO_ROOT,
    );
    for (const expectedDocument of toolingDocuments) {
      assert.ok(report.documents.includes(expectedDocument));
    }
  }

  const stylesheetReport = reportImpactedDocuments(
    repositoryConfig,
    ['global.css'],
    REPO_ROOT,
  );
  for (const expectedDocument of ['docs/DESIGN.md', 'docs/TASKS.md']) {
    assert.ok(stylesheetReport.documents.includes(expectedDocument));
  }
});

test('environment boundary files report tooling and security documents', () => {
  const repositoryConfig = JSON.parse(
    fs.readFileSync(
      path.join(REPO_ROOT, 'config', 'agent-infrastructure.json'),
      'utf8',
    ),
  );
  const expectedDocuments = [
    '.cursor/rules/react-native-expo.mdc',
    'AGENTS.md',
    'README.md',
    'docs/AGENT_WORKFLOW.md',
    'docs/DOCUMENTATION_POLICY.md',
    'docs/SECURITY.md',
    'docs/TASKS.md',
  ];
  for (const changedPath of ['.env.example', '.gitignore']) {
    const report = reportImpactedDocuments(
      repositoryConfig,
      [changedPath],
      REPO_ROOT,
    );
    for (const expectedDocument of expectedDocuments) {
      assert.ok(
        report.documents.includes(expectedDocument),
        `${changedPath} should require ${expectedDocument}`,
      );
    }
    assert.deepEqual(report.documents, [...new Set(report.documents)].sort());
  }

  const unrelatedReport = reportImpactedDocuments(
    repositoryConfig,
    ['assets/fonts/SpaceMono-Regular.ttf'],
    REPO_ROOT,
  );
  assert.equal(unrelatedReport.documents.includes('docs/SECURITY.md'), false);
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
    tasks: 17,
  });
});
