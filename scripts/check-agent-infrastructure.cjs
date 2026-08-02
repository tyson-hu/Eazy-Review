#!/usr/bin/env node

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const LIFECYCLES = new Set([
  'evergreen',
  'status',
  'generated',
  'mirror',
  'historical',
]);
const DOCUMENT_KINDS = new Set(['file', 'directory']);
const MIRROR_RELATIONSHIPS = new Set(['pointer', 'summary', 'template']);
const TASK_FIELDS = [
  'Status',
  'Depends on',
  'Unlocks',
  'Execution owner',
  'Parallel-safe with',
  'Human gate',
];
const TEXT_EXTENSIONS = new Set([
  '.cjs',
  '.js',
  '.json',
  '.md',
  '.mdc',
  '.mjs',
  '.toml',
  '.ts',
  '.tsx',
  '.yaml',
  '.yml',
]);
const PROTECTED_TASK_EXECUTION_OWNER =
  'Parent — verified strong; the generic implementer may receive only bounded non-sensitive leaf packets.';
const TASK_19_HUMAN_GATE =
  'Actual account deletion is human-only on every environment; the staging destructive checklist is also human-run.';
const ACTIVE_LEVEL_TWO_HEADING = /^##(?!#)(?:\s+|$)/;
const REQUIRED_STALE_SCAN_LIFECYCLES = ['evergreen', 'mirror', 'status'];
const TASK_HEADING =
  /^## Task ([1-9]\d*):\s+(.+?)\s*$/;
const CANONICAL_TASK_NUMBER = /^[1-9]\d*$/;
// Sticky `y` is intentionally unsupported: full-content scans add `g` and use
// matchAll(), so sticky semantics would silently miss non-zero offsets.
const PERMITTED_REGEX_FLAGS = new Set(['d', 'g', 'i', 'm', 's', 'u', 'v']);
const RAW_HTML_BLOCK_OPENER =
  /^ {0,3}(?:<(?:pre|script|style|table|div)(?=[\s/>]|$)|<!DOCTYPE\b|<!\[)/i;
// CommonMark type-1 HTML blocks continue through blank lines until a closer.
const RAW_HTML_CONTAINER_OPENER =
  /^ {0,3}<(?:pre|script|style)(?=[\s/>]|$)/i;
const REVISED_SEQUENCE_HEADER =
  /^\|\s*Task\s*\|\s*Title\s*\|\s*Status\s*\|\s*$/i;
const REVISED_SEQUENCE_DELIMITER =
  /^\|(?:\s*:?-{3,}:?\s*\|){3}\s*$/;
// Published Task ledger enforced by the agent-infrastructure graph.
const REQUIRED_TASK_GRAPH_DOCUMENT = 'docs/TASKS.md';
const REQUIRED_TASK_GRAPH_FIRST = 13;
const REQUIRED_TASK_GRAPH_LAST = 29;
// Optional trailing ATX closing hashes (CommonMark-compatible) count as the same heading.
const REVISED_SEQUENCE_HEADING = /^##[ \t]+Revised Sequence(?:[ \t]+#+)?[ \t]*$/;

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function assertObject(value, context) {
  if (!isPlainObject(value)) {
    throw new Error(`${context} must be a JSON object.`);
  }
}

function assertKeys(value, required, optional, context) {
  const allowed = new Set([...required, ...optional]);
  const keys = Object.keys(value);
  const missing = required.filter((key) => !Object.hasOwn(value, key));
  const unexpected = keys.filter((key) => !allowed.has(key));
  if (missing.length > 0 || unexpected.length > 0) {
    const details = [];
    if (missing.length > 0) {
      details.push(`missing ${missing.join(', ')}`);
    }
    if (unexpected.length > 0) {
      details.push(`unexpected ${unexpected.join(', ')}`);
    }
    throw new Error(`${context} has invalid keys (${details.join('; ')}).`);
  }
}

function assertNonEmptyString(value, context) {
  if (
    typeof value !== 'string' ||
    value.trim() !== value ||
    value.length === 0 ||
    /[\r\n]/.test(value)
  ) {
    throw new Error(`${context} must be a non-empty, single-line string.`);
  }
}

function assertArray(value, context, { nonEmpty = false } = {}) {
  if (!Array.isArray(value) || (nonEmpty && value.length === 0)) {
    throw new Error(
      `${context} must be ${nonEmpty ? 'a non-empty' : 'an'} array.`,
    );
  }
}

function assertUnique(values, context) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) {
      throw new Error(`${context} contains duplicate value "${value}".`);
    }
    seen.add(value);
  }
}

function validateRelativePath(value, context) {
  assertNonEmptyString(value, context);
  if (
    value.includes('\\') ||
    path.posix.isAbsolute(value) ||
    value === '.' ||
    value.endsWith('/') ||
    path.posix.normalize(value) !== value ||
    value.split('/').includes('..')
  ) {
    throw new Error(`${context} must be a normalized repository-relative path.`);
  }
  return value;
}

function validateRegex(pattern, flags, context) {
  assertNonEmptyString(pattern, `${context}.pattern`);
  if (
    typeof flags !== 'string' ||
    [...flags].some((flag) => !PERMITTED_REGEX_FLAGS.has(flag))
  ) {
    throw new Error(`${context}.flags contains unsupported regular-expression flags.`);
  }
  assertUnique([...flags], `${context}.flags`);
  let expression;
  try {
    expression = new RegExp(pattern, flags);
  } catch (error) {
    throw new Error(`${context} has an invalid regular expression: ${error.message}`);
  }
  expression.lastIndex = 0;
  if (expression.test('')) {
    throw new Error(`${context} regular expression must not match an empty string.`);
  }
}

function globToRegExp(glob) {
  assertNonEmptyString(glob, 'Glob');
  if (
    glob.includes('\\') ||
    path.posix.isAbsolute(glob) ||
    glob === '.' ||
    glob.endsWith('/') ||
    path.posix.normalize(glob) !== glob ||
    glob.split('/').some((segment) => segment === '.' || segment === '..')
  ) {
    throw new Error(`Invalid repository glob "${glob}".`);
  }

  let source = '^';
  for (let index = 0; index < glob.length; index += 1) {
    const character = glob[index];
    if (character === '*') {
      if (glob[index + 1] === '*') {
        index += 1;
        if (glob[index + 1] === '/') {
          index += 1;
          source += '(?:.*/)?';
        } else {
          source += '.*';
        }
      } else {
        source += '[^/]*';
      }
    } else if (character === '?') {
      source += '[^/]';
    } else {
      source += character.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
    }
  }
  source += '$';
  return new RegExp(source);
}

function matchesGlob(relativePath, glob) {
  return globToRegExp(glob).test(relativePath);
}

