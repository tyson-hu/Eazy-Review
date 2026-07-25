#!/usr/bin/env node
/**
 * Validates skill discovery wrappers under .agents/skills and .claude/skills.
 *
 * Checks:
 * - wrapper directories stay synchronized with each other and with skills/<name>/SKILL.md
 * - each wrapper has YAML front matter with name and description
 * - each wrapper points at an existing canonical skills/<name>/SKILL.md
 * - paired wrappers are byte-identical
 *
 * Usage: node scripts/check-skill-wrappers.cjs
 *        npm run check:skill-wrappers
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const CANONICAL_DIR = path.join(ROOT, 'skills');
const WRAPPER_ROOTS = [
  { label: '.agents/skills', dir: path.join(ROOT, '.agents', 'skills') },
  { label: '.claude/skills', dir: path.join(ROOT, '.claude', 'skills') },
];

const FRONT_MATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
const NAME_RE = /^name:\s*(.+)\s*$/m;
const DESCRIPTION_RE = /^description:\s*(.+)\s*$/m;

/** @type {string[]} */
const errors = [];

function listSkillNames(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => fs.existsSync(path.join(dir, name, 'SKILL.md')))
    .sort();
}

function parseFrontMatter(content, fileLabel) {
  const match = content.match(FRONT_MATTER_RE);
  if (!match) {
    errors.push(`${fileLabel}: missing YAML front matter (must start with --- name/description ---)`);
    return null;
  }

  const body = match[1];
  const nameMatch = body.match(NAME_RE);
  const descriptionMatch = body.match(DESCRIPTION_RE);

  if (!nameMatch) {
    errors.push(`${fileLabel}: front matter missing required \`name:\` field`);
  }
  if (!descriptionMatch) {
    errors.push(`${fileLabel}: front matter missing required \`description:\` field`);
  }

  return {
    name: nameMatch ? nameMatch[1].trim() : null,
    description: descriptionMatch ? descriptionMatch[1].trim() : null,
  };
}

function assertSameSet(labelA, setA, labelB, setB) {
  const onlyA = setA.filter((name) => !setB.includes(name));
  const onlyB = setB.filter((name) => !setA.includes(name));

  for (const name of onlyA) {
    errors.push(`${labelA} has skill "${name}" but ${labelB} does not`);
  }
  for (const name of onlyB) {
    errors.push(`${labelB} has skill "${name}" but ${labelA} does not`);
  }
}

function validateWrapper(rootLabel, skillName, content) {
  const fileLabel = `${rootLabel}/${skillName}/SKILL.md`;
  const meta = parseFrontMatter(content, fileLabel);
  if (!meta) {
    return;
  }

  if (meta.name && meta.name !== skillName) {
    errors.push(
      `${fileLabel}: front matter name "${meta.name}" does not match directory name "${skillName}"`,
    );
  }

  const canonicalRel = `skills/${skillName}/SKILL.md`;
  const canonicalAbs = path.join(ROOT, canonicalRel);
  if (!fs.existsSync(canonicalAbs)) {
    errors.push(`${fileLabel}: canonical skill missing at ${canonicalRel}`);
  }

  if (!content.includes(canonicalRel) && !content.includes(`\`${canonicalRel}\``)) {
    errors.push(`${fileLabel}: must point at canonical path \`${canonicalRel}\``);
  }
}

function main() {
  const canonicalNames = listSkillNames(CANONICAL_DIR);
  if (canonicalNames.length === 0) {
    errors.push(`no canonical skills found under ${path.relative(ROOT, CANONICAL_DIR)}`);
  }

  /** @type {Map<string, string[]>} */
  const wrapperNamesByRoot = new Map();
  /** @type {Map<string, Map<string, string>>} */
  const contentsByRoot = new Map();

  for (const root of WRAPPER_ROOTS) {
    if (!fs.existsSync(root.dir)) {
      errors.push(`wrapper root missing: ${root.label}`);
      wrapperNamesByRoot.set(root.label, []);
      contentsByRoot.set(root.label, new Map());
      continue;
    }

    const names = listSkillNames(root.dir);
    wrapperNamesByRoot.set(root.label, names);
    const contents = new Map();

    for (const name of names) {
      const filePath = path.join(root.dir, name, 'SKILL.md');
      const content = fs.readFileSync(filePath, 'utf8');
      contents.set(name, content);
      validateWrapper(root.label, name, content);
    }

    contentsByRoot.set(root.label, contents);
    assertSameSet(root.label, names, 'skills/', canonicalNames);
  }

  const [agentsRoot, claudeRoot] = WRAPPER_ROOTS;
  assertSameSet(
    agentsRoot.label,
    wrapperNamesByRoot.get(agentsRoot.label) ?? [],
    claudeRoot.label,
    wrapperNamesByRoot.get(claudeRoot.label) ?? [],
  );

  const agentsContents = contentsByRoot.get(agentsRoot.label) ?? new Map();
  const claudeContents = contentsByRoot.get(claudeRoot.label) ?? new Map();
  const sharedNames = [...agentsContents.keys()].filter((name) => claudeContents.has(name));

  for (const name of sharedNames) {
    const agentsText = agentsContents.get(name);
    const claudeText = claudeContents.get(name);
    if (agentsText !== claudeText) {
      errors.push(
        `.agents/skills/${name}/SKILL.md and .claude/skills/${name}/SKILL.md differ (wrappers must be identical)`,
      );
    }
  }

  if (errors.length > 0) {
    console.error(`check-skill-wrappers: ${errors.length} problem(s)\n`);
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log(
    `check-skill-wrappers: ok (${canonicalNames.length} skills; .agents and .claude wrappers in sync)`,
  );
}

main();
