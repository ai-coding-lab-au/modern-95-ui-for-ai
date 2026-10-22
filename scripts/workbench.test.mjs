import test from 'node:test';
import assert from 'node:assert/strict';
import { groups, initialDetails, initialReadiness, progress, validateDetails, exportText } from '../assets/design-lab/dist/workbench-model.mjs';

test('workbench instances have independent readiness and immutable synthetic data', () => {
  const first = initialReadiness(), second = initialReadiness();
  first.clear();
  assert.deepEqual(progress(second), { ready: 3, total: 8 });
  assert.deepEqual(progress(first), { ready: 0, total: 8 });
  assert.throws(() => { groups[0].items[0].name = 'changed'; }, TypeError);
});
test('readiness counts known documents once and ignores unknown identifiers', () => {
  const ready = new Set(groups.flatMap(group => group.items.map(item => item.id)));
  ready.add('unknown'); ready.add('source');
  assert.deepEqual(progress(ready), { ready: 8, total: 8 });
});
test('details validation rejects empty names and impossible dates', () => {
  assert.throws(() => validateDetails({ ...initialDetails, project: '  ' }), /project name/);
  for (const date of ['2026-02-30', 'not a date', '2026-13-01']) assert.throws(() => validateDetails({ ...initialDetails, date }), /valid handover date/);
  assert.equal(validateDetails({ ...initialDetails, date: '' }).date, '');
  assert.equal(validateDetails({ ...initialDetails, project: '  Project A  ' }).project, 'Project A');
});
test('details validation enforces text limits without mutating input', () => {
  const input = { ...initialDetails };
  assert.deepEqual(validateDetails(input), input);
  for (const [field, length] of [['project', 101], ['owner', 81], ['notes', 501]]) assert.throws(() => validateDetails({ ...input, [field]: 'a'.repeat(length) }), error => error.field === field && /shorter/.test(error.message));
  assert.deepEqual(input, initialDetails);
});
test('export keeps applied details and the exact readiness state', () => {
  const text = exportText({ ...initialDetails, project: 'R&D <sample>', notes: 'Line one\nLine two' }, new Set(['source', 'support']));
  assert.ok(text.includes('R&D <sample>'));
  assert.ok(text.includes('Line one\nLine two'));
  assert.ok(text.includes('Ready: 2 / 8'));
  assert.equal(text.split('\n').filter(line => line.startsWith('[x]')).length, 2);
  assert.equal(text.split('\n').filter(line => line.startsWith('[ ]')).length, 6);
});
