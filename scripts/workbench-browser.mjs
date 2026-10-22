// Adapted from the maintenance repository's browser smoke test. This public
// runner covers Handover only; it never loads the historical inspector/studies.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { exportText, initialDetails, initialReadiness } from '../assets/design-lab/dist/workbench-model.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const option = key => { const index = args.indexOf(key); return index < 0 ? undefined : args[index + 1]; };
const outputOption = option('--output');
if (!outputOption) throw new Error('Supply --output with an evidence directory outside this repository.');
const output = path.resolve(outputOption);
const relativeOutput = path.relative(root, output);
if (!relativeOutput.startsWith('..') && !path.isAbsolute(relativeOutput)) throw new Error('Evidence output must be outside this repository.');
const modulePath = option('--playwright-module');
const browserPath = option('--browser');
const { chromium } = modulePath ? await import(pathToFileURL(path.resolve(modulePath))) : await import('playwright-core');
await mkdir(output, { recursive: true });
const started = new Date().toISOString();
let assertions = 0;
const verify = new Proxy(assert, { get(target, property) { const value = target[property]; return typeof value === 'function' ? (...values) => { assertions++; return value(...values); } : value; } });
const results = [], pageErrors = [], externalRequests = [], consoleErrors = [], failedResources = [], expectedResourceWarnings = [];
const check = async (name, run) => {
  const before = assertions;
  try { await run(); results.push({ name, status: 'PASS', assertions: assertions - before }); console.log(`PASS ${name}`); }
  catch (error) { results.push({ name, status: 'FAIL', assertions: assertions - before, error: error.message }); throw error; }
};
const sources = {};
for (const name of ['workbench.html', 'workbench.css', 'workbench.mjs', 'workbench-model.mjs', 'workbench-icons.mjs', 'vendor/lucide/icons.mjs']) {
  const bytes = await readFile(path.join(root, 'assets/design-lab/dist', name));
  sources[`assets/design-lab/dist/${name}`] = createHash('sha256').update(bytes).digest('hex');
}
const child = spawn(process.execPath, [path.join(root, 'scripts/serve-workbench.mjs'), '--port', '0'], { cwd: output, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
const exited = once(child, 'exit');
let browser, entryUrl, browserVersion, failed, serverExit, serverOutput = '', serverErrors = '', forcedCleanup = false;
child.stderr.on('data', chunk => { serverErrors += chunk; });
try {
  entryUrl = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Server startup timeout: ${serverErrors}`)), 5000);
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('exit', code => { clearTimeout(timer); reject(new Error(`Server exited ${code}`)); });
    child.stdout.on('data', chunk => { serverOutput += chunk; const match = serverOutput.match(/http:\/\/127\.0\.0\.1:\d+\/design-lab\/dist\/workbench.html/); if (match) { clearTimeout(timer); resolve(match[0]); } });
  });
  const origin = new URL(entryUrl).origin;
  browser = await chromium.launch({ headless: true, ...(browserPath ? { executablePath: browserPath } : {}) });
  browserVersion = browser.version();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1080 }, deviceScaleFactor: 1, reducedMotion: 'reduce', acceptDownloads: true });
  const page = await context.newPage();
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push({ text: message.text(), url: message.location().url }); });
  page.on('response', response => { if (response.status() >= 400) failedResources.push({ url: response.url(), status: response.status() }); });
  page.on('request', request => { if (!request.url().startsWith(`${origin}/`) && !request.url().startsWith('blob:') && !request.url().startsWith('data:')) externalRequests.push(request.url()); });
  await page.goto(entryUrl);
  await check('initial synthetic state, approved caption geometry and CSS defaults', async () => {
    verify.equal(await page.title(), 'Project handover · Modern 95 UI');
    await page.getByText('3 of 8 ready', { exact: true }).waitFor();
    verify.equal(await page.getByRole('checkbox').count(), 8);
    const boxes = await page.locator('.caption-button').evaluateAll(nodes => nodes.map(node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }));
    verify.equal(boxes.length, 3);
    for (const box of boxes) { verify.equal(box.width, 32); verify.equal(box.height, 28); verify.equal(box.y, boxes[0].y); }
    verify.equal(boxes[1].x - boxes[0].x - boxes[0].width, 3);
    verify.equal(boxes[2].x - boxes[1].x - boxes[1].width, 3);
    const approvedTokens = {
      '--desktop': '#008080', '--title': '#102776', '--chrome': '#eef0ed',
      '--font': '"Segoe UI", sans-serif', '--font-size': '14px', '--radius': '4px',
      '--control': '30px', '--cell-y': '9px', '--space': '16px', '--edge': '#89979b',
      '--control-shadow': 'inset 1px 1px #fff, inset -1px -1px #9aa5a6, 0 1px 2px #1e303328',
      '--window-shadow': 'inset 1px 1px white, 0 8px 28px #003b3b40'
    };
    const tokens = await page.locator('.m95-study').evaluate((node, keys) => Object.fromEntries(keys.map(key => [key, getComputedStyle(node).getPropertyValue(key).trim()])), Object.keys(approvedTokens));
    verify.deepEqual(tokens, approvedTokens);
    verify.equal(await page.locator('.m95-study').getAttribute('style'), null);
    await page.screenshot({ path: path.join(output, 'workbench-wide.png'), fullPage: true });
  });
  await check('checkbox keyboard operation and group keyboard collapse', async () => {
    const checkbox = page.getByRole('checkbox', { name: 'Approved images and media ready', exact: true });
    await checkbox.focus(); await page.keyboard.press('Space'); verify.equal(await checkbox.isChecked(), true);
    verify.equal(await page.locator('#progress-count').textContent(), '4 of 8 ready');
    const summary = page.locator('summary').last(); await summary.focus(); await page.keyboard.press('Enter');
    verify.equal(await page.locator('details').last().getAttribute('open'), null);
    await page.keyboard.press('Enter'); verify.equal(await page.getByRole('checkbox', { name: 'Support contacts and next steps ready' }).isVisible(), true);
  });
  await check('invalid details, correction, literal text and preserved progress', async () => {
    await page.getByLabel('Project name', { exact: false }).fill(' ');
    await page.getByRole('button', { name: 'Apply details' }).click();
    verify.equal(await page.locator('#project-error').isVisible(), true);
    verify.equal(await page.locator('#project-name').evaluate(node => document.activeElement === node), true);
    verify.equal(await page.locator('#project-title').textContent(), initialDetails.project);
    await page.locator('#project-name').fill('R&D <img src=x onerror=alert(1)>');
    await page.getByRole('button', { name: 'Apply details' }).click();
    verify.equal(await page.locator('#project-title').textContent(), 'R&D <img src=x onerror=alert(1)>');
    verify.equal(await page.locator('#project-title img').count(), 0);
    verify.equal(await page.locator('#progress-count').textContent(), '4 of 8 ready');
  });
  await check('download bytes match applied details and exclude unapplied draft', async () => {
    await page.locator('#project-name').fill('Unapplied draft');
    const downloaded = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export checklist' }).click();
    const download = await downloaded; verify.equal(download.suggestedFilename(), 'modern-95-ui-handover.txt');
    const ready = initialReadiness(); ready.add('media');
    verify.equal(await readFile(await download.path(), 'utf8'), exportText({ ...initialDetails, project: 'R&D <img src=x onerror=alert(1)>' }, ready));
    await download.saveAs(path.join(output, 'synthetic-handover.txt'));
  });
  await check('reset dialog cancel, Escape, confirm, focus and disabled state', async () => {
    const reset = page.getByRole('button', { name: 'Reset progress', exact: true }).first();
    await reset.click(); verify.equal(await page.getByRole('button', { name: 'Cancel', exact: true }).evaluate(node => document.activeElement === node), true);
    await page.keyboard.press('Escape'); verify.equal(await reset.evaluate(node => document.activeElement === node), true);
    await reset.click(); await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    verify.equal(await page.locator('#progress-count').textContent(), '4 of 8 ready');
    await reset.click(); await page.getByRole('dialog').getByRole('button', { name: 'Reset progress', exact: true }).click();
    await page.getByText('0 of 8 ready', { exact: true }).waitFor();
    verify.equal(await page.locator('#progress-count').textContent(), '0 of 8 ready');
    verify.equal(await reset.isDisabled(), true); verify.equal(await page.locator('#project-name').inputValue(), 'Unapplied draft');
  });
  await check('preview controls preserve draft and checklist state', async () => {
    await page.getByRole('button', { name: 'Minimize preview', exact: true }).click(); verify.equal(await page.locator('#window-content').isVisible(), false);
    await page.getByRole('button', { name: 'Restore preview', exact: true }).click();
    await page.getByRole('button', { name: 'Expand preview', exact: true }).click(); verify.equal(await page.locator('.m95-study').evaluate(node => node.classList.contains('is-expanded')), true);
    await page.getByRole('button', { name: 'Restore preview size', exact: true }).click();
    await page.getByRole('button', { name: 'Close preview', exact: true }).click(); verify.equal(await page.locator('#reopen-preview').evaluate(node => document.activeElement === node), true);
    await page.getByRole('button', { name: 'Reopen preview', exact: true }).click();
    verify.equal(await page.locator('#project-name').inputValue(), 'Unapplied draft'); verify.equal(await page.locator('#progress-count').textContent(), '0 of 8 ready');
  });
  await page.reload(); await page.getByText('3 of 8 ready', { exact: true }).waitFor();
  for (const width of [980, 640, 375]) await check(`layout and reachable controls at ${width} CSS px`, async () => {
    await page.setViewportSize({ width, height: 900 });
    verify.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.getByRole('button', { name: 'Export checklist' }).scrollIntoViewIfNeeded();
    verify.equal(await page.getByRole('button', { name: 'Export checklist' }).isVisible(), true);
    const checkbox = page.getByRole('checkbox', { name: 'Support contacts and next steps ready' });
    await checkbox.check(); verify.equal(await checkbox.isChecked(), true); await checkbox.uncheck(); verify.equal(await checkbox.isChecked(), false);
    await page.screenshot({ path: path.join(output, `workbench-${width}.png`), fullPage: true });
  });
  await check('long content, visible error, final group and dialog at 375 CSS px', async () => {
    await page.locator('#project-name').fill('A long handover name for a multi-team workspace with documentation and account ownership review');
    await page.locator('#handover-notes').fill('Long reference note. '.repeat(20));
    await page.getByRole('button', { name: 'Apply details' }).click();
    verify.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.locator('summary').last().click();
    await page.locator('#project-name').fill(''); await page.getByRole('button', { name: 'Apply details' }).click();
    verify.equal(await page.locator('#project-error').isVisible(), true);
    await page.getByRole('button', { name: 'Reset progress', exact: true }).first().click();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
    verify.equal(await page.locator('#reset-dialog').isVisible(), false);
  });
  await check('local navigation opens the separately packaged Starter', async () => {
    const link = page.getByRole('link', { name: 'Content workbench starter' });
    verify.equal(await link.getAttribute('href'), '../../starter/index.html');
    await link.click(); await page.waitForURL(`${origin}/starter/index.html`);
    verify.equal(await page.locator('.m95').count() > 0, true);
  });
  await check('no script errors or external requests; optional Starter favicon warning is separate', async () => {
    const optionalFaviconUrl = `${origin}/favicon.ico`;
    expectedResourceWarnings.push(...failedResources.filter(item => item.url === optionalFaviconUrl && item.status === 404));
    if (consoleErrors.some(item => item.url === optionalFaviconUrl && item.text === 'Failed to load resource: the server responded with a status of 404 (Not Found)')) {
      const response = await fetch(optionalFaviconUrl);
      verify.equal(response.status, 404);
      expectedResourceWarnings.push({ url: optionalFaviconUrl, status: response.status, evidence: 'Browser console and independent HTTP check', reason: 'Starter has no favicon; its source is preserved unchanged.' });
    }
    const unexpectedResources = failedResources.filter(item => !(item.url === optionalFaviconUrl && item.status === 404));
    const unexpectedConsoleErrors = consoleErrors.filter(item => !(item.url === optionalFaviconUrl && item.text === 'Failed to load resource: the server responded with a status of 404 (Not Found)'));
    verify.deepEqual(pageErrors, []); verify.deepEqual(unexpectedConsoleErrors, []); verify.deepEqual(externalRequests, []); verify.deepEqual(unexpectedResources, []);
  });
  await context.close();
} catch (error) { failed = error; console.error(error); }
finally {
  if (browser) await browser.close();
  if (child.exitCode === null && child.signalCode === null) {
    child.stdin.end('stop\n');
    const timer = setTimeout(() => { forcedCleanup = true; child.kill(); }, 3000);
    try { serverExit = await exited; } finally { clearTimeout(timer); }
  } else serverExit = [child.exitCode, child.signalCode];
  if (serverExit[0] !== 0 || serverErrors || forcedCleanup) failed ||= new Error('Server did not close cleanly');
  await writeFile(path.join(output, 'results.json'), JSON.stringify({ status: failed ? 'FAIL' : 'PASS', started, finished: new Date().toISOString(), groups: results.length, assertions, failedGroups: results.filter(row => row.status === 'FAIL').length, checks: results, error: failed?.message, pageErrors, consoleErrors, failedResources, expectedResourceWarnings, externalRequests, sources, entryUrl, browserVersion, browserPath: browserPath || 'Playwright default', modulePath: modulePath || 'playwright-core', node: process.version, viewportWidths: [1440, 980, 640, 375], deviceScaleFactor: 1, server: { pid: child.pid, command: ['node', 'scripts/serve-workbench.mjs', '--port', '0'], exit: serverExit, errors: serverErrors, forcedCleanup }, evidence: 'Headless browser operations in a fresh temporary context. Synthetic in-memory flow; no native host, physical keyboard/mouse, system DPI or business backend validation.' }, null, 2));
}
if (failed) process.exitCode = 1;
