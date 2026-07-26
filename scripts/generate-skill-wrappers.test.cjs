'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  renderWrapper,
  runGenerator,
  validateManifest,
} = require('./generate-skill-wrappers.cjs');

const VALID_SKILLS = [
  {
    name: 'alpha-skill',
    description: 'Use when the alpha workflow is required.',
  },
  {
    name: 'beta-skill',
    description: 'Use when the beta workflow is required.',
  },
];

function createFixture(t, skills = VALID_SKILLS) {
  const repoRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'eazy-review-skill-wrappers-'),
  );
  t.after(() => fs.rmSync(repoRoot, { recursive: true, force: true }));

  fs.mkdirSync(path.join(repoRoot, 'skills'), { recursive: true });
  fs.writeFileSync(
    path.join(repoRoot, 'skills', 'manifest.json'),
    `${JSON.stringify({ skills }, null, 2)}\n`,
  );

  for (const { name } of skills) {
    const canonicalDirectory = path.join(repoRoot, 'skills', name);
    fs.mkdirSync(canonicalDirectory, { recursive: true });
    fs.writeFileSync(
      path.join(canonicalDirectory, 'SKILL.md'),
      `# ${name}\n\nCanonical routine.\n`,
    );
  }

  return repoRoot;
}

test('validateManifest accepts sorted name and description records', () => {
  assert.deepEqual(validateManifest({ skills: VALID_SKILLS }), VALID_SKILLS);
});

const WRAPPER_OUTPUT_CASES = [
  {
    name: 'plain description',
    skill: VALID_SKILLS[0],
    expected: [
      '---',
      'name: alpha-skill',
      'description: "Use when the alpha workflow is required."',
      '---',
      '',
      'Follow the canonical workflow in `skills/alpha-skill/SKILL.md`. Do not improvise a different routine.',
      '',
    ].join('\n'),
  },
  {
    name: 'description with YAML-significant characters',
    skill: {
      name: 'quoted-skill',
      description: 'Use when values contain: "quotes" or # markers.',
    },
    expected: [
      '---',
      'name: quoted-skill',
      'description: "Use when values contain: \\"quotes\\" or # markers."',
      '---',
      '',
      'Follow the canonical workflow in `skills/quoted-skill/SKILL.md`. Do not improvise a different routine.',
      '',
    ].join('\n'),
  },
];

for (const testCase of WRAPPER_OUTPUT_CASES) {
  test(`renderWrapper produces deterministic output for ${testCase.name}`, () => {
    assert.equal(renderWrapper(testCase.skill), testCase.expected);
  });
}

const INVALID_MANIFEST_CASES = [
  {
    name: 'non-object manifest',
    manifest: null,
    message: /must be a JSON object/,
  },
  {
    name: 'unexpected top-level key',
    manifest: { skills: VALID_SKILLS, version: 1 },
    message: /only a skills array/,
  },
  {
    name: 'non-array skills',
    manifest: { skills: 'alpha-skill' },
    message: /non-empty array/,
  },
  {
    name: 'empty skills',
    manifest: { skills: [] },
    message: /non-empty array/,
  },
  {
    name: 'non-object skill',
    manifest: { skills: [null] },
    message: /index 0 must be a JSON object/,
  },
  {
    name: 'unexpected skill key',
    manifest: {
      skills: [
        {
          ...VALID_SKILLS[0],
          trigger: 'alpha',
        },
      ],
    },
    message: /only name and description/,
  },
  {
    name: 'non-string name',
    manifest: {
      skills: [{ name: true, description: 'Use when testing.' }],
    },
    message: /invalid kebab-case name/,
  },
  {
    name: 'invalid kebab-case name',
    manifest: {
      skills: [{ name: 'Alpha Skill', description: 'Use when testing.' }],
    },
    message: /invalid kebab-case name/,
  },
  {
    name: 'non-string description',
    manifest: {
      skills: [{ name: 'alpha-skill', description: 42 }],
    },
    message: /non-empty, single-line description/,
  },
  {
    name: 'multiline description',
    manifest: {
      skills: [
        {
          name: 'alpha-skill',
          description: 'Use when alpha.\nUse when beta.',
        },
      ],
    },
    message: /non-empty, single-line description/,
  },
  {
    name: 'duplicate name',
    manifest: {
      skills: [VALID_SKILLS[0], VALID_SKILLS[0]],
    },
    message: /duplicate name/,
  },
  {
    name: 'unsorted entries',
    manifest: {
      skills: [VALID_SKILLS[1], VALID_SKILLS[0]],
    },
    message: /sorted by name/,
  },
];

