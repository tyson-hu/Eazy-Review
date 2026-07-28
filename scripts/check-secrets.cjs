#!/usr/bin/env node

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

// Built in parts so this source file never contains the contiguous deliberate
// token literal (planting that full string elsewhere must still fail the scan).
const TEST_TOKEN = [
  'EAZY',
  'REVIEW',
  'SECRET',
  'SCAN',
  'TEST',
  'TOKEN',
].join('_');

const SKIP_DIR_NAMES = new Set([
  '.git',
  'node_modules',
  '.expo',
  'dist',
  'web-build',
  'coverage',
  'ios',
  'android',
  '.kotlin',
  '.idea',
]);

const SKIP_BASENAMES = new Set([
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  '.DS_Store',
]);

const TEXT_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.cjs',
  '.mjs',
  '.json',
  '.md',
  '.yml',
  '.yaml',
  '.toml',
  '.sql',
  '.txt',
  '.css',
  '.html',
  '.svg',
  '.sh',
  '.env',
  '.example',
  '.gitignore',
  '.npmrc',
  '.editorconfig',
]);

const ROOT_CONFIG_BASENAMES = new Set([
  'package.json',
  'app.json',
  'tsconfig.json',
  'babel.config.js',
  'metro.config.js',
  'tailwind.config.js',
  'eslint.config.js',
  'nativewind-env.d.ts',
  '.env.example',
  '.gitignore',
  '.npmrc',
  '.editorconfig',
  'AGENTS.md',
  'CLAUDE.md',
  'README.md',
]);

const SCAN_PREFIXES = [
  'app/',
  'src/',
  'docs/',
  'supabase/',
  'scripts/',
  '.github/',
  'skills/',
  '.cursor/',
  '.agents/',
  '.claude/',
];

/** JWT-shaped token (three base64url segments). */
const JWT_LIKE =
  /\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;

/**
 * Modern elevated Supabase key:
 * sb_secret_<22 base64url characters>_<8 base64url checksum characters>.
 * Custom boundaries avoid accepting a valid-looking substring inside a longer
 * token while still allowing `-` as the final checksum character.
 */
const SUPABASE_SECRET_KEY =
  /(?<![A-Za-z0-9_-])sb_secret_[A-Za-z0-9_-]{22}_[A-Za-z0-9_-]{8}(?![A-Za-z0-9_-])/g;

/**
 * High-risk assignment forms only — prose mentions of `service_role` are fine.
 * Requires a non-empty secret-like value after `=` / `:` (quoted any non-empty,
 * or unquoted length >= 8). Bare `KEY=` / `KEY=` docs punctuation is ignored.
 */
const SERVICE_ROLE_ASSIGNMENT =
  /(?:SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE_KEY|service_role_key)\s*[=:]\s*(?:"([^"\n]+)"|'([^'\n]+)'|([A-Za-z0-9._\-+/=]{8,}))/gi;

/**
 * JSON/YAML-ish `service_role: <secret-looking value>` (JWT or long token).
 * Skips bare role names used in SQL GRANT lists when the value is a short identifier.
 */
