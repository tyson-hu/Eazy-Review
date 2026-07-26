#!/usr/bin/env node

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const SKILL_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const WRAPPER_ROOTS = ['.agents/skills', '.claude/skills'];

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function validateManifest(manifest) {
  if (!isPlainObject(manifest)) {
    throw new Error('Skill manifest must be a JSON object.');
  }

  const topLevelKeys = Object.keys(manifest);
  if (topLevelKeys.length !== 1 || topLevelKeys[0] !== 'skills') {
    throw new Error('Skill manifest must contain only a skills array.');
  }

  if (!Array.isArray(manifest.skills) || manifest.skills.length === 0) {
    throw new Error('Skill manifest skills must be a non-empty array.');
  }

  const seenNames = new Set();
  let previousName = null;

  return manifest.skills.map((skill, index) => {
    if (!isPlainObject(skill)) {
      throw new Error(`Skill at index ${index} must be a JSON object.`);
    }

    const keys = Object.keys(skill).sort();
    if (
      keys.length !== 2 ||
      keys[0] !== 'description' ||
      keys[1] !== 'name'
    ) {
      throw new Error(
        `Skill at index ${index} must contain only name and description.`,
      );
    }

    const { name, description } = skill;

    if (
      typeof name !== 'string' ||
      name !== name.trim() ||
      !SKILL_NAME_PATTERN.test(name)
    ) {
      throw new Error(
        `Skill at index ${index} has an invalid kebab-case name.`,
      );
    }

    if (
      typeof description !== 'string' ||
      description !== description.trim() ||
      description.length === 0 ||
      /[\r\n]/.test(description)
    ) {
      throw new Error(
        `Skill "${name}" must have a non-empty, single-line description.`,
      );
    }

    if (seenNames.has(name)) {
      throw new Error(`Skill manifest contains duplicate name "${name}".`);
    }

    if (previousName !== null && previousName > name) {
      throw new Error('Skill manifest entries must be sorted by name.');
    }

    seenNames.add(name);
    previousName = name;

    return { name, description };
  });
}

function renderWrapper({ name, description }) {
  return [
    '---',
    `name: ${name}`,
    `description: ${JSON.stringify(description)}`,
    '---',
    '',
    `Follow the canonical workflow in \`skills/${name}/SKILL.md\`. Do not improvise a different routine.`,
    '',
  ].join('\n');
}

function resolveRepoRoot(repoRoot) {
  const absoluteRepoRoot = path.resolve(repoRoot);
  const rootStats = fs.lstatSync(absoluteRepoRoot, {
    throwIfNoEntry: false,
  });

  if (!rootStats?.isDirectory() || rootStats.isSymbolicLink()) {
    throw new Error(`Repository root must be a real directory: ${absoluteRepoRoot}`);
  }

  return fs.realpathSync(absoluteRepoRoot);
}

function assertOwnedPath(repoRoot, targetPath) {
  const absoluteTarget = path.resolve(targetPath);
  const relativeTarget = path.relative(repoRoot, absoluteTarget);
  const isInsideRepo =
    relativeTarget === '' ||
    (!path.isAbsolute(relativeTarget) &&
      relativeTarget !== '..' &&
      !relativeTarget.startsWith(`..${path.sep}`));

  if (!isInsideRepo) {
    throw new Error(
      `Generated skill path must stay inside the repository: ${absoluteTarget}`,
    );
  }

  let currentPath = repoRoot;
  for (const pathPart of relativeTarget.split(path.sep).filter(Boolean)) {
    currentPath = path.join(currentPath, pathPart);
    const pathStats = fs.lstatSync(currentPath, { throwIfNoEntry: false });

    if (!pathStats) {
      break;
    }

    if (pathStats.isSymbolicLink()) {
      throw new Error(
        `Refusing to follow symbolic link in generated skill path: ${currentPath}`,
      );
    }
  }

  return absoluteTarget;
}