for (const testCase of INVALID_MANIFEST_CASES) {
  test(`validateManifest rejects ${testCase.name}`, () => {
    assert.throws(
      () => validateManifest(testCase.manifest),
      testCase.message,
    );
  });
}

test('runGenerator writes identical deterministic wrapper trees', (t) => {
  const repoRoot = createFixture(t);
  const canonicalBefore = fs.readFileSync(
    path.join(repoRoot, 'skills', 'alpha-skill', 'SKILL.md'),
    'utf8',
  );

  const staleDirectory = path.join(
    repoRoot,
    '.agents',
    'skills',
    'stale-skill',
  );
  fs.mkdirSync(staleDirectory, { recursive: true });
  fs.writeFileSync(
    path.join(staleDirectory, 'SKILL.md'),
    renderWrapper({
      name: 'stale-skill',
      description: 'Use when the stale workflow is required.',
    }),
  );

  assert.equal(runGenerator({ repoRoot }), 2);
  assert.equal(fs.existsSync(staleDirectory), false);

  for (const skill of VALID_SKILLS) {
    const agentsWrapper = fs.readFileSync(
      path.join(repoRoot, '.agents', 'skills', skill.name, 'SKILL.md'),
      'utf8',
    );
    const claudeWrapper = fs.readFileSync(
      path.join(repoRoot, '.claude', 'skills', skill.name, 'SKILL.md'),
      'utf8',
    );

    assert.equal(agentsWrapper, renderWrapper(skill));
    assert.equal(claudeWrapper, agentsWrapper);
  }

  assert.equal(
    fs.readFileSync(
      path.join(repoRoot, 'skills', 'alpha-skill', 'SKILL.md'),
      'utf8',
    ),
    canonicalBefore,
  );
  assert.equal(runGenerator({ repoRoot, checkOnly: true }), 2);
});

test('check mode reports wrapper drift without rewriting it', (t) => {
  const repoRoot = createFixture(t);
  runGenerator({ repoRoot });

  const wrapperPath = path.join(
    repoRoot,
    '.agents',
    'skills',
    'alpha-skill',
    'SKILL.md',
  );
  fs.writeFileSync(wrapperPath, 'drift\n');

  assert.throws(
    () => runGenerator({ repoRoot, checkOnly: true }),
    /does not match the manifest/,
  );
  assert.equal(fs.readFileSync(wrapperPath, 'utf8'), 'drift\n');
});

test('generator rejects canonical inventory drift without parsing skill prose', (t) => {
  const repoRoot = createFixture(t);
  fs.mkdirSync(path.join(repoRoot, 'skills', 'unlisted-skill'), {
    recursive: true,
  });
  fs.writeFileSync(
    path.join(repoRoot, 'skills', 'unlisted-skill', 'SKILL.md'),
    '# Anything\n',
  );

  assert.throws(
    () => runGenerator({ repoRoot }),
    /Canonical skill directories must match the manifest/,
  );
});

test('generator rejects an empty canonical skill without parsing its structure', (t) => {
  const repoRoot = createFixture(t);
  fs.writeFileSync(
    path.join(repoRoot, 'skills', 'alpha-skill', 'SKILL.md'),
    ' \n',
  );

  assert.throws(
    () => runGenerator({ repoRoot }),
    /Canonical skill file must not be empty: skills\/alpha-skill\/SKILL\.md/,
  );
});

