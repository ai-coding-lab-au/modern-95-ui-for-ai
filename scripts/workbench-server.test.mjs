import assert from 'node:assert/strict';
import test from 'node:test';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseOptions, serveWorkbench } from './serve-workbench.mjs';

function request(url, { method = 'GET', pathname, host } = {}) {
  return new Promise((resolve, reject) => {
    const location = new URL(url);
    const req = http.request({ hostname: location.hostname, port: location.port, path: pathname || location.pathname, method, ...(host ? { headers: { Host: host } } : {}) }, response => {
      let body = ''; response.setEncoding('utf8'); response.on('data', value => { body += value; });
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body }));
    });
    req.on('error', reject); req.end();
  });
}
test('workbench options retain a stable default and reject malformed ports or flags', () => {
  assert.deepEqual(parseOptions([]), { port: 55198, open: false });
  assert.deepEqual(parseOptions(['--open', '--port', '0']), { port: 0, open: true });
  for (const args of [['--port'], ['--port', '-1'], ['--port', '1.5'], ['--port', '65536'], ['--unknown']]) assert.throws(() => parseOptions(args));
});
test('workbench server serves its explicit entry and local Starter navigation', async () => {
  const server = await serveWorkbench({ port: 0 });
  try {
    assert.match(server.entryUrl, /^http:\/\/127\.0\.0\.1:\d+\/design-lab\/dist\/workbench.html$/);
    const entry = await request(server.entryUrl); assert.equal(entry.status, 200);
    assert.match(entry.body, /href="\.\.\/\.\.\/starter\/index.html"/);
    assert.match(entry.body, /Project handover/);
    for (const name of ['workbench.css', 'workbench.mjs', 'workbench-model.mjs', 'workbench-icons.mjs', 'vendor/lucide/icons.mjs']) assert.equal((await request(new URL(name, server.entryUrl))).status, 200);
    assert.equal((await request(`${server.url}/starter/index.html`)).status, 200);
    assert.equal((await request(`${server.url}/`)).status, 404);
    assert.equal((await request(`${server.url}/design-lab/dist/index.html`)).status, 404);
  } finally { await server.close(); }
});
test('workbench server enforces local Host, read-only methods and bounded asset paths', async () => {
  const server = await serveWorkbench({ port: 0 });
  try {
    const head = await request(server.entryUrl, { method: 'HEAD' });
    assert.equal(head.status, 200); assert.equal(head.body, '');
    assert.match(head.headers['content-security-policy'], /script-src 'self'/);
    assert.match(head.headers['content-security-policy'], /connect-src 'none'/);
    assert.equal((await request(server.entryUrl, { method: 'POST' })).status, 405);
    assert.equal((await request(server.entryUrl, { host: 'example.invalid' })).status, 403);
    assert.equal((await request(server.entryUrl, { pathname: '/..%2fLICENSE' })).status, 403);
    assert.equal((await request(server.entryUrl, { pathname: '/%invalid' })).status, 404);
    assert.equal((await request(server.entryUrl, { pathname: '/design-lab/dist/vendor/lucide/manifest.json' })).status, 404);
  } finally { await server.close(); }
});
test('workbench keeps approved CSS defaults without a historical model dependency', async () => {
  const script = await readFile(new URL('../assets/design-lab/dist/workbench.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(script, /style-model|selectedDraft|root\.style\.setProperty/);
  const style = await readFile(new URL('../assets/design-lab/dist/workbench.css', import.meta.url), 'utf8');
  for (const token of ['--desktop: #008080', '--title: #102776', '--chrome: #eef0ed']) assert.ok(style.includes(token), token);
});
test('a second server refuses the occupied port and leaves the first server usable', async () => {
  const first = await serveWorkbench({ port: 0 });
  try {
    await assert.rejects(serveWorkbench({ port: Number(new URL(first.url).port) }), { code: 'EADDRINUSE' });
    assert.equal((await request(first.entryUrl)).status, 200);
  } finally { await first.close(); }
});
test('CLI uses its own path from another cwd and closes on a split stdin stop command', { timeout: 10000 }, async () => {
  const child = spawn(process.execPath, [fileURLToPath(new URL('./serve-workbench.mjs', import.meta.url)), '--port', '0'], { cwd: fileURLToPath(new URL('../assets/starter/', import.meta.url)), windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  const exited = once(child, 'exit');
  let output = '', errors = '';
  child.stderr.on('data', chunk => { errors += chunk; });
  try {
    const url = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Startup timeout: ${errors}`)), 4000);
      child.once('error', error => { clearTimeout(timer); reject(error); });
      child.stdout.on('data', chunk => { output += chunk; const found = output.match(/http:\/\/127\.0\.0\.1:\d+\/design-lab\/dist\/workbench.html/); if (found) { clearTimeout(timer); resolve(found[0]); } });
    });
    assert.equal((await request(url)).status, 200);
    child.stdin.write('st'); child.stdin.end('op\n');
    const [code, signal] = await exited;
    assert.equal(code, 0); assert.equal(signal, null); assert.equal(errors, '');
    await assert.rejects(request(url), error => error.code === 'ECONNREFUSED');
  } finally { if (child.exitCode === null && child.signalCode === null) { child.kill(); await exited; } }
});
