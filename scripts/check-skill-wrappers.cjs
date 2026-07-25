#!/usr/bin/env node
/**
 * Validates skill discovery wrappers under .agents/skills and .claude/skills.
 *
 * Checks:
 * - wrapper directories stay synchronized with each other and with skills/<name>/SKILL.md
 * - each wrapper has YAML front matter with non-empty name and description scalars
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
 * Parse the limited YAML subset used by skill wrappers: a flat mapping of
 * unquoted or fully closed single-/double-quoted scalar keys required for discovery.
 * Rejects null/empty values (e.g. `description: # comment`), YAML null spellings
 * (`null`, `~`, case-insensitive when unquoted), non-string YAML scalars (booleans,
 * numbers, and special floats such as `.inf` / `.nan`), unclosed quotes, and
 * unsupported collection/block indicators (`[`, `{`, `|`, `>`).
 *
 * @param {string} body
 * @param {string} fileLabel
 * @returns {Record<string, string> | null}
 */
function parseSimpleYamlMapping(body, fileLabel) {
  /** @type {Record<string, string>} */
  const result = {};
  const lines = body.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim() === '' || line.trimStart().startsWith('#')) {
      continue;
    }

    const match = line.match(/^([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*(.*)$/);
    if (!match) {
      errors.push(`${fileLabel}: unsupported front matter line ${i + 1} (expected key: scalar)`);
      return null;
    }

    const key = match[1];
    let raw = match[2];

    if (raw.includes(' #')) {
      raw = raw.slice(0, raw.indexOf(' #')).trimEnd();
    }

    if (raw === '' || raw === '#' || raw.startsWith('#')) {
      errors.push(
        `${fileLabel}: front matter \`${key}\` is null/empty (comments alone are not a valid value)`,
      );
      return null;
    }

    const first = raw[0];
    if (first === '[' || first === '{' || first === '|' || first === '>') {
      errors.push(
        `${fileLabel}: front matter \`${key}\` uses unsupported YAML syntax (collections/block scalars are not allowed)`,
      );
      return null;
    }

    let value = raw;
    if (first === '"' || first === "'") {
      if (raw.length < 2 || raw[raw.length - 1] !== first) {
        errors.push(
          `${fileLabel}: front matter \`${key}\` has an unclosed ${first === '"' ? 'double' : 'single'} quote`,
        );
        return null;
      }
      value = raw.slice(1, -1);
    } else {
      const trimmed = raw.trim();
      // Unquoted YAML null / boolean / numeric scalars are not usable discovery strings.
      if (/^(?:~|null)$/i.test(trimmed)) {
        errors.push(
          `${fileLabel}: front matter \`${key}\` is a YAML null scalar (use a non-empty string description)`,
        );
        return null;
      }
      if (/^(?:true|false|yes|no|on|off)$/i.test(trimmed)) {
        errors.push(
          `${fileLabel}: front matter \`${key}\` is a YAML boolean scalar (use a quoted or plain string)`,
        );
        return null;
      }
      if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(trimmed)) {
        errors.push(
          `${fileLabel}: front matter \`${key}\` is a YAML numeric scalar (use a quoted or plain string)`,
        );
        return null;
      }
      if (/^[+-]?\.(?:inf|nan)$/i.test(trimmed)) {
        errors.push(
          `${fileLabel}: front matter \`${key}\` is a YAML special float (use a quoted or plain string)`,
        );
        return null;
      }
    }

    if (value.trim() === '') {
      errors.push(`${fileLabel}: front matter \`${key}\` must be a non-empty scalar`);
      return null;
    }

    if (Object.prototype.hasOwnProperty.call(result, key)) {
      errors.push(`${fileLabel}: duplicate front matter key \`${key}\``);
      return null;
    }

    result[key] = value;
  }

  return result;
}

function parseFrontMatter(content, fileLabel) {
  const match = content.match(FRONT_MATTER_RE);
  if (!match) {
    errors.push(`${fileLabel}: missing YAML front matter (must start with --- name/description ---)`);
    return null;
  }

  const mapping = parseSimpleYamlMapping(match[1], fileLabel);
  if (!mapping) {
    return null;
  }

  if (!Object.prototype.hasOwnProperty.call(mapping, 'name')) {
    errors.push(`${fileLabel}: front matter missing required \`name:\` field`);
  }
  if (!Object.prototype.hasOwnProperty.call(mapping, 'description')) {
    errors.push(`${fileLabel}: front matter missing required \`description:\` field`);
  }

  if (!mapping.name || !mapping.description) {
    return null;
  }

  return {
    name: mapping.name,
    description: mapping.description,
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
