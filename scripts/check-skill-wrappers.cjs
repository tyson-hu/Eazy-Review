#!/usr/bin/env node
/**
 * Validates skill discovery wrappers under .agents/skills and .claude/skills.
 *
 * Checks:
 * - skills/manifest.json is the authoritative inventory (sorted unique names)
 * - canonical skills/ and both wrapper roots equal that manifest
 * - AGENTS.md Skill Index and docs/LOOP_ENGINEERING.md Loop Index Skill column
 *   list the same skill names as the manifest (Trigger cells must not carry paths)
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
const MANIFEST_FILE = path.join(ROOT, 'skills', 'manifest.json');
const CANONICAL_DIR = path.join(ROOT, 'skills');
const AGENTS_FILE = path.join(ROOT, 'AGENTS.md');
const LOOP_INDEX_FILE = path.join(ROOT, 'docs', 'LOOP_ENGINEERING.md');
const WRAPPER_ROOTS = [
  { label: '.agents/skills', dir: path.join(ROOT, '.agents', 'skills') },
  { label: '.claude/skills', dir: path.join(ROOT, '.claude', 'skills') },
];

const FRONT_MATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

/** @type {string[]} */
const errors = [];

/**
 * @param {string} dir
 * @returns {string[]}
 */
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
 * Load and validate the authoritative skill inventory.
 *
 * @returns {string[]}
 */
function loadManifestSkills() {
  const rel = path.relative(ROOT, MANIFEST_FILE);
  if (!fs.existsSync(MANIFEST_FILE)) {
    errors.push(`skill manifest missing at ${rel}`);
    return [];
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`${rel}: invalid JSON (${message})`);
    return [];
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    errors.push(`${rel}: root must be a JSON object with a \`skills\` array`);
    return [];
  }

  const skills = /** @type {{ skills?: unknown }} */ (parsed).skills;
  if (!Array.isArray(skills)) {
    errors.push(`${rel}: \`skills\` must be an array of skill name strings`);
    return [];
  }

  /** @type {string[]} */
  const names = [];
  for (let index = 0; index < skills.length; index += 1) {
    const value = skills[index];
    if (typeof value !== 'string' || value.trim() === '') {
      errors.push(`${rel}: skills[${index}] must be a non-empty string`);
      continue;
    }
    if (value !== value.trim()) {
      errors.push(`${rel}: skills[${index}] must not have leading/trailing whitespace`);
    }
    names.push(value.trim());
  }

  const sorted = [...names].sort();
  for (let index = 0; index < names.length; index += 1) {
    if (names[index] !== sorted[index]) {
      errors.push(`${rel}: \`skills\` must be sorted lexicographically`);
      break;
    }
  }

  const seen = new Set();
  for (const name of names) {
    if (seen.has(name)) {
      errors.push(`${rel}: duplicate skill "${name}"`);
    }
    seen.add(name);
  }

  return sorted.filter((name, index) => sorted.indexOf(name) === index);
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

/**
 * @param {string} labelA
 * @param {string[]} setA
 * @param {string} labelB
 * @param {string[]} setB
 */
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

/**
 * Skill names listed in the AGENTS.md Skill Index paragraph (backtick tokens
 * that match known skill directory names, excluding path-style spans).
 *
 * @param {string} content
 * @param {string[]} manifestNames
 * @returns {string[]}
 */
function extractAgentsIndexSkills(content, manifestNames) {
  const sectionMatch = content.match(
    /## Skill Index\r?\n([\s\S]*?)(?=\r?\n## |\r?\n# |$)/,
  );
  if (!sectionMatch) {
    errors.push('AGENTS.md: missing `## Skill Index` section');
    return [];
  }

  const allowed = new Set(manifestNames);
  /** @type {Set<string>} */
  const found = new Set();
  for (const token of extractCodeSpanTokens(sectionMatch[1])) {
    // Index lists bare kebab names (`feature-slice-builder`), not paths.
    if (token.includes('/') || token.endsWith('.md')) {
      continue;
    }
    if (allowed.has(token) || /^[a-z0-9]+(?:-[a-z0-9]+)+$/.test(token)) {
      found.add(token);
    }
  }
  return [...found].sort();
}

/**
 * Split a Markdown table row into cells (trimmed), dropping empty edge slots
 * from the leading/trailing pipes.
 *
 * @param {string} row
 * @returns {string[]}
 */
function splitMarkdownTableCells(row) {
  const trimmed = row.trim();
  const withoutEdges = trimmed.replace(/^\|/, '').replace(/\|$/, '');
  return withoutEdges.split('|').map((cell) => cell.trim());
}

/**
 * Skill names from the ## Loop Index Skill column only.
 * Trigger-cell paths and whole-row matches must not satisfy the inventory check.
 *
 * @param {string} content
 * @param {string[]} manifestNames
 * @returns {string[]}
 */