test('generator refuses to delete unexpected files from wrapper directories', (t) => {
  const repoRoot = createFixture(t);
  const staleDirectory = path.join(
    repoRoot,
    '.agents',
    'skills',
    'stale-skill',
  );
  fs.mkdirSync(staleDirectory, { recursive: true });
  fs.writeFileSync(path.join(staleDirectory, 'notes.txt'), 'keep me\n');

  assert.throws(
    () => runGenerator({ repoRoot }),
    /Refusing to replace generated directory with unexpected contents/,
  );
  assert.equal(
    fs.readFileSync(path.join(staleDirectory, 'notes.txt'), 'utf8'),
    'keep me\n',
  );
});

test('generator refuses to delete an arbitrary lone SKILL.md from a stale directory', (t) => {
  const repoRoot = createFixture(t);
  const staleDirectory = path.join(
    repoRoot,
    '.agents',
    'skills',
    'stale-skill',
  );
  const staleSkillPath = path.join(staleDirectory, 'SKILL.md');
  fs.mkdirSync(staleDirectory, { recursive: true });
  fs.writeFileSync(staleSkillPath, '# User-owned skill\n\nKeep me.\n');

  assert.throws(
    () => runGenerator({ repoRoot }),
    /not a generated wrapper/,
  );
  assert.equal(
    fs.readFileSync(staleSkillPath, 'utf8'),
    '# User-owned skill\n\nKeep me.\n',
  );
});

test('generator rejects a symlinked wrapper root without touching its target', (t) => {
  const repoRoot = createFixture(t);
  const externalRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'eazy-review-wrapper-target-'),
  );
  t.after(() => fs.rmSync(externalRoot, { recursive: true, force: true }));

  const sentinelPath = path.join(externalRoot, 'sentinel.txt');
  fs.writeFileSync(sentinelPath, 'keep me\n');
  fs.mkdirSync(path.join(repoRoot, '.agents'), { recursive: true });
  fs.symlinkSync(
    externalRoot,
    path.join(repoRoot, '.agents', 'skills'),
    'dir',
  );

  assert.throws(
    () => runGenerator({ repoRoot }),
    /symbolic link/,
  );
  assert.deepEqual(fs.readdirSync(externalRoot), ['sentinel.txt']);
  assert.equal(fs.readFileSync(sentinelPath, 'utf8'), 'keep me\n');
});

test('generator rejects a symlinked wrapper ancestor without touching its target', (t) => {
  const repoRoot = createFixture(t);
  const externalRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'eazy-review-wrapper-ancestor-'),
  );
  t.after(() => fs.rmSync(externalRoot, { recursive: true, force: true }));

  const sentinelPath = path.join(externalRoot, 'sentinel.txt');
  fs.writeFileSync(sentinelPath, 'keep me\n');
  fs.symlinkSync(externalRoot, path.join(repoRoot, '.agents'), 'dir');

  assert.throws(
    () => runGenerator({ repoRoot }),
    /symbolic link/,
  );
  assert.deepEqual(fs.readdirSync(externalRoot), ['sentinel.txt']);
  assert.equal(fs.readFileSync(sentinelPath, 'utf8'), 'keep me\n');
});

test('generator rejects a symlinked canonical SKILL.md without touching its target', (t) => {
  const repoRoot = createFixture(t);
  const externalRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'eazy-review-canonical-target-'),
  );
  t.after(() => fs.rmSync(externalRoot, { recursive: true, force: true }));

  const sentinelPath = path.join(externalRoot, 'SKILL.md');
  fs.writeFileSync(sentinelPath, '# External sentinel\n');

  const canonicalPath = path.join(
    repoRoot,
    'skills',
    'alpha-skill',
    'SKILL.md',
  );
  fs.unlinkSync(canonicalPath);
  fs.symlinkSync(sentinelPath, canonicalPath, 'file');

  assert.throws(
    () => runGenerator({ repoRoot }),
    /symbolic link/,
  );
  assert.equal(
    fs.readFileSync(sentinelPath, 'utf8'),
    '# External sentinel\n',
  );
});
