#!/usr/bin/env node
/**
 * Validates skill discovery wrappers under .agents/skills and .claude/skills.
 *
 * Checks:
 * - skills/manifest.json is the authoritative inventory (sorted unique names)
 * - canonical skills/ and both wrapper roots equal that manifest
 * - each canonical skills/<name>/SKILL.md is a nonempty regular file with
 *   a matching H1, Goal:, and substantive ## When to use / ## Routine bodies
 * - AGENTS.md Skill Index inventory list line matches the manifest (not prose)
 * - docs/LOOP_ENGINEERING.md Loop Index Skill column matches the manifest
 *   (Trigger cells need visible instruction text; closed HTML comments only —
 *   unmatched <!-- / --> delimiters are rejected; not HTML comments alone)
 * - each wrapper has YAML front matter with non-empty string name and description
 * - each wrapper targets exactly one canonical skills/<name>/SKILL.md path
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
const CANONICAL_SKILL_PATH_RE = /^skills\/[a-z0-9]+(?:-[a-z0-9]+)*\/SKILL\.md$/;
const REQUIRED_CANONICAL_SECTIONS = ['## When to use', '## Routine'];

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
    .filter((name) => {
      const skillPath = path.join(dir, name, 'SKILL.md');
      try {
        return fs.statSync(skillPath).isFile();
      } catch {
        return false;
      }
    })
    .sort();
}

/**
 * Normalize a skill heading or directory name for equality checks.
 *
 * @param {string} value
 * @returns {string}
 */
function normalizeSkillHeading(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/**
 * Body text under an exact H2 until the next H1/H2 (exclusive).
 *
 * @param {string} content
 * @param {string} heading
 * @returns {string | null}
 */
function extractSectionBody(content, heading) {
  const lines = content.split(/\r?\n/);
  let start = -1;
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].trim() === heading) {
      start = index + 1;
      break;
    }
  }
  if (start === -1) {
    return null;
  }

  /** @type {string[]} */
  const bodyLines = [];
  for (let index = start; index < lines.length; index += 1) {
    if (/^#{1,2}\s/.test(lines[index].trim())) {
      break;
    }
    bodyLines.push(lines[index]);
  }
  return bodyLines.join('\n');
}

/**
 * True when a skill-section line still has visible instructional text after
 * stripping empty Markdown/HTML structures.
 *
 * @param {string} line
 * @returns {boolean}
 */
function hasVisibleSkillSectionLine(line) {
  let content = line.trim();
  if (content === '') {
    return false;
  }
  if (/^#{1,6}\s/.test(content)) {
    return false;
  }
  content = content.replace(/^(?:>\s*)+/, '').trim();
  if (content === '') {
    return false;
  }
  if (/^(?:\*\s*){3,}$|^(?:-\s*){3,}$|^(?:_\s*){3,}$/.test(content)) {
    return false;
  }
  content = content.replace(/^(?:[-+*]|\d+[.)])\s*/, '');
  content = content.replace(/^\[[ xX]\]\s*/, '').trim();
  if (content === '') {
    return false;
  }
  content = content.replace(/<[^>]*>/g, '').trim();
  return content !== '';
}

/**
 * Require at least one substantive visible line in a section body.
 *
 * @param {string} body
 * @returns {boolean}
 */
function sectionHasVisibleContent(body) {
  const withoutComments = body.replace(/<!--[\s\S]*?-->/g, '');
  for (const line of withoutComments.split(/\r?\n/)) {
    if (hasVisibleSkillSectionLine(line)) {
      return true;
    }
  }
  return false;
}

/**
 * Require each canonical skill file to be a nonempty regular file with the
 * shared operational skeleton agents rely on.
 *
 * @param {string[]} skillNames
 */
