#!/usr/bin/env node
/**
 * Validates ADR-style decision records and generates docs/DECISIONS.md.
 *
 * Usage:
 *   node scripts/build-decision-index.cjs
 *   node scripts/build-decision-index.cjs --check
 */

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DECISIONS_DIR = path.join(ROOT, 'docs', 'decisions');
const INDEX_FILE = path.join(ROOT, 'docs', 'DECISIONS.md');
const ARCHIVE_FILE = path.join(DECISIONS_DIR, 'archive', '2026-pre-adr-log.md');
/** Immutable legacy log digest. Update only when the archive is intentionally rewritten. */
const EXPECTED_ARCHIVE_SHA256 =
  'f50f9dd3181bc87d740019aecec6eaebcbf7311e7046e374f56dcb7d44f9c8f2';
const FRONT_MATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
const FILE_NAME_RE = /^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;
const ID_RE = /^decision-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const REQUIRED_SECTIONS = [
  '## Context',
  '## Decision',
  '## Consequences',
  '## Revisit when',
  '## Related',
];
const REQUIRED_FIELDS = [
  'id',
  'date',
  'status',
  'area',
  'tasks',
  'pr',
  'tags',
  'supersedes',
];
const OPTIONAL_FIELDS = new Set(['updated', 'superseded_by']);
const STATUS_LABELS = new Map([
  ['proposed', 'Proposed'],
  ['accepted', 'Accepted'],
  ['superseded', 'Superseded'],
  ['reversed', 'Reversed'],
  ['deprecated', 'Deprecated'],
]);
const AREA_LABELS = new Map([
  ['product-ux', 'Product and UX'],
  ['data-supabase', 'Data and Supabase'],
  ['auth-security', 'Authentication and security'],
  ['architecture', 'Architecture'],
  ['tooling-ci', 'Tooling and CI'],
  ['agent-workflow', 'Agent workflow'],
]);
const CURRENT_STATUSES = new Set(['proposed', 'accepted', 'deprecated']);

function parseString(raw, fileLabel, field) {
  const value = raw.trim();
  if (value === '') {
    throw new Error(`${fileLabel}: front matter \`${field}\` must not be empty`);
  }

  if (value.startsWith('"') || value.endsWith('"')) {
    if (!(value.startsWith('"') && value.endsWith('"'))) {
      throw new Error(`${fileLabel}: front matter \`${field}\` has an unclosed double quote`);
    }
    try {
      return JSON.parse(value);
    } catch {
      throw new Error(`${fileLabel}: front matter \`${field}\` has invalid double-quoted text`);
    }
  }

  if (value.startsWith("'") || value.endsWith("'")) {
    if (!(value.startsWith("'") && value.endsWith("'"))) {
      throw new Error(`${fileLabel}: front matter \`${field}\` has an unclosed single quote`);
    }
    return value.slice(1, -1).replace(/''/g, "'");
  }

  return value;
}

function parseArray(raw, fileLabel, field) {
  const value = raw.trim();
  if (!value.startsWith('[') || !value.endsWith(']')) {
    throw new Error(`${fileLabel}: front matter \`${field}\` must use an inline array`);
  }

  const body = value.slice(1, -1).trim();
  if (body === '') {
    return [];
  }

  return body.split(',').map((item) => parseString(item, fileLabel, field));
}

function parseFrontMatter(content, fileLabel) {
  const match = content.match(FRONT_MATTER_RE);
  if (!match) {
    throw new Error(`${fileLabel}: missing YAML front matter at the start of the file`);
  }

  const metadata = {};
  const lines = match[1].split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() === '' || line.trimStart().startsWith('#')) {
      continue;
    }

    const fieldMatch = line.match(/^([a-z][a-z0-9_]*):\s*(.*)$/);
    if (!fieldMatch) {
      throw new Error(
        `${fileLabel}: unsupported front matter line ${index + 1} (expected \`field: value\`)`,
      );
    }

    const field = fieldMatch[1];
    const raw = fieldMatch[2];
    if (Object.prototype.hasOwnProperty.call(metadata, field)) {
      throw new Error(`${fileLabel}: duplicate front matter field \`${field}\``);
    }
    if (!REQUIRED_FIELDS.includes(field) && !OPTIONAL_FIELDS.has(field)) {
      throw new Error(`${fileLabel}: unsupported front matter field \`${field}\``);
    }

    if (field === 'tasks' || field === 'tags' || field === 'supersedes') {
      metadata[field] = parseArray(raw, fileLabel, field);
    } else if (field === 'pr') {
      const value = raw.trim();
      if (value === 'null') {
        metadata[field] = null;
      } else if (/^[1-9]\d*$/.test(value)) {
        metadata[field] = Number(value);
      } else {
        throw new Error(`${fileLabel}: front matter \`pr\` must be a positive integer or null`);
      }
    } else {
      metadata[field] = parseString(raw, fileLabel, field);
    }
  }

  for (const field of REQUIRED_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(metadata, field)) {
      throw new Error(`${fileLabel}: missing required front matter field \`${field}\``);
    }
  }

  return { metadata, body: match[2] };
}

