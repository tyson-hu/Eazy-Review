'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  compareCodeUnits,
  sortByAreaThenUpdated,
  sortByUpdated,
} = require('./build-decision-index.cjs');

const SAME_DATE_DECISIONS = [
  {
    area: 'architecture',
    date: '2026-07-25',
    updated: '2026-07-25',
    title: 'Älpha decision',
    fileName: '2026-07-25-alpha-decision.md',
  },
  {
    area: 'architecture',
    date: '2026-07-25',
    updated: '2026-07-25',
    title: 'Zulu decision',
    fileName: '2026-07-25-zulu-decision.md',
  },
];

test('decision ordering uses deterministic code-unit comparisons', () => {
  assert.equal(compareCodeUnits('Z', 'Ä'), -1);
  assert.deepEqual(
    [...SAME_DATE_DECISIONS].sort(sortByAreaThenUpdated).map(({ title }) => title),
    ['Zulu decision', 'Älpha decision'],
  );
  assert.deepEqual(
    [...SAME_DATE_DECISIONS].sort(sortByUpdated).map(({ title }) => title),
    ['Zulu decision', 'Älpha decision'],
  );
});
