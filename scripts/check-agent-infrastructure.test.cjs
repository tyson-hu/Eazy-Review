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

  const stickyStaleTerm = baseConfig();
  stickyStaleTerm.staleTerms.rules[0].flags = 'y';
  assert.throws(
    () => validateConfig(stickyStaleTerm),
    /flags contains unsupported regular-expression flags/,
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

test('declared paths stay inside the real repository root', (t) => {
  const root = createFixture(t);

  assert.doesNotThrow(() => runCheck({ repoRoot: root, config: baseConfig() }));

  const directLinkConfig = baseConfig();
  directLinkConfig.documents.push({
    path: 'direct-link.md',
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
    lifecycle: 'evergreen',
    owner: 'parent-agent',
  });
  assert.doesNotThrow(() => runCheck({ repoRoot: root, config: containedConfig }));

  const optionalConfig = baseConfig();
  optionalConfig.documents.push({
    path: 'missing/optional.md',
    lifecycle: 'status',
    owner: 'parent-agent',
    requiredOnDisk: false,
  });
  assert.doesNotThrow(() => runCheck({ repoRoot: root, config: optionalConfig }));
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
      lifecycle: 'status',
      owner: 'parent-agent',
    },
    {
      path: 'docs/notes/handoff.md',
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

test('agent-infrastructure reports include the manifest for proposed skill and Cursor paths', () => {
  const repositoryConfig = JSON.parse(
    fs.readFileSync(
      path.join(REPO_ROOT, 'config', 'agent-infrastructure.json'),
      'utf8',
    ),
  );
  for (const changedPath of [
    'skills/example-new-skill/SKILL.md',
    '.cursor/rules/example-new-rule.mdc',
  ]) {
    const report = reportImpactedDocuments(
      repositoryConfig,
      [changedPath],
      REPO_ROOT,
    );
    assert.ok(report.documents.includes('config/agent-infrastructure.json'));
    assert.deepEqual(report.documents, [...new Set(report.documents)].sort());
  }
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