function findDependencyCycle(nodes, edges) {
  const nodeList = [...nodes];
  const graph = new Map(nodeList.map((node) => [node, []]));
  for (const [from, to] of edges) {
    graph.get(from)?.push(to);
  }
  for (const neighbors of graph.values()) {
    neighbors.sort(compareCodeUnits);
  }

  const state = new Map();
  const stack = [];

  function visit(node) {
    const current = state.get(node) ?? 0;
    if (current === 2) {
      return null;
    }
    if (current === 1) {
      const start = stack.indexOf(node);
      return [...stack.slice(start), node];
    }

    state.set(node, 1);
    stack.push(node);
    for (const neighbor of graph.get(node) ?? []) {
      const cycle = visit(neighbor);
      if (cycle) {
        return cycle;
      }
    }
    stack.pop();
    state.set(node, 2);
    return null;
  }

  for (const node of [...nodeList].sort(compareCodeUnits)) {
    const cycle = visit(node);
    if (cycle) {
      return cycle;
    }
  }
  return null;
}

function validateConfig(config) {
  assertObject(config, 'Agent infrastructure manifest');
  assertKeys(
    config,
    [
      'version',
      'owners',
      'documents',
      'mirrors',
      'generatedFiles',
      'dependencies',
      'staleTerms',
      'impactRules',
      'taskGraph',
    ],
    [],
    'Agent infrastructure manifest',
  );
  if (config.version !== 1) {
    throw new Error('Agent infrastructure manifest version must be 1.');
  }

  assertArray(config.owners, 'owners', { nonEmpty: true });
  const ownerIds = [];
  for (const [index, owner] of config.owners.entries()) {
    const context = `owners[${index}]`;
    assertObject(owner, context);
    assertKeys(owner, ['id', 'description'], [], context);
    assertNonEmptyString(owner.id, `${context}.id`);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(owner.id)) {
      throw new Error(`${context}.id must be kebab-case.`);
    }
    assertNonEmptyString(owner.description, `${context}.description`);
    ownerIds.push(owner.id);
  }
  assertUnique(ownerIds, 'owners');
  const ownerSet = new Set(ownerIds);

  assertArray(config.documents, 'documents', { nonEmpty: true });
  const documents = new Map();
  for (const [index, document] of config.documents.entries()) {
    const context = `documents[${index}]`;
    assertObject(document, context);
    assertKeys(
      document,
      ['path', 'kind', 'lifecycle', 'owner'],
      ['requiredOnDisk', 'staleScan'],
      context,
    );
    validateRelativePath(document.path, `${context}.path`);
    if (!DOCUMENT_KINDS.has(document.kind)) {
      throw new Error(`${context}.kind must be "file" or "directory".`);
    }
    if (!LIFECYCLES.has(document.lifecycle)) {
      throw new Error(`${context}.lifecycle must be a supported lifecycle.`);
    }
    if (!ownerSet.has(document.owner)) {
      throw new Error(`${context}.owner references unknown owner "${document.owner}".`);
    }
    if (
      Object.hasOwn(document, 'staleScan') &&
      typeof document.staleScan !== 'boolean'
    ) {
      throw new Error(`${context}.staleScan must be a boolean.`);
    }
    if (document.staleScan === false && !document.path.endsWith('.json')) {
      throw new Error(
        `${context}.staleScan may be false only for machine-readable JSON configuration files.`,
      );
    }
    if (
      Object.hasOwn(document, 'requiredOnDisk') &&
      typeof document.requiredOnDisk !== 'boolean'
    ) {
      throw new Error(`${context}.requiredOnDisk must be a boolean.`);
    }
    if (
      document.requiredOnDisk === false &&
      (document.lifecycle !== 'status' ||
        !document.path.startsWith('docs/notes/'))
    ) {
      throw new Error(
        `${context}.requiredOnDisk may be false only for transient status documents under docs/notes/.`,
      );
    }
    if (documents.has(document.path)) {
      throw new Error(`documents contains duplicate path "${document.path}".`);
    }
    documents.set(document.path, document);
  }

  assertArray(config.mirrors, 'mirrors');
  const mirrorTargets = new Set();
  for (const [index, mirror] of config.mirrors.entries()) {
    const context = `mirrors[${index}]`;
    assertObject(mirror, context);
    assertKeys(mirror, ['source', 'mirror', 'relationship'], [], context);
    validateRelativePath(mirror.source, `${context}.source`);
    validateRelativePath(mirror.mirror, `${context}.mirror`);
    if (!MIRROR_RELATIONSHIPS.has(mirror.relationship)) {
      throw new Error(`${context}.relationship is invalid.`);
    }
    if (mirror.source === mirror.mirror) {
      throw new Error(`${context} cannot mirror a document to itself.`);
    }
    const source = documents.get(mirror.source);
    const target = documents.get(mirror.mirror);
    if (!source) {
      throw new Error(`${context}.source is not in the document registry.`);
    }
    if (!target) {
      throw new Error(`${context}.mirror is not in the document registry.`);
    }
    if (['generated', 'historical', 'mirror'].includes(source.lifecycle)) {
      throw new Error(`${context}.source must be an active canonical document.`);
    }
    if (target.lifecycle !== 'mirror') {
      throw new Error(`${context}.mirror must have lifecycle "mirror".`);
    }
    if (mirrorTargets.has(mirror.mirror)) {
      throw new Error(`Mirror target "${mirror.mirror}" has multiple sources.`);
    }
    mirrorTargets.add(mirror.mirror);
  }
  for (const document of documents.values()) {
    if (document.lifecycle === 'mirror' && !mirrorTargets.has(document.path)) {
      throw new Error(`Mirror document "${document.path}" has no source declaration.`);
    }
  }

  assertArray(config.generatedFiles, 'generatedFiles');
  const generatedPaths = new Set();
  for (const [index, generated] of config.generatedFiles.entries()) {
    const context = `generatedFiles[${index}]`;
    assertObject(generated, context);
    assertKeys(generated, ['path', 'source', 'checkCommand'], [], context);
    validateRelativePath(generated.path, `${context}.path`);
    validateRelativePath(generated.source, `${context}.source`);
    assertNonEmptyString(generated.checkCommand, `${context}.checkCommand`);
    if (!/^npm run [a-zA-Z0-9:_-]+$/.test(generated.checkCommand)) {
      throw new Error(`${context}.checkCommand must be one npm run script.`);
    }
    if (documents.get(generated.path)?.lifecycle !== 'generated') {
      throw new Error(`${context}.path must have lifecycle "generated".`);
    }
    const source = documents.get(generated.source);
    if (!source) {
      throw new Error(`${context}.source is not in the document registry.`);
    }
    if (['generated', 'historical', 'mirror'].includes(source.lifecycle)) {
      throw new Error(`${context}.source must be an active canonical document.`);
    }
    if (generatedPaths.has(generated.path)) {
      throw new Error(`generatedFiles contains duplicate path "${generated.path}".`);
    }
    generatedPaths.add(generated.path);
  }
  for (const document of documents.values()) {
    if (
      document.lifecycle === 'generated' &&
      !generatedPaths.has(document.path)
    ) {
      throw new Error(`Generated document "${document.path}" has no command declaration.`);
    }
  }

  assertArray(config.dependencies, 'dependencies');
  const dependencyPairs = new Set();
  const dependencyEdges = [];
  for (const [index, dependency] of config.dependencies.entries()) {
    const context = `dependencies[${index}]`;
    assertObject(dependency, context);
    assertKeys(dependency, ['document', 'dependsOn', 'reason'], [], context);
    validateRelativePath(dependency.document, `${context}.document`);
    validateRelativePath(dependency.dependsOn, `${context}.dependsOn`);
    assertNonEmptyString(dependency.reason, `${context}.reason`);
    if (!documents.has(dependency.document) || !documents.has(dependency.dependsOn)) {
      throw new Error(`${context} references a document outside the registry.`);
    }
    if (dependency.document === dependency.dependsOn) {
      throw new Error(`${context} cannot be a self-dependency.`);
    }
    const pair = `${dependency.document}\0${dependency.dependsOn}`;
    if (dependencyPairs.has(pair)) {
      throw new Error(`${context} duplicates an existing dependency.`);
    }
    dependencyPairs.add(pair);
    dependencyEdges.push([dependency.document, dependency.dependsOn]);
  }
  const documentCycle = findDependencyCycle(documents.keys(), dependencyEdges);
  if (documentCycle) {
    throw new Error(`Document dependency cycle: ${documentCycle.join(' -> ')}`);
  }

  assertObject(config.staleTerms, 'staleTerms');
  assertKeys(
    config.staleTerms,
    ['scanLifecycles', 'historicalAllowlist', 'rules'],
    [],
    'staleTerms',
  );
  assertArray(config.staleTerms.scanLifecycles, 'staleTerms.scanLifecycles', {
    nonEmpty: true,
  });
  for (const lifecycle of config.staleTerms.scanLifecycles) {
    if (!LIFECYCLES.has(lifecycle)) {
      throw new Error(`staleTerms.scanLifecycles contains invalid lifecycle "${lifecycle}".`);
    }
  }
  assertUnique(config.staleTerms.scanLifecycles, 'staleTerms.scanLifecycles');
  const scanLifecycleSet = new Set(config.staleTerms.scanLifecycles);
  for (const lifecycle of REQUIRED_STALE_SCAN_LIFECYCLES) {
    if (!scanLifecycleSet.has(lifecycle)) {
      throw new Error(
        `staleTerms.scanLifecycles must include required active lifecycle "${lifecycle}".`,
      );
    }
  }

  assertArray(
    config.staleTerms.historicalAllowlist,
    'staleTerms.historicalAllowlist',
    { nonEmpty: true },
  );
  for (const [index, glob] of config.staleTerms.historicalAllowlist.entries()) {
    assertNonEmptyString(glob, `staleTerms.historicalAllowlist[${index}]`);
    globToRegExp(glob);
  }
  assertUnique(
    config.staleTerms.historicalAllowlist,
    'staleTerms.historicalAllowlist',
  );
  for (const document of documents.values()) {
    const allowlisted = config.staleTerms.historicalAllowlist.some((glob) =>
      matchesGlob(document.path, glob),
    );
    if (document.lifecycle === 'historical' && !allowlisted) {
      throw new Error(`Historical document "${document.path}" is not allowlisted.`);
    }
    if (document.lifecycle !== 'historical' && allowlisted) {
      throw new Error(`Active document "${document.path}" is in the historical allowlist.`);
    }
    if (document.lifecycle === 'historical' && scanLifecycleSet.has('historical')) {
      throw new Error('Historical lifecycle cannot be both scanned and allowlisted.');
    }
  }

  assertArray(config.staleTerms.rules, 'staleTerms.rules', { nonEmpty: true });
  const staleRuleIds = [];
  for (const [index, rule] of config.staleTerms.rules.entries()) {
    const context = `staleTerms.rules[${index}]`;
    assertObject(rule, context);
    assertKeys(rule, ['id', 'pattern', 'flags', 'allowlist'], [], context);
    assertNonEmptyString(rule.id, `${context}.id`);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(rule.id)) {
      throw new Error(`${context}.id must be kebab-case.`);
    }
    validateRegex(rule.pattern, rule.flags, context);
    assertArray(rule.allowlist, `${context}.allowlist`);
    for (const [allowIndex, allowance] of rule.allowlist.entries()) {
      const allowContext = `${context}.allowlist[${allowIndex}]`;
      assertObject(allowance, allowContext);
      assertKeys(allowance, ['path', 'linePattern', 'flags'], [], allowContext);
      assertNonEmptyString(allowance.path, `${allowContext}.path`);
      globToRegExp(allowance.path);
      validateRegex(allowance.linePattern, allowance.flags, allowContext);
    }
    staleRuleIds.push(rule.id);
  }
  assertUnique(staleRuleIds, 'staleTerms.rules');

  assertArray(config.impactRules, 'impactRules', { nonEmpty: true });
  const impactRuleIds = [];
  for (const [index, rule] of config.impactRules.entries()) {
    const context = `impactRules[${index}]`;
    assertObject(rule, context);
    assertKeys(rule, ['id', 'changedPaths', 'requiredDocuments'], [], context);
    assertNonEmptyString(rule.id, `${context}.id`);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(rule.id)) {
      throw new Error(`${context}.id must be kebab-case.`);
    }
    assertArray(rule.changedPaths, `${context}.changedPaths`, { nonEmpty: true });
    for (const glob of rule.changedPaths) {
      globToRegExp(glob);
    }
    assertUnique(rule.changedPaths, `${context}.changedPaths`);
    assertArray(rule.requiredDocuments, `${context}.requiredDocuments`, {
      nonEmpty: true,
    });
    for (const documentPath of rule.requiredDocuments) {
      if (!documents.has(documentPath)) {
        throw new Error(`${context} references unknown document "${documentPath}".`);
      }
    }
    assertUnique(rule.requiredDocuments, `${context}.requiredDocuments`);
    impactRuleIds.push(rule.id);
  }
  assertUnique(impactRuleIds, 'impactRules');

  assertObject(config.taskGraph, 'taskGraph');
  assertKeys(
    config.taskGraph,
    [
      'document',
      'firstTask',
      'lastTask',
      'allowedExternalTasks',
      'fields',
    ],
    [],
    'taskGraph',
  );
  validateRelativePath(config.taskGraph.document, 'taskGraph.document');
  if (!documents.has(config.taskGraph.document)) {
    throw new Error('taskGraph.document must be in the document registry.');
  }
  if (config.taskGraph.document !== REQUIRED_TASK_GRAPH_DOCUMENT) {
    throw new Error(
      `taskGraph.document must be exactly "${REQUIRED_TASK_GRAPH_DOCUMENT}".`,
    );
  }
  for (const field of ['firstTask', 'lastTask']) {
    if (!Number.isSafeInteger(config.taskGraph[field]) || config.taskGraph[field] < 1) {
      throw new Error(`taskGraph.${field} must be a positive safe integer.`);
    }
  }
  if (config.taskGraph.firstTask > config.taskGraph.lastTask) {
    throw new Error('taskGraph.firstTask must not exceed taskGraph.lastTask.');
  }
  if (
    config.taskGraph.firstTask !== REQUIRED_TASK_GRAPH_FIRST ||
    config.taskGraph.lastTask !== REQUIRED_TASK_GRAPH_LAST
  ) {
    throw new Error(
      `taskGraph.firstTask and taskGraph.lastTask must be exactly ${REQUIRED_TASK_GRAPH_FIRST} and ${REQUIRED_TASK_GRAPH_LAST}.`,
    );
  }
  assertArray(config.taskGraph.allowedExternalTasks, 'taskGraph.allowedExternalTasks');
  for (const taskNumber of config.taskGraph.allowedExternalTasks) {
    if (!Number.isSafeInteger(taskNumber) || taskNumber < 1) {
      throw new Error('taskGraph.allowedExternalTasks must contain positive safe integers.');
    }
    // External prerequisites must be accepted history before the published ledger,
    // never in-range tasks or unmodeled future task numbers.
    if (taskNumber >= config.taskGraph.firstTask) {
      throw new Error(
        `taskGraph.allowedExternalTasks must be strictly before Task ${config.taskGraph.firstTask}.`,
      );
    }
  }
  assertUnique(config.taskGraph.allowedExternalTasks, 'taskGraph.allowedExternalTasks');
  if (JSON.stringify(config.taskGraph.fields) !== JSON.stringify(TASK_FIELDS)) {
    throw new Error(`taskGraph.fields must be exactly: ${TASK_FIELDS.join(', ')}.`);
  }

  return config;
}

