#!/usr/bin/env node
/**
 * Validates skill discovery wrappers under .agents/skills and .claude/skills.
 *
 * Checks:
 * - wrapper directories stay synchronized with each other and with skills/<name>/SKILL.md
 * - each wrapper has YAML front matter with non-empty string name and description
 * - each wrapper points at an existing canonical skills/<name>/SKILL.md
 * - paired wrappers are byte-identical
 *
 * Usage: node scripts/check-skill-wrappers.cjs
 *        npm run check:skill-wrappers
 */

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('yaml');

const ROOT = path.resolve(__dirname, '..');
const CANONICAL_DIR = path.join(ROOT, 'skills');
const WRAPPER_ROOTS = [
  { label: '.agents/skills', dir: path.join(ROOT, '.agents', 'skills') },
  { label: '.claude/skills', dir: path.join(ROOT, '.claude', 'skills') },
];

const FRONT_MATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

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

/**
 * Parse skill-wrapper front matter with a real YAML parser and require
 * non-empty string `name` and `description`. Handwritten numeric regexes miss
 * YAML spellings such as `0x10`, `0o20`, and `0b10000`.
 *
 * @param {string} content
 * @param {string} fileLabel
 * @returns {{ name: string, description: string } | null}
 */
function parseFrontMatter(content, fileLabel) {
  const match = content.match(FRONT_MATTER_RE);
  if (!match) {
    errors.push(`${fileLabel}: missing YAML front matter (must start with --- name/description ---)`);
    return null;
  }

  let parsed;
  try {
    parsed = yaml.parse(match[1], { uniqueKeys: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`${fileLabel}: invalid YAML front matter (${message})`);
    return null;
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    errors.push(`${fileLabel}: front matter must be a YAML mapping`);
    return null;
  }

  /** @type {Record<string, unknown>} */
  const mapping = parsed;
  let ok = true;

  for (const key of ['name', 'description']) {
    if (!Object.prototype.hasOwnProperty.call(mapping, key)) {
      errors.push(`${fileLabel}: front matter missing required \`${key}:\` field`);
      ok = false;
      continue;
    }

    const value = mapping[key];
    if (typeof value !== 'string') {
      const kind = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
      errors.push(
        `${fileLabel}: front matter \`${key}\` must be a non-empty string (got ${kind})`,
      );
      ok = false;
      continue;
    }

    if (value.trim() === '') {
      errors.push(`${fileLabel}: front matter \`${key}\` must be a non-empty string`);
      ok = false;
    }
  }

  if (!ok) {
    return null;
  }

  return {
    name: /** @type {string} */ (mapping.name),
    description: /** @type {string} */ (mapping.description),
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

/**
 * Extract Markdown inline code-span tokens (single backticks; no newlines).
 * Used so wrapper targets must match the canonical path exactly, not as a substring.
 *
 * @param {string} content
 * @returns {string[]}
 */
function extractCodeSpanTokens(content) {
  /** @type {string[]} */
  const tokens = [];
  const re = /`([^`\n]+)`/g;
  let match = re.exec(content);
  while (match) {
    tokens.push(match[1]);
    match = re.exec(content);
  }
  return tokens;
}

function validateWrapper(rootLabel, skillName, content) {
  const fileLabel = `${rootLabel}/${skillName}/SKILL.md`;
  const meta = parseFrontMatter(content, fileLabel);
  if (!meta) {
    return;
  }

  if (meta.name !== skillName) {
    errors.push(
      `${fileLabel}: front matter name "${meta.name}" does not match directory name "${skillName}"`,
    );
  }

  const canonicalRel = `skills/${skillName}/SKILL.md`;
  const canonicalAbs = path.join(ROOT, canonicalRel);
  if (!fs.existsSync(canonicalAbs)) {
    errors.push(`${fileLabel}: canonical skill missing at ${canonicalRel}`);
  }

  const codeSpans = extractCodeSpanTokens(content);
  if (!codeSpans.includes(canonicalRel)) {
    errors.push(
      `${fileLabel}: must include an exact Markdown code span for canonical path \`${canonicalRel}\``,
    );
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
