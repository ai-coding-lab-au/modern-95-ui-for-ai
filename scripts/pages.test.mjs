import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPages, pagesFiles } from './build-pages.mjs';
import { serve } from '../assets/starter/serve.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
async function fixture(t) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'modern95-pages-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const output = path.join(temporary, 'site');
  await buildPages(output);
  return { temporary, output };
}
async function names(directory, prefix = '') {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = prefix + entry.name;
    if (entry.isDirectory()) result.push(...await names(path.join(directory, entry.name), relative + '/'));
    else result.push(relative);
  }
  return result.sort();
}

test('Pages copies only the explicit runtime and license allowlist, byte for byte', async t => {
  const { output } = await fixture(t);
  assert.deepEqual(await names(output), [...pagesFiles, 'index.html', '.nojekyll'].sort());
  for (const file of pagesFiles) assert.deepEqual(await readFile(path.join(output, file)), await readFile(path.join(root, file)), file);
});

test('Pages preserves all nested HTML and module links under a project subpath', async t => {
  const { temporary, output } = await fixture(t);
  const server = await serve({ root: temporary, port: 0 });
  t.after(() => server.close());
  for (const file of ['index.html', ...pagesFiles.filter(name => /\.(html|mjs)$/.test(name))]) {
    const content = await readFile(path.join(output, file), 'utf8');
    const links = file.endsWith('.html')
      ? [...content.matchAll(/(?:src|href)="([^"]+)"/g)].map(match => match[1])
      : [...content.matchAll(/\bfrom\s+['"](\.[^'"]+)['"]/g)].map(match => match[1]);
    for (const link of links) {
      if (link.startsWith('#')) continue;
      const url = new URL(link, `${server.url}/site/${file}`);
      assert.ok(url.pathname.startsWith('/site/'), `${file}: escaped project prefix: ${link}`);
      const response = await fetch(url);
      assert.equal(response.status, 200, `${file}: ${link}`);
    }
  }
});

test('Pages root opens the existing gallery and contains no replacement visual', async t => {
  const { output } = await fixture(t);
  const html = await readFile(path.join(output, 'index.html'), 'utf8');
  assert.match(html, /http-equiv="refresh" content="0; url=\.\/assets\/starter\/index.html"/);
  assert.doesNotMatch(html, /<script|<style|<iframe|https?:\/\//i);
});

test('Pages rejects checkout output and never overwrites an existing destination', async t => {
  await assert.rejects(buildPages(path.join(root, 'pages-output')), /outside the repository/);
  const { output } = await fixture(t);
  const sentinel = path.join(output, 'sentinel.txt');
  await writeFile(sentinel, 'keep');
  await assert.rejects(buildPages(output), { code: 'EEXIST' });
  assert.equal(await readFile(sentinel, 'utf8'), 'keep');
});