function resolveRepoRoot(repoRoot) {
  const absolute = path.resolve(repoRoot);
  const stats = fs.lstatSync(absolute, { throwIfNoEntry: false });
  if (!stats?.isDirectory() || stats.isSymbolicLink()) {
    throw new Error(`Repository root must be a real directory: ${absolute}`);
  }
  return fs.realpathSync(absolute);
}

function resolveDeclaredPath(repoRoot, relativePath) {
  validateRelativePath(relativePath, 'Declared path');
  const absolute = path.resolve(repoRoot, relativePath);
  const relative = path.relative(repoRoot, absolute);
  if (
    path.isAbsolute(relative) ||
    relative === '..' ||
    relative.startsWith(`..${path.sep}`)
  ) {
    throw new Error(`Declared path escapes the repository: ${relativePath}`);
  }
  return absolute;
}

function assertRealPathContained(repoRoot, absolutePath, relativePath) {
  const realPath = fs.realpathSync(absolutePath);
  const relative = path.relative(repoRoot, realPath);
  if (
    path.isAbsolute(relative) ||
    relative === '..' ||
    relative.startsWith(`..${path.sep}`)
  ) {
    throw new Error(
      `Declared path resolves outside the repository: ${relativePath}`,
    );
  }
  return realPath;
}

