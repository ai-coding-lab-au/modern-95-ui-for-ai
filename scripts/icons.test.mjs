import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { icons, icon } from '../assets/design-lab/dist/vendor/lucide/icons.mjs';
import { buildIcons } from './build-icons.mjs';
import { workbenchIcon } from '../assets/design-lab/dist/workbench-icons.mjs';
const vendor = new URL('../assets/design-lab/dist/vendor/lucide/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('manifest.json', vendor), 'utf8'));
const expected = { window:'app-window', search:'search', plus:'plus', mail:'mail', folder:'folder', file:'file-text', grid:'layout-grid', list:'list', calendar:'calendar', archive:'archive', star:'star', arrow:'reply', check:'check', clock:'clock', paperclip:'paperclip', download:'download', clipboard:'clipboard-check', minimize:'minus', maximize:'square', restore:'copy', close:'x' };

test('reviewed aliases retain their original meanings and complete upstream file set', async () => {
  assert.deepEqual(manifest.mapping, expected);
  assert.deepEqual(Object.keys(icons), Object.keys(expected));
  assert.equal(Object.isFrozen(icons), true);
  assert.deepEqual((await readdir(new URL('icons/', vendor))).sort(), Object.values(expected).map(name => `${name}.svg`).sort());
  assert.equal(manifest.files.length, 22);
});
for (const [alias, name] of Object.entries(expected)) test(`icon ${alias} preserves pinned Lucide ${name} geometry`, async () => {
  const source = await readFile(new URL(`icons/${name}.svg`, vendor));
  assert.equal(createHash('sha256').update(source).digest('hex'), manifest.files.find(entry => entry.file === `icons/${name}.svg`).sha256);
  const body = source.toString('utf8').replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').trim().replace(/>\s+</g, '><');
  assert.equal(icons[alias], body);
  assert.equal(icon(alias), `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`);
});
test('packaged icon module is reproducible from the reviewed sources and complete license', async () => {
  assert.equal(await readFile(new URL('icons.mjs', vendor), 'utf8'), await buildIcons());
  const license = await readFile(new URL('LICENSE', vendor), 'utf8');
  for (const text of ['ISC License', 'Lucide Icons and Contributors', 'The MIT License (MIT)', 'Cole Bemis']) assert.ok(license.includes(text));
});
test('unknown icon names fall back without injecting names or inherited object values', () => {
  for (const name of [undefined, '', 'missing', '__proto__', 'constructor', '<img src=x onerror=alert(1)>']) assert.equal(icon(name), icon('window'));
});
test('workbench adapter preserves licensed geometry, decorative semantics and optical sizing', () => {
  for (const [name, alias, box, stroke] of [
    ['application','clipboard','0 0 24 24',1.6],
    ['minimize','minimize','0 -4.5 24 24',2.1],
    ['expand','maximize','-2.4 -2.4 28.8 28.8',2.52],
    ['restore','restore','-4 -4 32 32',2.8],
    ['close','close','0 0 24 24',2.1],
  ]) {
    const rendered = workbenchIcon(name);
    assert.ok(rendered.includes(icons[alias]));
    assert.ok(rendered.includes(`viewBox="${box}"`));
    assert.ok(rendered.includes(`stroke-width="${stroke}"`));
    assert.ok(rendered.includes('aria-hidden="true"'));
    if (name !== 'application') assert.ok(Math.abs(stroke * 16 / Number(box.split(' ')[2]) - 1.4) < 1e-10);
  }
  for (const bad of ['__proto__', 'constructor', '<script>', undefined]) assert.throws(() => workbenchIcon(bad), TypeError);
});