function directoryNames(root) {
  if (!fs.existsSync(root)) {
    return [];
  }

  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function validateCanonicalInventory(repoRoot, skills) {
  const canonicalRoot = assertOwnedPath(repoRoot, path.join(repoRoot, 'skills'));
  const expectedNames = skills.map(({ name }) => name);
  const actualNames = directoryNames(canonicalRoot);

  if (JSON.stringify(actualNames) !== JSON.stringify(expectedNames)) {
    throw new Error(
      `Canonical skill directories must match the manifest.\nExpected: ${expectedNames.join(', ')}\nActual: ${actualNames.join(', ')}`,
    );
  }

  for (const { name } of skills) {
    const canonicalPath = assertOwnedPath(
      repoRoot,
      path.join(canonicalRoot, name, 'SKILL.md'),
    );
    if (!fs.lstatSync(canonicalPath, { throwIfNoEntry: false })?.isFile()) {
      throw new Error(`Missing canonical skill file: skills/${name}/SKILL.md`);
    }
    if (fs.readFileSync(canonicalPath, 'utf8').trim().length === 0) {
      throw new Error(`Canonical skill file must not be empty: skills/${name}/SKILL.md`);
    }
  }
}

function assertSafeGeneratedDirectory(repoRoot, skillDirectory) {
  assertOwnedPath(repoRoot, skillDirectory);
  const directoryStats = fs.lstatSync(skillDirectory, {
    throwIfNoEntry: false,
  });

  if (!directoryStats) {
    return;
  }

  if (!directoryStats.isDirectory()) {
    throw new Error(
      `Refusing to replace non-directory generated path: ${skillDirectory}`,
    );
  }

  const entries = fs.readdirSync(skillDirectory, { withFileTypes: true });
  for (const entry of entries) {
    assertOwnedPath(repoRoot, path.join(skillDirectory, entry.name));
  }

  const isSafe =
    entries.length === 1 &&
    entries[0].isFile() &&
    entries[0].name === 'SKILL.md';

  if (!isSafe) {
    throw new Error(
      `Refusing to replace generated directory with unexpected contents: ${skillDirectory}`,
    );
  }
}

function isGeneratedWrapperForName(content, name) {
  if (!SKILL_NAME_PATTERN.test(name)) {
    return false;
  }

  const lines = content.split('\n');
  if (
    lines.length !== 7 ||
    lines[0] !== '---' ||
    lines[1] !== `name: ${name}` ||
    !lines[2].startsWith('description: ') ||
    lines[3] !== '---' ||
    lines[4] !== '' ||
    lines[5] !==
      `Follow the canonical workflow in \`skills/${name}/SKILL.md\`. Do not improvise a different routine.` ||
    lines[6] !== ''
  ) {
    return false;
  }

  let description;
  try {
    description = JSON.parse(lines[2].slice('description: '.length));
  } catch {
    return false;
  }

  try {
    const [skill] = validateManifest({
      skills: [{ name, description }],
    });
    return renderWrapper(skill) === content;
  } catch {
    return false;
  }
}

function assertGeneratedWrapperOwnership(repoRoot, skillDirectory, name) {
  assertSafeGeneratedDirectory(repoRoot, skillDirectory);
  const wrapperPath = assertOwnedPath(
    repoRoot,
    path.join(skillDirectory, 'SKILL.md'),
  );
  const content = fs.readFileSync(wrapperPath, 'utf8');

  if (!isGeneratedWrapperForName(content, name)) {
    throw new Error(
      `Refusing to delete stale skill directory because SKILL.md is not a generated wrapper: ${skillDirectory}`,
    );
  }
}

function syncWrapperRoot(repoRoot, relativeRoot, skills, checkOnly) {
  const wrapperRoot = assertOwnedPath(
    repoRoot,
    path.join(repoRoot, relativeRoot),
  );
  const expectedNames = new Set(skills.map(({ name }) => name));

  if (!fs.lstatSync(wrapperRoot, { throwIfNoEntry: false })) {
    if (checkOnly) {
      throw new Error(`Missing generated wrapper root: ${relativeRoot}`);
    }
    fs.mkdirSync(wrapperRoot, { recursive: true });
    assertOwnedPath(repoRoot, wrapperRoot);
  }

  const rootEntries = fs.readdirSync(wrapperRoot, { withFileTypes: true });
  for (const entry of rootEntries) {
    const entryPath = assertOwnedPath(
      repoRoot,
      path.join(wrapperRoot, entry.name),
    );
    if (!entry.isDirectory()) {
      throw new Error(
        `Unexpected non-directory in generated wrapper root: ${relativeRoot}/${entry.name}`,
      );
    }

    if (!expectedNames.has(entry.name)) {
      if (checkOnly) {
        throw new Error(
          `Unexpected generated skill directory: ${relativeRoot}/${entry.name}`,
        );
      }
      assertGeneratedWrapperOwnership(repoRoot, entryPath, entry.name);
      fs.rmSync(entryPath, { recursive: true });
    }
  }

  for (const skill of skills) {
    const skillDirectory = assertOwnedPath(
      repoRoot,
      path.join(wrapperRoot, skill.name),
    );
    const wrapperPath = assertOwnedPath(
      repoRoot,
      path.join(skillDirectory, 'SKILL.md'),
    );
    const expectedContent = renderWrapper(skill);

    if (checkOnly) {
      assertSafeGeneratedDirectory(repoRoot, skillDirectory);
      if (!fs.existsSync(wrapperPath)) {
        throw new Error(
          `Missing generated wrapper: ${relativeRoot}/${skill.name}/SKILL.md`,
        );
      }
      const actualContent = fs.readFileSync(wrapperPath, 'utf8');
      if (actualContent !== expectedContent) {
        throw new Error(
          `Generated wrapper does not match the manifest: ${relativeRoot}/${skill.name}/SKILL.md`,
        );
      }
      continue;
    }

    assertSafeGeneratedDirectory(repoRoot, skillDirectory);
    fs.mkdirSync(skillDirectory, { recursive: true });
    assertOwnedPath(repoRoot, skillDirectory);
    fs.writeFileSync(wrapperPath, expectedContent);
  }
}

function loadManifest(manifestPath) {
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    throw new Error(`Unable to read valid JSON from ${manifestPath}: ${error.message}`);
  }
  return validateManifest(parsed);
}

function runGenerator({ repoRoot, checkOnly = false }) {
  const resolvedRepoRoot = resolveRepoRoot(repoRoot);
  const manifestPath = assertOwnedPath(
    resolvedRepoRoot,
    path.join(resolvedRepoRoot, 'skills', 'manifest.json'),
  );
  const skills = loadManifest(manifestPath);

  validateCanonicalInventory(resolvedRepoRoot, skills);
  for (const wrapperRoot of WRAPPER_ROOTS) {
    syncWrapperRoot(resolvedRepoRoot, wrapperRoot, skills, checkOnly);
  }

  return skills.length;
}

function main() {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== '--check')) {
    throw new Error('Usage: node scripts/generate-skill-wrappers.cjs [--check]');
  }

  const checkOnly = args[0] === '--check';
  const repoRoot = path.resolve(__dirname, '..');
  const count = runGenerator({ repoRoot, checkOnly });
  const action = checkOnly ? 'Verified' : 'Generated';
  process.stdout.write(`${action} ${count} skills in both wrapper trees.\n`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  renderWrapper,
  runGenerator,
  validateManifest,
};