function assertPathKind(stats, expectedKind, relativePath, context) {
  if (expectedKind === 'file' && !stats.isFile()) {
    throw new Error(`Declared ${context} must be a file: ${relativePath}`);
  }
  if (expectedKind === 'directory' && !stats.isDirectory()) {
    throw new Error(`Declared ${context} must be a directory: ${relativePath}`);
  }
}

function assertPathExists(repoRoot, relativePath, context, expectedKind = null) {
  const absolute = resolveDeclaredPath(repoRoot, relativePath);
  const stats = fs.lstatSync(absolute, { throwIfNoEntry: false });
  if (!stats) {
    throw new Error(`Missing ${context}: ${relativePath}`);
  }
  if (stats.isSymbolicLink()) {
    throw new Error(`Declared ${context} must not be a symbolic link: ${relativePath}`);
  }
  assertRealPathContained(repoRoot, absolute, relativePath);
  if (expectedKind) {
    assertPathKind(stats, expectedKind, relativePath, context);
  }
  return stats;
}

function loadConfig(configPath) {
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (error) {
    throw new Error(`Unable to read agent infrastructure JSON: ${error.message}`);
  }
  return validateConfig(parsed);
}

function validateDeclaredPaths(repoRoot, config) {
  for (const document of config.documents) {
    if (document.requiredOnDisk === false) {
      const absolute = resolveDeclaredPath(repoRoot, document.path);
      const stats = fs.lstatSync(absolute, { throwIfNoEntry: false });
      if (stats?.isSymbolicLink()) {
        throw new Error(
          `Declared optional document must not be a symbolic link: ${document.path}`,
        );
      }
      if (stats) {
        assertRealPathContained(repoRoot, absolute, document.path);
        assertPathKind(stats, document.kind, document.path, 'optional document');
      }
      continue;
    }
    assertPathExists(repoRoot, document.path, 'document', document.kind);
  }
  for (const generated of config.generatedFiles) {
    assertPathExists(repoRoot, generated.source, 'generated source');
  }
  assertPathExists(repoRoot, 'package.json', 'package manifest');
}

function validateGeneratedCommands(repoRoot, config) {
  let packageManifest;
  try {
    packageManifest = JSON.parse(
      fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'),
    );
  } catch (error) {
    throw new Error(`Unable to read package.json: ${error.message}`);
  }
  const scripts = isPlainObject(packageManifest.scripts)
    ? packageManifest.scripts
    : {};
  for (const generated of config.generatedFiles) {
    const scriptName = generated.checkCommand.slice('npm run '.length);
    if (typeof scripts[scriptName] !== 'string' || scripts[scriptName].length === 0) {
      throw new Error(
        `Generated artifact ${generated.path} references missing script "${scriptName}".`,
      );
    }
  }
}

function validateMirrorPointers(repoRoot, config) {
  for (const mirror of config.mirrors) {
    const mirrorPath = resolveDeclaredPath(repoRoot, mirror.mirror);
    const stats = fs.lstatSync(mirrorPath);
    if (!stats.isFile()) {
      throw new Error(`Mirror target must be a file: ${mirror.mirror}`);
    }
    const content = fs.readFileSync(mirrorPath, 'utf8');
    if (
      mirror.relationship === 'pointer' &&
      content.trim() !== `@${mirror.source}`
    ) {
      throw new Error(
        `Pointer mirror ${mirror.mirror} must contain exactly @${mirror.source}.`,
      );
    }
    if (mirror.relationship === 'pointer') {
      continue;
    }
    if (!content.includes(mirror.source)) {
      throw new Error(
        `Mirror ${mirror.mirror} must point to canonical source ${mirror.source}.`,
      );
    }
  }
}

function isPathAtOrUnder(relativePath, rootPath) {
  return relativePath === rootPath || relativePath.startsWith(`${rootPath}/`);
}

function collectTextFiles(repoRoot, relativePath, excludedPaths = []) {
  if (excludedPaths.some((excludedPath) => isPathAtOrUnder(relativePath, excludedPath))) {
    return [];
  }
  const absolute = resolveDeclaredPath(repoRoot, relativePath);
  const stats = fs.lstatSync(absolute, { throwIfNoEntry: false });
  if (!stats) {
    return [];
  }
  if (stats.isFile()) {
    return [relativePath];
  }
  if (!stats.isDirectory()) {
    return [];
  }

  const files = [];
  function walk(currentAbsolute, currentRelative) {
    const entries = fs
      .readdirSync(currentAbsolute, { withFileTypes: true })
      .sort((left, right) => compareCodeUnits(left.name, right.name));
    for (const entry of entries) {
      const childAbsolute = path.join(currentAbsolute, entry.name);
      const childRelative = path.posix.join(currentRelative, entry.name);
      if (
        excludedPaths.some((excludedPath) =>
          isPathAtOrUnder(childRelative, excludedPath),
        )
      ) {
        continue;
      }
      if (entry.isSymbolicLink()) {
        throw new Error(
          `Active document traversal must not include a symbolic link: ${childRelative}`,
        );
      }
      if (entry.isDirectory()) {
        walk(childAbsolute, childRelative);
      } else if (entry.isFile() && TEXT_EXTENSIONS.has(path.extname(entry.name))) {
        files.push(childRelative);
      }
    }
  }
  walk(absolute, relativePath);
  return files;
}