const SERVICE_ROLE_SECRET_VALUE =
  /(?:["']?service_role["']?\s*:\s*)(?:"(eyJ[^"\n]+)"|'(eyJ[^'\n]+)'|(eyJ[A-Za-z0-9._\-]+))/gi;

function isBinaryBuffer(buffer) {
  const sample = buffer.subarray(0, Math.min(buffer.length, 8000));
  return sample.includes(0);
}

function decodeBase64Url(segment) {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (padded.length % 4)) % 4;
  try {
    return Buffer.from(padded + '='.repeat(padLength), 'base64').toString(
      'utf8',
    );
  } catch {
    return null;
  }
}

function jwtPayloadHasServiceRole(jwt) {
  const parts = jwt.split('.');
  if (parts.length !== 3) {
    return false;
  }
  const payload = decodeBase64Url(parts[1]);
  if (!payload) {
    return false;
  }
  return (
    /"role"\s*:\s*"service_role"/.test(payload) ||
    /'role'\s*:\s*'service_role'/.test(payload)
  );
}

function redactValue(value) {
  const trimmed = String(value);
  if (trimmed.length === 0) {
    return '(empty)';
  }
  if (trimmed.length <= 6) {
    return `*** (len=${trimmed.length})`;
  }
  return `${trimmed.slice(0, 3)}…${trimmed.slice(-2)} (len=${trimmed.length})`;
}

function lineNumberAt(content, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (content.charCodeAt(i) === 10) {
      line += 1;
    }
  }
  return line;
}

/**
 * @typedef {{ pattern: string, file: string, line: number, redacted: string }} Finding
 */

/**
 * Scan a single file's text content. Does not print findings.
 * @param {string} relativePath
 * @param {string} content
 * @returns {Finding[]}
 */
function scanContent(relativePath, content) {
  /** @type {Finding[]} */
  const findings = [];

  function push(pattern, index, raw) {
    findings.push({
      pattern,
      file: relativePath,
      line: lineNumberAt(content, index),
      redacted: redactValue(raw),
    });
  }

  let match;

  const testToken = new RegExp(TEST_TOKEN, 'g');
  while ((match = testToken.exec(content)) !== null) {
    push('deliberate-test-token', match.index, match[0]);
  }

  SUPABASE_SECRET_KEY.lastIndex = 0;
  while ((match = SUPABASE_SECRET_KEY.exec(content)) !== null) {
    push('supabase-secret-key', match.index, match[0]);
  }

  SERVICE_ROLE_ASSIGNMENT.lastIndex = 0;
  while ((match = SERVICE_ROLE_ASSIGNMENT.exec(content)) !== null) {
    const raw = match[1] ?? match[2] ?? match[3] ?? '';
    if (!raw || raw === '""' || raw === "''") {
      continue;
    }
    push('service-role-key-assignment', match.index, raw);
  }

  SERVICE_ROLE_SECRET_VALUE.lastIndex = 0;
  while ((match = SERVICE_ROLE_SECRET_VALUE.exec(content)) !== null) {
    const raw = match[1] ?? match[2] ?? match[3] ?? '';
    if (!raw) {
      continue;
    }
    push('service-role-secret-value', match.index, raw);
  }

  JWT_LIKE.lastIndex = 0;
  while ((match = JWT_LIKE.exec(content)) !== null) {
    if (jwtPayloadHasServiceRole(match[0])) {
      push('jwt-service-role-claim', match.index, match[0]);
    }
  }

  return findings;
}

function pathHasSkippedDir(relativePath) {
  const parts = relativePath.split(/[/\\]/);
  return parts.some((part) => SKIP_DIR_NAMES.has(part));
}

function hasScannableExtension(relativePath) {
  const base = path.basename(relativePath);
  if (base === '.env.example' || base.startsWith('.env')) {
    return true;
  }
  const ext = path.extname(base);
  if (TEXT_EXTENSIONS.has(ext)) {
    return true;
  }
  // Extensionless root configs (rare)
  return ROOT_CONFIG_BASENAMES.has(base) && !ext;
}

/** Root `.env` / `.env.*` (including `.env.example`) — scanned even when gitignored. */
function isRootEnvFile(relativePath) {
  const normalized = relativePath.replace(/\\/g, '/');
  if (!normalized || normalized.includes('/')) {
    return false;
  }
  return normalized === '.env' || normalized.startsWith('.env.');
}

/**
 * Whether a repo-relative path is in the documented scan allowlist.
 * @param {string} relativePath
 */
function shouldScanPath(relativePath) {
  const normalized = relativePath.replace(/\\/g, '/');
  if (!normalized || normalized === '.') {
    return false;
  }
  if (pathHasSkippedDir(normalized)) {
    return false;
  }
  const base = path.basename(normalized);
  if (SKIP_BASENAMES.has(base)) {
    return false;
  }

  // Always allow root env files (gitignored local leaks / force-adds).
  if (isRootEnvFile(normalized)) {
    return true;
  }

  if (!hasScannableExtension(normalized)) {
    return false;
  }

  if (SCAN_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    return true;
  }

  // Any root-level textual file, including dynamic Expo/EAS configuration.
  if (!normalized.includes('/')) {
    return true;
  }

  return false;
}

/**
 * Recognized root text files present on disk (may be gitignored).
 * @param {string} root
 * @returns {string[]}
 */
function listRootScannableFilesOnDisk(root) {
  let entries;
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((entry) => entry.isFile() && shouldScanPath(entry.name))
    .map((entry) => entry.name);
}

/**
 * List tracked/untracked allowlisted files, plus every recognized root text
 * file on disk even when gitignored.
 * @param {string} root
 * @returns {string[]} relative paths
 */
function listCandidateFiles(root) {
  /** @type {Set<string>} */
  const candidates = new Set();

  const git = spawnSync(
    'git',
    ['-C', root, 'ls-files', '-z', '--cached', '--others', '--exclude-standard'],
    { encoding: 'buffer', maxBuffer: 32 * 1024 * 1024 },
  );

  if (git.status === 0 && git.stdout && git.stdout.length > 0) {
    const raw = git.stdout;
    let start = 0;
    for (let i = 0; i < raw.length; i += 1) {
      if (raw[i] === 0) {
        const slice = raw.subarray(start, i).toString('utf8');
        if (slice) {
          candidates.add(slice);
        }
        start = i + 1;
      }
    }
  } else {
    function walk(absDir, relDir) {
      let entries;
      try {
        entries = fs.readdirSync(absDir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (SKIP_DIR_NAMES.has(entry.name)) {
          continue;
        }
        const rel = relDir ? `${relDir}/${entry.name}` : entry.name;
        const abs = path.join(absDir, entry.name);
        if (entry.isDirectory()) {
          walk(abs, rel);
        } else if (entry.isFile()) {
          candidates.add(rel);
        }
      }
    }
    walk(root, '');
  }

  for (const rootFile of listRootScannableFilesOnDisk(root)) {
    candidates.add(rootFile);
  }

  return [...candidates].filter(shouldScanPath).sort();
}

/**
 * @param {string} root
 * @returns {Finding[]}
 */
function scanRepository(root) {
  const files = listCandidateFiles(root);
  /** @type {Finding[]} */
  const findings = [];

  for (const relativePath of files) {
    const absolutePath = path.join(root, relativePath);
    let buffer;
    try {
      buffer = fs.readFileSync(absolutePath);
    } catch {
      continue;
    }
    if (isBinaryBuffer(buffer)) {
      continue;
    }
    const content = buffer.toString('utf8');
    findings.push(...scanContent(relativePath, content));
  }

  return findings;
}

function formatFindings(findings) {
  return findings.map(
    (f) =>
      `${f.file}:${f.line}: [${f.pattern}] redacted=${f.redacted}`,
  );
}

function main(argv = process.argv.slice(2)) {
  let root = process.cwd();
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--root' && argv[i + 1]) {
      root = path.resolve(argv[i + 1]);
      i += 1;
    }
  }

  const findings = scanRepository(root);
  if (findings.length === 0) {
    process.stdout.write('check:secrets — clean (no high-risk secret patterns)\n');
    return 0;
  }

  process.stderr.write(
    `check:secrets — ${findings.length} finding(s); values redacted\n`,
  );
  for (const line of formatFindings(findings)) {
    process.stderr.write(`${line}\n`);
  }
  return 1;
}

if (require.main === module) {
  process.exitCode = main();
}

module.exports = {
  TEST_TOKEN,
  scanContent,
  scanRepository,
  shouldScanPath,
  listCandidateFiles,
  formatFindings,
  redactValue,
  jwtPayloadHasServiceRole,
  main,
};
