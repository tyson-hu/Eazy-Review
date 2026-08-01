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
  if (typeof flags !== 'string' || /[^dgimsuvy]/.test(flags)) {
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
  if (glob.includes('\\') || path.posix.isAbsolute(glob)) {
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
    assertKeys(document, ['path', 'lifecycle', 'owner'], ['staleScan'], context);
    validateRelativePath(document.path, `${context}.path`);
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
  for (const field of ['firstTask', 'lastTask']) {
    if (!Number.isSafeInteger(config.taskGraph[field]) || config.taskGraph[field] < 1) {
      throw new Error(`taskGraph.${field} must be a positive safe integer.`);
    }
  }
  if (config.taskGraph.firstTask > config.taskGraph.lastTask) {
    throw new Error('taskGraph.firstTask must not exceed taskGraph.lastTask.');
  }
  assertArray(config.taskGraph.allowedExternalTasks, 'taskGraph.allowedExternalTasks');
  for (const taskNumber of config.taskGraph.allowedExternalTasks) {
    if (!Number.isSafeInteger(taskNumber) || taskNumber < 1) {
      throw new Error('taskGraph.allowedExternalTasks must contain positive safe integers.');
    }
    if (
      taskNumber >= config.taskGraph.firstTask &&
      taskNumber <= config.taskGraph.lastTask
    ) {
      throw new Error('taskGraph.allowedExternalTasks must stay outside the parsed range.');
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

function assertPathExists(repoRoot, relativePath, context) {
  const absolute = resolveDeclaredPath(repoRoot, relativePath);
  const stats = fs.lstatSync(absolute, { throwIfNoEntry: false });
  if (!stats) {
    throw new Error(`Missing ${context}: ${relativePath}`);
  }
  if (stats.isSymbolicLink()) {
    throw new Error(`Declared ${context} must not be a symbolic link: ${relativePath}`);
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
    assertPathExists(repoRoot, document.path, 'document');
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
    if (!content.includes(mirror.source)) {
      throw new Error(
        `Mirror ${mirror.mirror} must point to canonical source ${mirror.source}.`,
      );
    }
  }
}

function collectTextFiles(repoRoot, relativePath) {
  const absolute = resolveDeclaredPath(repoRoot, relativePath);
  const stats = fs.lstatSync(absolute);
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
      if (entry.isSymbolicLink()) {
        continue;
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

function checkStaleTerms(repoRoot, config) {
  const scanLifecycles = new Set(config.staleTerms.scanLifecycles);
  const files = new Set();
  for (const document of config.documents) {
    if (
      scanLifecycles.has(document.lifecycle) &&
      document.staleScan !== false
    ) {
      for (const file of collectTextFiles(repoRoot, document.path)) {
        files.add(file);
      }
    }
  }

  const findings = [];
  for (const relativePath of [...files].sort(compareCodeUnits)) {
    const content = fs.readFileSync(resolveDeclaredPath(repoRoot, relativePath), 'utf8');
    for (const rule of config.staleTerms.rules) {
      const expression = compileGlobalRegex(rule.pattern, rule.flags);
      let match;
      while ((match = expression.exec(content)) !== null) {
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
        if (match[0].length === 0) {
          expression.lastIndex += 1;
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
  const lines = content.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const text = lines[index];
    const marker = text.trimStart().match(/^(`{3,}|~{3,})/);
    let active = fence === null;
    if (marker) {
      const character = marker[1][0];
      const length = marker[1].length;
      if (fence === null) {
        fence = { character, length };
        active = false;
      } else if (character === fence.character && length >= fence.length) {
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

function extractTaskReferences(value) {
  const references = [];
  const recognizedNumbers = new Set();
  const expression =
    /\bTasks?\s+(\d+\b(?:\s*[–-]\s*\d+\b)?(?:(?:\s*,\s*(?:and\s+)?|\s+and\s+)\d+\b(?:\s*[–-]\s*\d+\b)?)*)/g;
  let match;
  while ((match = expression.exec(value)) !== null) {
    const listOffset = match.index + match[0].indexOf(match[1]);
    const itemExpression = /(\d+)\b(?:\s*[–-]\s*(\d+)\b)?/g;
    let item;
    while ((item = itemExpression.exec(match[1])) !== null) {
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

  const numericExpression = /\b\d+\b/g;
  let numericMatch;
  while ((numericMatch = numericExpression.exec(value)) !== null) {
    if (!recognizedNumbers.has(numericMatch.index)) {
      throw new Error(
        `Unrecognized task-number syntax near "${numericMatch[0]}" in "${value}".`,
      );
    }
  }
  return [...new Set(references)];
}

function parseTaskGraph(content, taskConfig) {
  const lines = markdownLines(content);
  const headings = [];
  for (const line of lines) {
    if (!line.active) {
      continue;
    }
    const match = line.text.match(/^## Task (\d+):\s+(.+?)\s*$/);
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

  for (const [headingIndex, heading] of inRange.entries()) {
    const nextHeading = inRange[headingIndex + 1];
    const sectionEnd = nextHeading ? nextHeading.lineIndex : lines.length;
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

    for (const field of ['Depends on', 'Unlocks', 'Parallel-safe with']) {
      const value = fields[field];
      const references = extractTaskReferences(value);
      const isNone = /^None\.?$/i.test(value);
      if (references.length === 0 && !isNone) {
        throw new Error(
          `Task ${heading.number} field "${field}" must contain task references or exactly "None".`,
        );
      }
      if (references.length > 0 && isNone) {
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
          if (reference >= taskConfig.firstTask && reference <= taskConfig.lastTask) {
            dependencyEdges.push([heading.number, reference]);
          }
        }
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

  return { records, dependencyEdges };
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
      if ((sourceChanged || impacted.has(generated.source)) && !impacted.has(generated.path)) {
        impacted.add(generated.path);
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