function lineContext(content, index) {
  const start = content.lastIndexOf('\n', Math.max(0, index - 1)) + 1;
  const nextBreak = content.indexOf('\n', index);
  const end = nextBreak === -1 ? content.length : nextBreak;
  const line = content.slice(start, end);
  const lineNumber = content.slice(0, start).split('\n').length;
  return { line, lineNumber };
}

function compileGlobalRegex(pattern, flags) {
  const globalFlags = flags.includes('g') ? flags : `${flags}g`;
  return new RegExp(pattern, globalFlags);
}

function advanceRegexIndex(content, index, unicodeMode) {
  if (index >= content.length) {
    return content.length + 1;
  }
  if (!unicodeMode) {
    return index + 1;
  }
  const codePoint = content.codePointAt(index);
  const width = codePoint !== undefined && codePoint > 0xffff ? 2 : 1;
  return Math.min(index + width, content.length + 1);
}

function checkStaleTerms(repoRoot, config) {
  const scanLifecycles = new Set(config.staleTerms.scanLifecycles);
  const historicalPaths = config.documents
    .filter((document) => document.lifecycle === 'historical')
    .map((document) => document.path);
  const files = new Set();
  for (const document of config.documents) {
    if (
      scanLifecycles.has(document.lifecycle) &&
      document.staleScan !== false
    ) {
      for (const file of collectTextFiles(
        repoRoot,
        document.path,
        historicalPaths,
      )) {
        files.add(file);
      }
    }
  }

  const findings = [];
  for (const relativePath of [...files].sort(compareCodeUnits)) {
    const content = fs.readFileSync(resolveDeclaredPath(repoRoot, relativePath), 'utf8');
    for (const rule of config.staleTerms.rules) {
      const expression = compileGlobalRegex(rule.pattern, rule.flags);
      for (const match of content.matchAll(expression)) {
        const context = lineContext(content, match.index);
        const allowed = rule.allowlist.some((allowance) => {
          if (!matchesGlob(relativePath, allowance.path)) {
            return false;
          }
          const lineExpression = new RegExp(
            allowance.linePattern,
            allowance.flags.replaceAll('g', ''),
          );
          return lineExpression.test(context.line);
        });
        if (!allowed) {
          findings.push({
            rule: rule.id,
            path: relativePath,
            line: context.lineNumber,
            match: match[0],
          });
        }
      }
    }
  }

  if (findings.length > 0) {
    const lines = findings.map(
      (finding) =>
        `${finding.path}:${finding.line}: [${finding.rule}] ${JSON.stringify(finding.match)}`,
    );
    throw new Error(`Active-document stale terms found:\n${lines.join('\n')}`);
  }
  return files.size;
}

function markdownLines(content) {
  const output = [];
  let fence = null;
  let htmlComment = false;
  const lines = content.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const rawText = lines[index];
    let text = rawText;
    let commentSyntaxSeen = false;
    const startedInComment = htmlComment;
    if (fence === null) {
      let visible = '';
      let offset = 0;
      while (offset < rawText.length) {
        if (htmlComment) {
          const end = rawText.indexOf('-->', offset);
          commentSyntaxSeen = true;
          if (end === -1) {
            offset = rawText.length;
            break;
          }
          htmlComment = false;
          offset = end + 3;
          continue;
        }
        const start = rawText.indexOf('<!--', offset);
        if (start === -1) {
          visible += rawText.slice(offset);
          break;
        }
        visible += rawText.slice(offset, start);
        commentSyntaxSeen = true;
        htmlComment = true;
        offset = start + 4;
      }
      text = visible;
    }
    const marker = text.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    let active =
      fence === null &&
      !((startedInComment || commentSyntaxSeen) && text.trim().length === 0);
    if (marker) {
      const character = marker[1][0];
      const length = marker[1].length;
      if (fence === null) {
        fence = { character, length };
        active = false;
      } else if (
        character === fence.character &&
        length >= fence.length &&
        marker[2].trim().length === 0
      ) {
        fence = null;
        active = false;
      } else {
        active = false;
      }
    } else if (fence !== null) {
      active = false;
    }
    output.push({ text, lineNumber: index + 1, active });
  }
  return output;
}

function assertCanonicalTaskNumber(text) {
  if (!CANONICAL_TASK_NUMBER.test(text)) {
    throw new Error(`Noncanonical task number "${text}".`);
  }
}

function extractTaskReferences(value) {
  const references = [];
  const recognizedNumbers = new Set();
  const expression =
    /\b(Tasks?)(\s+)(\d+\b(?:\s*[–-]\s*\d+\b)?(?:(?:\s*,\s*(?:and\s+)?|\s+and\s+)\d+\b(?:\s*[–-]\s*\d+\b)?)*)/g;
  for (const match of value.matchAll(expression)) {
    const prefix = match[1];
    const listText = match[3];
    const listOffset = match.index + match[0].indexOf(listText);
    const itemExpression = /(\d+)\b(?:\s*[–-]\s*(\d+)\b)?/g;
    const items = [...listText.matchAll(itemExpression)];
    const isMulti =
      items.length > 1 || items.some((item) => item[2] !== undefined);
    if (prefix === 'Task' && isMulti) {
      throw new Error(
        `Singular "Task" cannot introduce a range or list in "${match[0]}".`,
      );
    }
    if (prefix === 'Tasks' && !isMulti) {
      throw new Error(
        `Plural "Tasks" requires a range or list in "${match[0]}".`,
      );
    }
    for (const item of items) {
      assertCanonicalTaskNumber(item[1]);
      if (item[2]) {
        assertCanonicalTaskNumber(item[2]);
      }
      const first = Number(item[1]);
      const last = item[2] ? Number(item[2]) : first;
      recognizedNumbers.add(listOffset + item.index);
      if (item[2]) {
        recognizedNumbers.add(
          listOffset + item.index + item[0].lastIndexOf(item[2]),
        );
      }
      if (
        !Number.isSafeInteger(first) ||
        !Number.isSafeInteger(last) ||
        first < 1 ||
        last < first ||
        last - first > 100
      ) {
        throw new Error(`Invalid task reference range "${item[0]}".`);
      }
      for (let task = first; task <= last; task += 1) {
        references.push(task);
      }
    }
  }

  for (const numericMatch of value.matchAll(/\b\d+\b/g)) {
    if (!recognizedNumbers.has(numericMatch.index)) {
      throw new Error(
        `Unrecognized task-number syntax near "${numericMatch[0]}" in "${value}".`,
      );
    }
  }
  return [...new Set(references)];
}

