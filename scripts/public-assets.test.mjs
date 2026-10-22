import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
async function files(directory = root) {
  const out = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    if (['.git','node_modules'].includes(item.name)) continue;
    const file = path.join(directory,item.name);
    if (item.isDirectory()) out.push(...await files(file));
    else if (item.isFile()) out.push(file);
    else assert.fail(`Unexpected filesystem link: ${file}`);
  }
  return out;
}
const list = await files();
const text = async relative => readFile(path.join(root,relative),'utf8');

test('public name and stable invocation are deliberately distinct',async()=>{
  const pkg = JSON.parse(await text('package.json'));
  assert.equal(pkg.name,'modern-95-ui-for-ai');
  assert.equal(pkg.version,'0.3.0-rc.1');
  assert.equal(pkg.license,'MIT');
  assert.equal(pkg.private,true,'npm publication is not part of this distribution');
  assert.match(await text('SKILL.md'),/^---\r?\nname: modern-95-ui\r?\n/);
  assert.match(await text('SKILL.md'),new RegExp(`version: "${pkg.version.replaceAll('.','\\.')}"`));
  const agent = await text('agents/openai.yaml');
  assert.match(agent,/display_name: "Modern 95 UI for AI"/);
  assert.match(agent,/default_prompt: ".*\$modern-95-ui/);
  assert.match(agent,/allow_implicit_invocation: true/);
  const short = agent.match(/short_description: "([^"]+)"/)[1];
  assert.ok(short.length>=25 && short.length<=64);
});

test('published Markdown local links resolve inside the distribution',async()=>{
  for(const file of list.filter(file=>file.endsWith('.md'))) {
    const content=await readFile(file,'utf8');
    for(const [,raw] of content.matchAll(/!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
      if (/^(?:https?:|mailto:|#)/.test(raw)) continue;
      const target=path.resolve(path.dirname(file),decodeURIComponent(raw.split('#')[0]));
      const relative=path.relative(root,target);
      assert.ok(!relative.startsWith('..')&&!path.isAbsolute(relative),`${file}: ${raw}`);
      assert.ok(await stat(target),`${file}: ${raw}`);
    }
  }
});

test('runtime module imports and HTML assets are self-contained',async()=>{
  for(const file of list.filter(file=>file.includes(`${path.sep}assets${path.sep}`)&&/\.(html|mjs|css)$/.test(file))) {
    const content=await readFile(file,'utf8');
    const targets=file.endsWith('.html')?[...content.matchAll(/(?:src|href)="([^"]+)"/g)].map(x=>x[1]):file.endsWith('.mjs')?[...content.matchAll(/\bfrom\s+['"](\.[^'"]+)['"]/g)].map(x=>x[1]):[];
    for(const raw of targets){
      if(raw.startsWith('#')||raw.startsWith('node:'))continue;
      assert.doesNotMatch(raw,/^(?:https?:|data:|\/\/)/,`${file}: remote runtime resource`);
      assert.ok((await stat(path.resolve(path.dirname(file),raw.split('#')[0]))).isFile(),`${file}: ${raw}`);
    }
    if(file.endsWith('.html'))assert.doesNotMatch(content,/<script(?![^>]*\bsrc=)[^>]*>|\s(?:on\w+|style)\s*=/i);
  }
});

test('historical runtime and data artifacts are outside the distribution',()=>{
  for(const file of list){
    const name=path.relative(root,file).replaceAll('\\','/');
    assert.doesNotMatch(name,/(?:^|\/)(?:node_modules|profile|test-data|test-results|qa-data|\.env)(?:\/|$|\.)/);
    assert.doesNotMatch(name,/\.(?:db|sqlite3?|pem|key|pfx|zip|log)$/i);
    assert.ok(!['classic.css','lab.css','lab.mjs','preview.html','preview.mjs','style-model.mjs'].includes(path.basename(file)));
  }
});

test('licenses and public scope explain the retained subset',async()=>{
  assert.equal(await text('LICENSE'),await text('assets/starter/LICENSE'));
  for(const file of ['LICENSE','assets/starter/LICENSE']) assert.match(await text(file),/Permission is hereby granted, free of charge/);
  const notices=await text('THIRD_PARTY_NOTICES.md');
  for(const term of ['21 original','ISC','Feather','MIT','manifest.json'])assert.ok(notices.includes(term));
  assert.match(await text('docs/source-and-license.md'),/no inherited Git history/);
});
