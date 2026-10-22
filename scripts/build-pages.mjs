import { copyFile, lstat, mkdir, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = fileURLToPath(new URL('../', import.meta.url));
const lucide = 'assets/design-lab/dist/vendor/lucide';

// Explicit publication boundary: no repository history, test outputs, launchers,
// private data or arbitrary files from the checkout enter the Pages artifact.
export const pagesFiles = Object.freeze([
  'LICENSE', 'THIRD_PARTY_NOTICES.md', 'assets/starter/LICENSE',
  ...['index.html', 'm95.css', 'm95.mjs', 'gallery.mjs'].map(name => `assets/starter/${name}`),
  ...['assets', 'request'].flatMap(name => ['html', 'css', 'mjs'].map(ext => `assets/starter/examples/${name}.${ext}`)),
  ...['workbench.html', 'workbench.css', 'workbench.mjs', 'workbench-model.mjs', 'workbench-icons.mjs'].map(name => `assets/design-lab/dist/${name}`),
  ...['LICENSE', 'manifest.json', 'icons.mjs'].map(name => `${lucide}/${name}`),
  ...['app-window', 'search', 'plus', 'mail', 'folder', 'file-text', 'layout-grid', 'list', 'calendar', 'archive', 'star', 'reply', 'check', 'clock', 'paperclip', 'download', 'clipboard-check', 'minus', 'square', 'copy', 'x'].map(name => `${lucide}/icons/${name}.svg`),
]);

function inside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === '' || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`));
}

export async function buildPages(outDir) {
  if (!outDir) throw new Error('Provide --out with a new directory outside the repository.');
  const sourceRoot = await realpath(repository);
  const destination = path.resolve(outDir);
  const parent = await realpath(path.dirname(destination));
  if (inside(sourceRoot, destination) || inside(sourceRoot, path.join(parent, path.basename(destination)))) {
    throw new Error('Pages output must be outside the repository.');
  }
  // Validate all sources before creating output. Fail instead of following links
  // to unreviewed files or clearing a pre-existing directory.
  for (const relative of pagesFiles) {
    const source = path.join(sourceRoot, relative);
    if (!(await lstat(source)).isFile() || !inside(sourceRoot, await realpath(source))) {
      throw new Error(`Not a regular in-repository asset: ${relative}`);
    }
  }
  await mkdir(destination);
  for (const relative of pagesFiles) {
    const target = path.join(destination, relative);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(path.join(sourceRoot, relative), target);
  }
  await writeFile(path.join(destination, '.nojekyll'), '');
  await writeFile(path.join(destination, 'index.html'), `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="refresh" content="0; url=./assets/starter/index.html">
  <title>Modern 95 UI for AI — live examples</title>
</head>
<body><p><a href="./assets/starter/index.html">Open the Modern 95 UI Starter gallery</a></p></body>
</html>
`);
  return { files: pagesFiles.length + 2, directory: destination };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== '--out') {
    console.error('Usage: node scripts/build-pages.mjs --out <new-directory-outside-checkout>');
    process.exitCode = 1;
  } else {
    buildPages(args[1]).then(result => console.log(JSON.stringify(result)))
      .catch(error => { console.error(error.message); process.exitCode = 1; });
  }
}