function machineParsedRegionBounds(lines, inRange, activeLevelTwoLineIndexes) {
  const firstTaskLineIndex = inRange[0].lineIndex;
  const lastHeading = inRange[inRange.length - 1];
  const nextLevelTwo = activeLevelTwoLineIndexes.find(
    (lineIndex) => lineIndex > lastHeading.lineIndex,
  );
  const regionEnd =
    nextLevelTwo === undefined ? lines.length : nextLevelTwo;

  let regionStart = firstTaskLineIndex;
  for (const line of lines) {
    if (!line.active) {
      continue;
    }
    if (REVISED_SEQUENCE_HEADING.test(line.text)) {
      regionStart = Math.min(regionStart, line.lineNumber - 1);
      break;
    }
    if (line.lineNumber - 1 >= firstTaskLineIndex) {
      break;
    }
  }

  let crossedBlank = false;
  for (let index = regionStart - 1; index >= 0; index -= 1) {
    const line = lines[index];
    if (!line.active) {
      continue;
    }
    if (line.text.trim().length === 0) {
      crossedBlank = true;
      continue;
    }
    if (RAW_HTML_BLOCK_OPENER.test(line.text)) {
      if (crossedBlank && !RAW_HTML_CONTAINER_OPENER.test(line.text)) {
        // div/table HTML blocks end at a blank line; containers do not.
        break;
      }
      regionStart = index;
      crossedBlank = false;
      continue;
    }
    break;
  }

  return { regionStart, regionEnd };
}

function assertNoRawHtmlInMachineTaskRegion(lines, regionStart, regionEnd) {
  for (let index = regionStart; index < regionEnd; index += 1) {
    const line = lines[index];
    if (!line.active) {
      continue;
    }
    if (RAW_HTML_BLOCK_OPENER.test(line.text)) {
      throw new Error(
        `Task graph machine-parsed region forbids raw HTML block syntax at line ${line.lineNumber}.`,
      );
    }
  }
}