function validateCanonicalSkills(skillNames) {
  for (const name of skillNames) {
    const rel = `skills/${name}/SKILL.md`;
    const abs = path.join(ROOT, rel);

    let stat;
    try {
      stat = fs.statSync(abs);
    } catch {
      errors.push(`${rel}: missing canonical skill file`);
      continue;
    }
    if (!stat.isFile()) {
      errors.push(`${rel}: must be a regular file`);
      continue;
    }

    const content = fs.readFileSync(abs, 'utf8');
    if (content.trim() === '') {
      errors.push(`${rel}: must be non-empty`);
      continue;
    }

    const lines = content.split(/\r?\n/);
    const h1Line = lines.find((line) => /^#\s+\S/.test(line.trim()));
    if (!h1Line) {
      errors.push(`${rel}: missing top-level \`#\` skill heading`);
    } else {
      const headingText = h1Line.trim().replace(/^#\s+/, '');
      if (normalizeSkillHeading(headingText) !== normalizeSkillHeading(name)) {
        errors.push(
          `${rel}: top-level heading must match skill name "${name}" (got "${headingText}")`,
        );
      }
    }

    if (!/^Goal:\s*\S/m.test(content)) {
      errors.push(`${rel}: missing \`Goal:\` line with non-empty text`);
    }

    for (const section of REQUIRED_CANONICAL_SECTIONS) {
      const body = extractSectionBody(content, section);
      if (body === null) {
        errors.push(`${rel}: missing required section \`${section}\``);
        continue;
      }
      if (!sectionHasVisibleContent(body)) {
        errors.push(
          `${rel}: section \`${section}\` must contain substantive visible content`,
        );
      }
    }
  }
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
 * Skill names from the AGENTS.md Skill Index **inventory list line** only
 * (the nonempty line immediately after the “Loop routines live…” declaration).
 * Explanatory prose later in the section must not satisfy the inventory check.
 *
 * @param {string} content
 * @returns {string[]}
 */
function extractAgentsIndexSkills(content) {
  const sectionMatch = content.match(
    /## Skill Index\r?\n([\s\S]*?)(?=\r?\n## |\r?\n# |$)/,
  );
  if (!sectionMatch) {
    errors.push('AGENTS.md: missing `## Skill Index` section');
    return [];
  }

  const lines = sectionMatch[1].split(/\r?\n/);
  let declarationIndex = -1;
  for (let index = 0; index < lines.length; index += 1) {
    if (/Loop routines live in/.test(lines[index])) {
      declarationIndex = index;
      break;
    }
  }

  if (declarationIndex === -1) {
    errors.push(
      'AGENTS.md Skill Index: missing “Loop routines live…” inventory declaration line',
    );
    return [];
  }

  /** @type {string | null} */
  let inventoryLine = null;
  for (let index = declarationIndex + 1; index < lines.length; index += 1) {
    if (lines[index].trim() !== '') {
      inventoryLine = lines[index];
      break;
    }
  }

  if (inventoryLine === null) {
    errors.push(
      'AGENTS.md Skill Index: missing inventory list line after the Loop routines declaration',
    );
    return [];
  }

  /** @type {Set<string>} */
  const found = new Set();
  for (const token of extractCodeSpanTokens(inventoryLine)) {
    // Inventory lists bare kebab names (`feature-slice-builder`), not paths.
    if (token.includes('/') || token.endsWith('.md')) {
      continue;
    }
    if (/^[a-z0-9]+(?:-[a-z0-9]+)+$/.test(token)) {
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
 * Visible trigger text after stripping HTML comments.
 * Returns `null` when `<!--` / `-->` delimiters are unmatched (malformed).
 *
 * @param {string} cell
 * @returns {string | null}
 */
function visibleTriggerText(cell) {
  const opens = (cell.match(/<!--/g) ?? []).length;
  const closes = (cell.match(/-->/g) ?? []).length;
  if (opens !== closes) {
    return null;
  }
  return cell.replace(/<!--[\s\S]*?-->/g, '').trim();
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
    const visibleTrigger = visibleTriggerText(triggerCell);
    if (visibleTrigger === null) {
      errors.push(`${rowLabel}: Trigger cell has unmatched HTML comment delimiters`);
      continue;
    }
    if (visibleTrigger === '') {
      errors.push(`${rowLabel}: Trigger cell must contain visible instruction text`);
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
  try {
    if (!fs.statSync(canonicalAbs).isFile()) {
      errors.push(`${fileLabel}: canonical skill missing at ${canonicalRel}`);
    }
  } catch {
    errors.push(`${fileLabel}: canonical skill missing at ${canonicalRel}`);
  }

  const codeSpans = extractCodeSpanTokens(content);
  const targets = codeSpans.filter((token) => CANONICAL_SKILL_PATH_RE.test(token));
  if (targets.length !== 1 || targets[0] !== canonicalRel) {
    errors.push(
      `${fileLabel}: must target exactly \`${canonicalRel}\` and no other canonical skill`,
    );
  }
}

function main() {
  const manifestNames = loadManifestSkills();
  if (manifestNames.length === 0 && errors.length === 0) {
    errors.push('skill manifest `skills` array must not be empty');
  }

  validateCanonicalSkills(manifestNames);

  const canonicalNames = listSkillNames(CANONICAL_DIR);
  assertSameSet('skills/manifest.json', manifestNames, 'skills/', canonicalNames);

  if (!fs.existsSync(AGENTS_FILE)) {
    errors.push('AGENTS.md is missing');
  } else {
    const agentsNames = extractAgentsIndexSkills(fs.readFileSync(AGENTS_FILE, 'utf8'));
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