function extractLoopIndexSkills(content, manifestNames) {
  const sectionMatch = content.match(
    /## Loop Index\r?\n([\s\S]*?)(?=\r?\n## |\r?\n# |$)/,
  );
  if (!sectionMatch) {
    errors.push('docs/LOOP_ENGINEERING.md: missing `## Loop Index` section');
    return [];
  }

  const section = sectionMatch[1];
  const rawRows = section
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|'));

  if (rawRows.length === 0) {
    errors.push('docs/LOOP_ENGINEERING.md: `## Loop Index` has no Markdown table rows');
    return [];
  }

  const headerCells = splitMarkdownTableCells(rawRows[0]);
  if (
    headerCells.length !== 2 ||
    headerCells[0].toLowerCase() !== 'trigger' ||
    headerCells[1].toLowerCase() !== 'skill'
  ) {
    errors.push(
      'docs/LOOP_ENGINEERING.md: `## Loop Index` header must be `| Trigger | Skill |`',
    );
    return [];
  }

  if (rawRows.length < 2 || !/^\|\s*-+/.test(rawRows[1])) {
    errors.push('docs/LOOP_ENGINEERING.md: `## Loop Index` is missing a separator row');
    return [];
  }

  const separatorCells = splitMarkdownTableCells(rawRows[1]);
  if (separatorCells.length !== 2 || !separatorCells.every((cell) => /^:?-{3,}:?$/.test(cell))) {
    errors.push('docs/LOOP_ENGINEERING.md: `## Loop Index` separator must have two dashed cells');
    return [];
  }

  const dataRows = rawRows.slice(2);
  if (dataRows.length === 0) {
    errors.push('docs/LOOP_ENGINEERING.md: `## Loop Index` has no data rows');
    return [];
  }

  const skillPathRe = /`skills\/([a-z0-9]+(?:-[a-z0-9]+)*)`/g;
  const allowed = new Set(manifestNames);
  /** @type {string[]} */
  const found = [];
  /** @type {Set<string>} */
  const seen = new Set();

  for (let index = 0; index < dataRows.length; index += 1) {
    const rowLabel = `docs/LOOP_ENGINEERING.md Loop Index row ${index + 1}`;
    const cells = splitMarkdownTableCells(dataRows[index]);
    if (cells.length !== 2) {
      errors.push(`${rowLabel}: expected exactly 2 cells (Trigger, Skill), found ${cells.length}`);
      continue;
    }

    const [triggerCell, skillCell] = cells;
    if (triggerCell.trim() === '') {
      errors.push(`${rowLabel}: Trigger cell must not be empty`);
      continue;
    }

    skillPathRe.lastIndex = 0;
    if (skillPathRe.test(triggerCell)) {
      errors.push(`${rowLabel}: Trigger cell must not contain a \`skills/<name>\` path`);
    }

    /** @type {string[]} */
    const skillMatches = [];
    skillPathRe.lastIndex = 0;
    let match = skillPathRe.exec(skillCell);
    while (match) {
      skillMatches.push(match[1]);
      match = skillPathRe.exec(skillCell);
    }

    if (skillMatches.length !== 1) {
      errors.push(
        `${rowLabel}: Skill cell must contain exactly one \`skills/<name>\` path (found ${skillMatches.length})`,
      );
      continue;
    }

    const skillName = skillMatches[0];
    if (!allowed.has(skillName)) {
      errors.push(`${rowLabel}: Skill \`${skillName}\` is not in skills/manifest.json`);
      continue;
    }
    if (seen.has(skillName)) {
      errors.push(`${rowLabel}: duplicate Skill \`${skillName}\` in Loop Index`);
      continue;
    }
    seen.add(skillName);
    found.push(skillName);
  }

  return found.sort();
}

/**
 * @param {string} rootLabel
 * @param {string} skillName
 * @param {string} content
 */
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
  const manifestNames = loadManifestSkills();
  if (manifestNames.length === 0 && errors.length === 0) {
    errors.push('skill manifest `skills` array must not be empty');
  }

  const canonicalNames = listSkillNames(CANONICAL_DIR);
  assertSameSet('skills/manifest.json', manifestNames, 'skills/', canonicalNames);

  if (!fs.existsSync(AGENTS_FILE)) {
    errors.push('AGENTS.md is missing');
  } else {
    const agentsNames = extractAgentsIndexSkills(
      fs.readFileSync(AGENTS_FILE, 'utf8'),
      manifestNames,
    );
    assertSameSet('skills/manifest.json', manifestNames, 'AGENTS.md Skill Index', agentsNames);
  }

  if (!fs.existsSync(LOOP_INDEX_FILE)) {
    errors.push('docs/LOOP_ENGINEERING.md is missing');
  } else {
    const loopNames = extractLoopIndexSkills(
      fs.readFileSync(LOOP_INDEX_FILE, 'utf8'),
      manifestNames,
    );
    assertSameSet(
      'skills/manifest.json',
      manifestNames,
      'docs/LOOP_ENGINEERING.md Loop Index',
      loopNames,
    );
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
    assertSameSet(root.label, names, 'skills/manifest.json', manifestNames);
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
    `check-skill-wrappers: ok (${manifestNames.length} skills; manifest, indexes, and wrappers in sync)`,
  );
}

main();