function parseTaskGraph(content, taskConfig) {
  const lines = markdownLines(content);
  const headings = [];
  const activeLevelTwoLineIndexes = [];
  for (const line of lines) {
    if (!line.active) {
      continue;
    }
    if (ACTIVE_LEVEL_TWO_HEADING.test(line.text)) {
      activeLevelTwoLineIndexes.push(line.lineNumber - 1);
    }
    const match = line.text.match(TASK_HEADING);
    if (match) {
      headings.push({
        number: Number(match[1]),
        title: match[2],
        lineIndex: line.lineNumber - 1,
        lineNumber: line.lineNumber,
      });
    }
  }

  const expected = [];
  for (let task = taskConfig.firstTask; task <= taskConfig.lastTask; task += 1) {
    expected.push(task);
  }
  const inRange = headings.filter(
    ({ number }) => number >= taskConfig.firstTask && number <= taskConfig.lastTask,
  );
  const actual = inRange.map(({ number }) => number);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Task graph requires exactly Task ${taskConfig.firstTask} through Task ${taskConfig.lastTask} in order; found ${actual.join(', ') || 'none'}.`,
    );
  }

  const knownTasks = new Set([...expected, ...taskConfig.allowedExternalTasks]);
  const records = new Map();
  const dependencyEdges = [];
  const allDependencyEdges = [];
  const { regionStart, regionEnd } = machineParsedRegionBounds(
    lines,
    inRange,
    activeLevelTwoLineIndexes,
  );
  assertNoRawHtmlInMachineTaskRegion(lines, regionStart, regionEnd);

  for (const heading of inRange) {
    const nextLevelTwo = activeLevelTwoLineIndexes.find(
      (lineIndex) => lineIndex > heading.lineIndex,
    );
    const sectionEnd =
      nextLevelTwo === undefined ? lines.length : nextLevelTwo;
    const section = lines.slice(heading.lineIndex + 1, sectionEnd);
    const goalLine = section.findIndex(
      (line) => line.active && /^Goal:\s*/.test(line.text),
    );
    if (goalLine === -1) {
      throw new Error(`Task ${heading.number} is missing Goal metadata boundary.`);
    }

    const fields = {};
    for (const field of taskConfig.fields) {
      const prefix = `${field}:`;
      const matches = section
        .map((line, index) => ({ line, index }))
        .filter(
          ({ line }) =>
            line.active &&
            (line.text === prefix || line.text.startsWith(`${prefix} `)),
        );
      if (matches.length !== 1) {
        throw new Error(
          `Task ${heading.number} must contain exactly one "${field}:" field; found ${matches.length}.`,
        );
      }
      const [{ line, index }] = matches;
      if (index >= goalLine) {
        throw new Error(`Task ${heading.number} field "${field}" must appear before Goal.`);
      }
      const valueParts = [line.text.slice(prefix.length).trim()];
      for (let continuation = index + 1; continuation < goalLine; continuation += 1) {
        const nextLine = section[continuation];
        if (!nextLine.active) {
          continue;
        }
        if (nextLine.text.trim().length === 0) {
          break;
        }
        if (
          taskConfig.fields.some(
            (candidate) =>
              nextLine.text === `${candidate}:` ||
              nextLine.text.startsWith(`${candidate}: `),
          ) ||
          /^Goal:\s*/.test(nextLine.text)
        ) {
          break;
        }
        valueParts.push(nextLine.text.trim());
      }
      const value = valueParts.join(' ').trim();
      if (value.length === 0) {
        throw new Error(`Task ${heading.number} field "${field}" must not be empty.`);
      }
      fields[field] = value;
    }

    const executionOwner = fields['Execution owner'];
    const recognizedExecutionOwner =
      executionOwner === 'Parent.' ||
      executionOwner.startsWith('Parent;') ||
      executionOwner.startsWith('Parent —') ||
      executionOwner.startsWith('Parent may ') ||
      executionOwner.startsWith('Parent coordinates ') ||
      executionOwner.startsWith('Parent prepares ') ||
      executionOwner.startsWith('Parent maintains ') ||
      executionOwner.startsWith('Parent scopes ') ||
      executionOwner.startsWith('Generic implementer ') ||
      executionOwner.startsWith('The Eazy Review Lab workstream ');
    if (!recognizedExecutionOwner) {
      throw new Error(
        `Task ${heading.number} has unrecognized Execution owner metadata.`,
      );
    }
    if (
      heading.number >= 16 &&
      heading.number <= 19 &&
      executionOwner !== PROTECTED_TASK_EXECUTION_OWNER
    ) {
      throw new Error(
        `Task ${heading.number} is protected and must have Parent — verified strong as its Execution owner.`,
      );
    }
    if (
      heading.number === 19 &&
      fields['Human gate'] !== TASK_19_HUMAN_GATE
    ) {
      throw new Error(
        'Task 19 Human gate must keep actual account deletion human-only on every environment.',
      );
    }

    const referencesByField = new Map();
    for (const field of ['Depends on', 'Unlocks', 'Parallel-safe with']) {
      const value = fields[field];
      const references = extractTaskReferences(value);
      referencesByField.set(field, references);
      const isNone = /^None\.?$/i.test(value);
      const containsNoneToken = /\bNone\b/i.test(value);
      if (references.length === 0 && !isNone) {
        throw new Error(
          `Task ${heading.number} field "${field}" must contain task references or exactly "None".`,
        );
      }
      if (references.length > 0 && containsNoneToken) {
        throw new Error(`Task ${heading.number} field "${field}" mixes None with references.`);
      }
      for (const reference of references) {
        if (!knownTasks.has(reference)) {
          throw new Error(
            `Task ${heading.number} field "${field}" references unknown Task ${reference}.`,
          );
        }
      }
      if (field === 'Depends on') {
        for (const reference of references) {
          if (reference === heading.number) {
            throw new Error(`Task ${heading.number} depends on itself.`);
          }
          if (
            reference >= taskConfig.firstTask &&
            reference <= taskConfig.lastTask &&
            reference > heading.number
          ) {
            throw new Error(
              `Task ${heading.number} cannot depend on later in-range Task ${reference}.`,
            );
          }
          allDependencyEdges.push([heading.number, reference]);
          if (reference >= taskConfig.firstTask && reference <= taskConfig.lastTask) {
            dependencyEdges.push([heading.number, reference]);
          }
        }
      }
    }

    const directDependencies = new Set(referencesByField.get('Depends on'));
    for (const reference of referencesByField.get('Parallel-safe with')) {
      if (reference === heading.number) {
        throw new Error(`Task ${heading.number} is parallel-safe with itself.`);
      }
      if (
        reference < taskConfig.firstTask ||
        reference > taskConfig.lastTask
      ) {
        throw new Error(
          `Task ${heading.number} Parallel-safe with must name an in-range Task ${taskConfig.firstTask}–${taskConfig.lastTask}; found Task ${reference}.`,
        );
      }
      if (directDependencies.has(reference)) {
        throw new Error(
          `Task ${heading.number} cannot be parallel-safe with direct dependency Task ${reference}.`,
        );
      }
    }

    records.set(heading.number, {
      number: heading.number,
      title: heading.title,
      fields,
    });
  }

  const taskCycle = findDependencyCycle(expected, dependencyEdges);
  if (taskCycle) {
    throw new Error(`Task dependency cycle: ${taskCycle.join(' -> ')}`);
  }

  const dependencyGraph = new Map(
    [...knownTasks].map((task) => [task, []]),
  );
  for (const [task, dependency] of allDependencyEdges) {
    dependencyGraph.get(task).push(dependency);
  }
  function dependsOnTransitively(task, possibleDependency) {
    const pending = [...(dependencyGraph.get(task) ?? [])];
    const visited = new Set();
    while (pending.length > 0) {
      const dependency = pending.pop();
      if (dependency === possibleDependency) {
        return true;
      }
      if (visited.has(dependency)) {
        continue;
      }
      visited.add(dependency);
      pending.push(...(dependencyGraph.get(dependency) ?? []));
    }
    return false;
  }
  for (const record of records.values()) {
    for (const reference of extractTaskReferences(record.fields.Unlocks)) {
      if (!dependsOnTransitively(reference, record.number)) {
        throw new Error(
          `Task ${record.number} cannot unlock Task ${reference} because Task ${reference} does not depend on it.`,
        );
      }
    }

    const parallelReferences = extractTaskReferences(
      record.fields['Parallel-safe with'],
    );
    for (const reference of parallelReferences) {
      if (
        dependsOnTransitively(record.number, reference) ||
        dependsOnTransitively(reference, record.number)
      ) {
        throw new Error(
          `Task ${record.number} cannot be parallel-safe with prerequisite-related Task ${reference}.`,
        );
      }
      const peer = records.get(reference);
      if (
        peer &&
        !extractTaskReferences(peer.fields['Parallel-safe with']).includes(record.number)
      ) {
        throw new Error(
          `Task ${record.number} and Task ${reference} must declare their parallel-safe relationship reciprocally.`,
        );
      }
    }
  }

  const sequenceRows = parseRevisedSequence(lines, taskConfig);
  const expectedSequence = expected.map(String);
  const actualSequence = sequenceRows.map((row) => String(row.number));
  if (JSON.stringify(actualSequence) !== JSON.stringify(expectedSequence)) {
    throw new Error(
      `Revised Sequence must list Task ${taskConfig.firstTask} through Task ${taskConfig.lastTask} in order; found ${actualSequence.join(', ') || 'none'}.`,
    );
  }
  for (const row of sequenceRows) {
    const record = records.get(row.number);
    if (record.title !== row.title) {
      throw new Error(
        `Task ${row.number} Revised Sequence title "${row.title}" does not match task heading "${record.title}".`,
      );
    }
    if (!statusMatchesSequence(record.fields.Status, row.status)) {
      throw new Error(
        `Task ${row.number} Revised Sequence status "${row.status}" does not match Status metadata "${record.fields.Status}".`,
      );
    }
  }

  return { records, dependencyEdges };
}

function normalizeStatusText(value) {
  return value.replace(/\*\*/g, '').replace(/\.$/, '').trim();
}

function statusMatchesSequence(fieldStatus, tableStatus) {
  const field = normalizeStatusText(fieldStatus);
  const table = normalizeStatusText(tableStatus);
  return (
    field === table ||
    field.startsWith(`${table} `) ||
    field.startsWith(`${table}—`) ||
    field.startsWith(`${table} —`) ||
    field.startsWith(`${table};`)
  );
}

function parseRevisedSequence(lines, taskConfig) {
  let revisedSequenceCount = 0;
  for (const line of lines) {
    if (line.active && REVISED_SEQUENCE_HEADING.test(line.text)) {
      revisedSequenceCount += 1;
    }
  }
  if (revisedSequenceCount === 0) {
    throw new Error('Task graph is missing a Revised Sequence heading.');
  }
  if (revisedSequenceCount !== 1) {
    throw new Error(
      'Task graph must contain exactly one Revised Sequence heading.',
    );
  }

  let inSequence = false;
  let sawHeader = false;
  let sawDelimiter = false;
  let tableEnded = false;
  const rows = [];
  for (const line of lines) {
    if (!line.active) {
      continue;
    }
    if (ACTIVE_LEVEL_TWO_HEADING.test(line.text)) {
      if (REVISED_SEQUENCE_HEADING.test(line.text)) {
        inSequence = true;
        continue;
      }
      if (inSequence) {
        break;
      }
    }
    if (!inSequence) {
      continue;
    }
    if (!sawHeader) {
      if (!REVISED_SEQUENCE_HEADER.test(line.text)) {
        continue;
      }
      sawHeader = true;
      continue;
    }
    if (!sawDelimiter) {
      if (!REVISED_SEQUENCE_DELIMITER.test(line.text)) {
        throw new Error(
          'Revised Sequence table is missing the required delimiter row.',
        );
      }
      sawDelimiter = true;
      continue;
    }
    const match = line.text.match(/^\|\s*([1-9]\d*)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*$/);
    if (!match) {
      if (rows.length === 0) {
        throw new Error(
          'Revised Sequence table data must begin immediately after the delimiter.',
        );
      }
      tableEnded = true;
      continue;
    }
    if (tableEnded) {
      throw new Error(
        'Revised Sequence table data must remain contiguous after the delimiter.',
      );
    }
    const number = Number(match[1]);
    if (number < taskConfig.firstTask || number > taskConfig.lastTask) {
      throw new Error(
        `Revised Sequence includes out-of-range Task ${number}.`,
      );
    }
    rows.push({
      number,
      title: match[2].trim(),
      status: match[3].trim(),
    });
  }
  if (!sawHeader || !sawDelimiter || rows.length === 0) {
    throw new Error('Task graph is missing a Revised Sequence table.');
  }
  return rows;
}

function validateTaskGraph(repoRoot, config) {
  const taskPath = resolveDeclaredPath(repoRoot, config.taskGraph.document);
  const content = fs.readFileSync(taskPath, 'utf8');
  return parseTaskGraph(content, config.taskGraph);
}

function normalizeChangedPath(repoRoot, changedPath) {
  assertNonEmptyString(changedPath, 'Changed path');
  const normalizedInput = changedPath.replaceAll('\\', '/');
  if (!path.isAbsolute(changedPath)) {
    return validateRelativePath(normalizedInput.replace(/^\.\//, ''), 'Changed path');
  }
  const absolute = path.resolve(changedPath);
  const relative = path.relative(repoRoot, absolute);
  if (
    path.isAbsolute(relative) ||
    relative === '..' ||
    relative.startsWith(`..${path.sep}`)
  ) {
    throw new Error(`Changed path is outside the repository: ${changedPath}`);
  }
  return relative.split(path.sep).join('/');
}

function reportImpactedDocuments(config, changedPaths, repoRoot = process.cwd()) {
  const root = path.resolve(repoRoot);
  const normalized = changedPaths.map((changedPath) =>
    normalizeChangedPath(root, changedPath),
  );
  const impacted = new Set();

  for (const changedPath of normalized) {
    for (const document of config.documents) {
      if (
        changedPath === document.path ||
        changedPath.startsWith(`${document.path}/`)
      ) {
        impacted.add(document.path);
      }
    }
    for (const rule of config.impactRules) {
      if (rule.changedPaths.some((glob) => matchesGlob(changedPath, glob))) {
        for (const required of rule.requiredDocuments) {
          impacted.add(required);
        }
      }
    }
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const dependency of config.dependencies) {
      if (
        impacted.has(dependency.dependsOn) &&
        !impacted.has(dependency.document)
      ) {
        impacted.add(dependency.document);
        changed = true;
      }
    }
    for (const mirror of config.mirrors) {
      if (impacted.has(mirror.source) && !impacted.has(mirror.mirror)) {
        impacted.add(mirror.mirror);
        changed = true;
      }
      if (impacted.has(mirror.mirror) && !impacted.has(mirror.source)) {
        impacted.add(mirror.source);
        changed = true;
      }
    }
    for (const generated of config.generatedFiles) {
      const sourceChanged = normalized.some(
        (changedPath) =>
          changedPath === generated.source ||
          changedPath.startsWith(`${generated.source}/`),
      );
      const outputChanged = normalized.some(
        (changedPath) =>
          changedPath === generated.path ||
          changedPath.startsWith(`${generated.path}/`),
      );
      if ((sourceChanged || impacted.has(generated.source)) && !impacted.has(generated.path)) {
        impacted.add(generated.path);
        changed = true;
      }
      if ((outputChanged || impacted.has(generated.path)) && !impacted.has(generated.source)) {
        impacted.add(generated.source);
        changed = true;
      }
    }
  }

  return {
    changedPaths: normalized.sort(compareCodeUnits),
    documents: [...impacted].sort(compareCodeUnits),
  };
}

function formatImpactReport(report) {
  const lines = ['Agent infrastructure impact report', '', 'Changed paths:'];
  for (const changedPath of report.changedPaths) {
    lines.push(`- ${changedPath}`);
  }
  lines.push('', 'Required document review:');
  if (report.documents.length === 0) {
    lines.push('- None matched. Apply human judgment from docs/DOCUMENTATION_POLICY.md.');
  } else {
    for (const document of report.documents) {
      lines.push(`- ${document}`);
    }
  }
  return `${lines.join('\n')}\n`;
}

function runCheck({ repoRoot, config }) {
  const resolvedRoot = resolveRepoRoot(repoRoot);
  validateConfig(config);
  validateDeclaredPaths(resolvedRoot, config);
  validateGeneratedCommands(resolvedRoot, config);
  validateMirrorPointers(resolvedRoot, config);
  const scannedFiles = checkStaleTerms(resolvedRoot, config);
  const taskGraph = validateTaskGraph(resolvedRoot, config);
  return {
    documents: config.documents.length,
    dependencies: config.dependencies.length,
    scannedFiles,
    tasks: taskGraph.records.size,
  };
}

function parseArguments(argv) {
  let repoRoot = path.resolve(__dirname, '..');
  let configPath = null;
  let reportPaths = null;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--root' && argv[index + 1]) {
      repoRoot = path.resolve(argv[index + 1]);
      index += 1;
    } else if (argument === '--config' && argv[index + 1]) {
      configPath = path.resolve(argv[index + 1]);
      index += 1;
    } else if (argument === '--report') {
      reportPaths = argv.slice(index + 1);
      break;
    } else if (argument === '--help') {
      return { help: true };
    } else {
      throw new Error(`Unknown or incomplete argument: ${argument}`);
    }
  }

  if (reportPaths !== null && reportPaths.length === 0) {
    throw new Error('--report requires at least one changed path.');
  }
  return {
    help: false,
    repoRoot,
    configPath: configPath ?? path.join(repoRoot, 'config', 'agent-infrastructure.json'),
    reportPaths,
  };
}

function main(argv = process.argv.slice(2)) {
  const options = parseArguments(argv);
  if (options.help) {
    process.stdout.write(
      'Usage: node scripts/check-agent-infrastructure.cjs [--root PATH] [--config PATH] [--report CHANGED_PATH ...]\n',
    );
    return 0;
  }
  const config = loadConfig(options.configPath);
  if (options.reportPaths) {
    const repoRoot = resolveRepoRoot(options.repoRoot);
    process.stdout.write(
      formatImpactReport(
        reportImpactedDocuments(config, options.reportPaths, repoRoot),
      ),
    );
  } else {
    const summary = runCheck({ repoRoot: options.repoRoot, config });
    process.stdout.write(
      `check:agent-infra — valid (${summary.documents} documents, ${summary.dependencies} dependencies, ${summary.tasks} tasks, ${summary.scannedFiles} active files scanned)\n`,
    );
  }
  return 0;
}

if (require.main === module) {
  try {
    process.exitCode = main();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  advanceRegexIndex,
  checkStaleTerms,
  extractTaskReferences,
  findDependencyCycle,
  formatImpactReport,
  globToRegExp,
  loadConfig,
  main,
  parseTaskGraph,
  reportImpactedDocuments,
  runCheck,
  validateConfig,
};