function isValidDate(value) {
  if (!DATE_RE.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function assertUniqueSorted(values, fileLabel, field, compare) {
  if (new Set(values).size !== values.length) {
    throw new Error(`${fileLabel}: front matter \`${field}\` contains duplicate values`);
  }

  const sorted = [...values].sort(compare);
  if (values.some((value, index) => value !== sorted[index])) {
    throw new Error(`${fileLabel}: front matter \`${field}\` must be sorted`);
  }
}

/**
 * Parse a CommonMark fence line. Closing fences must use the same marker, a run
 * at least as long as the opener, and only trailing whitespace after the run.
 *
 * @param {string} line
 * @returns {{ marker: '`' | '~', length: number, info: string } | null}
 */
function parseFenceLine(line) {
  const match = line.match(/^ {0,3}([`~])\1{2,}(.*)$/);
  if (!match) {
    return null;
  }

  const marker = /** @type {'`' | '~'} */ (match[1]);
  const afterIndent = line.replace(/^ {0,3}/, '');
  let length = 0;
  while (length < afterIndent.length && afterIndent[length] === marker) {
    length += 1;
  }
  const info = afterIndent.slice(length);
  return { marker, length, info };
}

/**
 * Walk body lines outside fenced code (compatible open/close markers).
 *
 * @param {string} body
 * @param {(line: string, lineIndex: number, lines: string[]) => void} onUnfencedLine
 */
function forEachUnfencedLine(body, onUnfencedLine) {
  const lines = body.split(/\r?\n/);
  /** @type {{ marker: '`' | '~', length: number } | null} */
  let openFence = null;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    const fenceLine = parseFenceLine(line);
    if (fenceLine) {
      if (openFence === null) {
        // Opening backtick fences cannot contain backticks in the info string.
        if (fenceLine.marker === '`' && fenceLine.info.includes('`')) {
          // Not a fence; fall through and treat as ordinary content.
        } else {
          openFence = { marker: fenceLine.marker, length: fenceLine.length };
          continue;
        }
      } else if (
        fenceLine.marker === openFence.marker &&
        fenceLine.length >= openFence.length &&
        /^\s*$/.test(fenceLine.info)
      ) {
        openFence = null;
        continue;
      }
      // Opposite marker, shorter run, or non-whitespace after a closing run:
      // remain inside the open fence and treat the line as fenced content.
    }
    if (openFence !== null) {
      continue;
    }
    onUnfencedLine(line, lineIndex, lines);
  }
}

/**
 * Extract the unique unfenced level-one title and validate required ## sections
 * as exact unfenced heading lines in canonical order.
 *
 * @param {string} body
 * @param {string} fileLabel
 * @returns {string}
 */
function extractTitleAndValidateSections(body, fileLabel) {
  const lines = body.split(/\r?\n/);
  /** @type {{ line: string, lineIndex: number }[]} */
  const titleMatches = [];
  /** @type {Map<string, number[]>} */
  const matchesBySection = new Map(REQUIRED_SECTIONS.map((section) => [section, []]));

  forEachUnfencedLine(body, (line, lineIndex) => {
    // Level-one ATX heading: "# " then text (not "## ...").
    if (/^# .+/.test(line) && !line.startsWith('##')) {
      titleMatches.push({ line, lineIndex });
    }
    for (const section of REQUIRED_SECTIONS) {
      if (new RegExp(`^${section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`).test(line)) {
        matchesBySection.get(section).push(lineIndex);
      }
    }
  });

  if (titleMatches.length !== 1) {
    throw new Error(
      `${fileLabel}: body must contain exactly one unfenced level-one title (found ${titleMatches.length})`,
    );
  }
  const title = titleMatches[0].line.replace(/^#\s+/, '').trim();
  if (title === '') {
    throw new Error(`${fileLabel}: level-one title must not be empty`);
  }

  /** @type {number[]} */
  const sectionLineIndexes = [];
  for (const section of REQUIRED_SECTIONS) {
    const matches = matchesBySection.get(section) ?? [];
    if (matches.length === 0) {
      throw new Error(`${fileLabel}: missing required section \`${section}\``);
    }
    if (matches.length > 1) {
      throw new Error(
        `${fileLabel}: required section \`${section}\` must appear exactly once (found ${matches.length})`,
      );
    }
    sectionLineIndexes.push(matches[0]);
  }

  for (let index = 1; index < sectionLineIndexes.length; index += 1) {
    if (sectionLineIndexes[index] <= sectionLineIndexes[index - 1]) {
      throw new Error(`${fileLabel}: required sections are out of order`);
    }
  }

  for (let index = 0; index < REQUIRED_SECTIONS.length; index += 1) {
    const contentStart = sectionLineIndexes[index] + 1;
    const contentEnd = sectionLineIndexes[index + 1] ?? lines.length;
    const sectionBody = lines.slice(contentStart, contentEnd).join('\n');
    if (sectionBody.trim() === '') {
      throw new Error(`${fileLabel}: section \`${REQUIRED_SECTIONS[index]}\` must not be empty`);
    }
  }

  return title;
}

function assertLegacyArchiveIntegrity() {
  if (!fs.existsSync(ARCHIVE_FILE)) {
    throw new Error('legacy archive is missing at docs/decisions/archive/2026-pre-adr-log.md');
  }

  const content = fs.readFileSync(ARCHIVE_FILE);
  const digest = crypto.createHash('sha256').update(content).digest('hex');
  if (digest !== EXPECTED_ARCHIVE_SHA256) {
    throw new Error(
      `legacy archive SHA-256 mismatch (expected ${EXPECTED_ARCHIVE_SHA256}, got ${digest}). ` +
        'If the archive was intentionally rewritten, update EXPECTED_ARCHIVE_SHA256 in scripts/build-decision-index.cjs.',
    );
  }
}

/**
 * Reject self-references and cycles in the superseded_by replacement graph.
 * Edges run from each superseded decision to its replacement.
 */
function assertAcyclicSupersession(decisions) {
  /** @type {Map<string, string>} */
  const replacementById = new Map();

  for (const decision of decisions) {
    if (decision.supersedes.includes(decision.id)) {
      throw new Error(
        `${decision.fileName}: \`supersedes\` must not include the record's own id \`${decision.id}\``,
      );
    }
    if (decision.superseded_by === decision.id) {
      throw new Error(
        `${decision.fileName}: \`superseded_by\` must not reference the record's own id \`${decision.id}\``,
      );
    }
    if (decision.superseded_by) {
      replacementById.set(decision.id, decision.superseded_by);
    }
  }

  const visiting = new Set();
  const visited = new Set();

  /**
   * @param {string} decisionId
   * @param {string[]} path
   */
  function visit(decisionId, path) {
    if (visited.has(decisionId)) {
      return;
    }
    if (visiting.has(decisionId)) {
      const cycleStart = path.indexOf(decisionId);
      const cycle = [...path.slice(cycleStart), decisionId];
      throw new Error(`supersession cycle detected: ${cycle.join(' -> ')}`);
    }

    visiting.add(decisionId);
    const replacementId = replacementById.get(decisionId);
    if (replacementId) {
      visit(replacementId, [...path, decisionId]);
    }
    visiting.delete(decisionId);
    visited.add(decisionId);
  }

  for (const decisionId of replacementById.keys()) {
    visit(decisionId, []);
  }
}

function readDecision(fileName) {
  const filePath = path.join(DECISIONS_DIR, fileName);
  const fileLabel = `docs/decisions/${fileName}`;
  const content = fs.readFileSync(filePath, 'utf8');
  const { metadata, body } = parseFrontMatter(content, fileLabel);

  if (!FILE_NAME_RE.test(fileName)) {
    throw new Error(`${fileLabel}: filename must be YYYY-MM-DD-lowercase-slug.md`);
  }
  if (!ID_RE.test(metadata.id)) {
    throw new Error(`${fileLabel}: \`id\` must match ${ID_RE}`);
  }
  if (!isValidDate(metadata.date)) {
    throw new Error(`${fileLabel}: \`date\` must be a real YYYY-MM-DD date`);
  }
  if (!fileName.startsWith(`${metadata.date}-`)) {
    throw new Error(`${fileLabel}: filename date must match front matter \`date\``);
  }
  if (metadata.updated !== undefined) {
    if (!isValidDate(metadata.updated)) {
      throw new Error(`${fileLabel}: \`updated\` must be a real YYYY-MM-DD date`);
    }
    if (metadata.updated < metadata.date) {
      throw new Error(`${fileLabel}: \`updated\` cannot be earlier than \`date\``);
    }
  }
  if (!STATUS_LABELS.has(metadata.status)) {
    throw new Error(
      `${fileLabel}: unknown status \`${metadata.status}\` (use ${[...STATUS_LABELS.keys()].join(', ')})`,
    );
  }
  if (!AREA_LABELS.has(metadata.area)) {
    throw new Error(
      `${fileLabel}: unknown area \`${metadata.area}\` (use ${[...AREA_LABELS.keys()].join(', ')})`,
    );
  }

  metadata.tasks = metadata.tasks.map((task) => {
    if (!/^[1-9]\d*$/.test(task)) {
      throw new Error(`${fileLabel}: every \`tasks\` value must be a positive integer`);
    }
    return Number(task);
  });
  assertUniqueSorted(metadata.tasks, fileLabel, 'tasks', (left, right) => left - right);

  if (metadata.tags.length === 0) {
    throw new Error(`${fileLabel}: \`tags\` must contain at least one tag`);
  }
  for (const tag of metadata.tags) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tag)) {
      throw new Error(`${fileLabel}: tag \`${tag}\` must be a lowercase slug`);
    }
  }
  assertUniqueSorted(metadata.tags, fileLabel, 'tags', (left, right) =>
    left.localeCompare(right),
  );

  for (const decisionId of metadata.supersedes) {
    if (!ID_RE.test(decisionId)) {
      throw new Error(`${fileLabel}: superseded id \`${decisionId}\` is invalid`);
    }
  }
  assertUniqueSorted(metadata.supersedes, fileLabel, 'supersedes', (left, right) =>
    left.localeCompare(right),
  );

  if (metadata.status === 'superseded') {
    if (!metadata.superseded_by || !ID_RE.test(metadata.superseded_by)) {
      throw new Error(`${fileLabel}: superseded decisions require a valid \`superseded_by\` id`);
    }
  } else if (metadata.superseded_by !== undefined) {
    throw new Error(`${fileLabel}: only superseded decisions may define \`superseded_by\``);
  }

  const title = extractTitleAndValidateSections(body, fileLabel);

  return {
    ...metadata,
    title,
    fileName,
    updated: metadata.updated ?? metadata.date,
  };
}

function loadDecisions() {
  if (!fs.existsSync(DECISIONS_DIR)) {
    throw new Error('docs/decisions is missing');
  }
  assertLegacyArchiveIntegrity();

  const fileNames = fs
    .readdirSync(DECISIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'README.md')
    .map((entry) => entry.name)
    .sort();

  if (fileNames.length === 0) {
    throw new Error('no ADR files found under docs/decisions');
  }

  const decisions = fileNames.map(readDecision);
  const byId = new Map();
  for (const decision of decisions) {
    if (byId.has(decision.id)) {
      throw new Error(
        `duplicate decision id \`${decision.id}\` in ${byId.get(decision.id).fileName} and ${decision.fileName}`,
      );
    }
    byId.set(decision.id, decision);
  }

  for (const decision of decisions) {
    for (const supersededId of decision.supersedes) {
      const superseded = byId.get(supersededId);
      if (!superseded) {
        throw new Error(`${decision.fileName}: \`supersedes\` references missing id ${supersededId}`);
      }
      if (
        superseded.status !== 'superseded' ||
        superseded.superseded_by !== decision.id
      ) {
        throw new Error(
          `${decision.fileName}: ${supersededId} must be status superseded and point back with \`superseded_by: ${decision.id}\``,
        );
      }
    }

    if (decision.superseded_by) {
      const replacement = byId.get(decision.superseded_by);
      if (!replacement) {
        throw new Error(
          `${decision.fileName}: \`superseded_by\` references missing id ${decision.superseded_by}`,
        );
      }
      if (!replacement.supersedes.includes(decision.id)) {
        throw new Error(
          `${decision.fileName}: replacement ${decision.superseded_by} must list ${decision.id} in \`supersedes\``,
        );
      }
    }
  }

  assertAcyclicSupersession(decisions);

  return decisions;
}

function escapeTable(value) {
  return String(value).replace(/\|/g, '\\|');
}

function decisionLink(decision) {
  return `[${escapeTable(decision.title)}](decisions/${decision.fileName})`;
}

function tasksLabel(tasks) {
  return tasks.length === 0 ? '—' : tasks.join(', ');
}

function sortByAreaThenUpdated(left, right) {
  const areaKeys = [...AREA_LABELS.keys()];
  return (
    areaKeys.indexOf(left.area) - areaKeys.indexOf(right.area) ||
    right.updated.localeCompare(left.updated) ||
    left.title.localeCompare(right.title)
  );
}

function sortByUpdated(left, right) {
  return (
    right.updated.localeCompare(left.updated) ||
    right.date.localeCompare(left.date) ||
    left.title.localeCompare(right.title)
  );
}

function renderIndex(decisions) {
  const current = decisions
    .filter((decision) => CURRENT_STATUSES.has(decision.status))
    .sort(sortByAreaThenUpdated);
  const recent = [...decisions].sort(sortByUpdated).slice(0, 10);
  const lines = [
    '<!-- Generated by scripts/build-decision-index.cjs. Do not edit this file directly. -->',
    '',
    '# Decision Index',
    '',
    'This compact index is generated from the ADR-style records in `docs/decisions/`.',
    'Edit a decision record, then run `npm run decisions:build`. Recording rules and',
    'the template live in [`docs/decisions/README.md`](decisions/README.md).',
    '',
    '## Current high-impact decisions',
    '',
    '| Area | Decision | Status | Tasks | Updated |',
    '| --- | --- | --- | --- | --- |',
  ];

  for (const decision of current) {
    lines.push(
      `| ${AREA_LABELS.get(decision.area)} | ${decisionLink(decision)} | ${STATUS_LABELS.get(decision.status)} | ${tasksLabel(decision.tasks)} | ${decision.updated} |`,
    );
  }

  lines.push(
    '',
    '## Recently added or changed',
    '',
    '| Decision | Area | Status | Updated |',
    '| --- | --- | --- | --- |',
  );
  for (const decision of recent) {
    lines.push(
      `| ${decisionLink(decision)} | ${AREA_LABELS.get(decision.area)} | ${STATUS_LABELS.get(decision.status)} | ${decision.updated} |`,
    );
  }

  lines.push('', '## Browse by area', '');
  for (const [area, label] of AREA_LABELS) {
    const areaDecisions = current.filter((decision) => decision.area === area);
    if (areaDecisions.length === 0) {
      lines.push(`### ${label}`, '', '- No current decisions.', '');
      continue;
    }

    lines.push(`### ${label}`, '');
    for (const decision of areaDecisions) {
      const taskSuffix =
        decision.tasks.length === 0 ? '' : `; Tasks ${decision.tasks.join(', ')}`;
      lines.push(
        `- ${decisionLink(decision)} — ${STATUS_LABELS.get(decision.status)}${taskSuffix}.`,
      );
    }
    lines.push('');
  }

  lines.push(
    '## Historical log',
    '',
    '- [Legacy decisions before the ADR structure](decisions/archive/2026-pre-adr-log.md) — the complete pre-migration log; historical context only.',
    '',
  );

  const output = lines.join('\n');
  const lineCount = output.split('\n').length;
  if (lineCount > 200) {
    throw new Error(`generated docs/DECISIONS.md is ${lineCount} lines; keep it at or below 200`);
  }
  return output;
}

function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== '--check') || args.filter((arg) => arg === '--check').length > 1) {
    throw new Error('usage: node scripts/build-decision-index.cjs [--check]');
  }

  const checkOnly = args.includes('--check');
  const decisions = loadDecisions();
  const expected = renderIndex(decisions);

  if (checkOnly) {
    const actual = fs.existsSync(INDEX_FILE) ? fs.readFileSync(INDEX_FILE, 'utf8') : '';
    if (actual !== expected) {
      console.error(
        'decision-index: docs/DECISIONS.md is stale; run `npm run decisions:build` and commit the result',
      );
      process.exitCode = 1;
      return;
    }
    console.log(`decision-index: ok (${decisions.length} decision records; generated index current)`);
    return;
  }

  fs.writeFileSync(INDEX_FILE, expected);
  console.log(`decision-index: wrote docs/DECISIONS.md from ${decisions.length} decision records`);
}

try {
  main();
} catch (error) {
  console.error(`decision-index: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
