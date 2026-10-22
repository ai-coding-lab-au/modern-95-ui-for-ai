import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { serve } from '../assets/starter/serve.mjs';

const starter = new URL('../assets/starter/', import.meta.url);

async function fixture(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(),'m95-server-'));
  await fs.writeFile(path.join(dir,'index.html'),'<title>Synthetic</title>');
  await fs.writeFile(path.join(dir,'.private.html'),'private');
  await fs.writeFile(path.join(dir,'settings.json'),'{}');
  await fs.writeFile(path.join(dir,'sample.mjs'),'export const sample = true;');
  const app = await serve({root:dir,port:0});
  t.after(async()=>{await app.close();await fs.rm(dir,{recursive:true});});
  return app;
}
test('server serves loopback HTML and blocks runtime external connections',async t=>{
  const app=await fixture(t), response=await fetch(app.url);
  assert.equal(response.status,200);assert.equal(await response.text(),'<title>Synthetic</title>');
  assert.match(response.headers.get('content-type'),/text\/html/);
  assert.match(response.headers.get('content-security-policy'),/connect-src 'none'/);
  assert.equal(response.headers.get('cache-control'),'no-store');
});
test('HEAD has same status and an empty body',async t=>{const app=await fixture(t), response=await fetch(app.url,{method:'HEAD'});assert.equal(response.status,200);assert.equal(await response.text(),'');});
test('unsupported methods cannot write content',async t=>{const app=await fixture(t);assert.equal((await fetch(app.url,{method:'POST',body:'x'})).status,405);});
test('missing or unsupported resource is not served',async t=>{const app=await fixture(t);for(const route of ['/missing.html','/settings.json','/%ZZ'])assert.equal((await fetch(app.url+route)).status,404);});
test('hidden files cannot be downloaded',async t=>{const app=await fixture(t);assert.equal((await fetch(app.url+'/.private.html')).status,403);});
test('module MIME is explicit',async t=>{const app=await fixture(t),response=await fetch(app.url+'/sample.mjs');assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/text\/javascript/);});
test('unexpected Host is rejected',async t=>{
  const app=await fixture(t);
  const status=await new Promise((resolve,reject)=>{const request=http.get(app.url,{headers:{Host:'outside.example'}},res=>{res.resume();resolve(res.statusCode);});request.on('error',reject);});
  assert.equal(status,403);
});
test('invalid ports fail before listening',async()=>{for(const port of [-1,65536,1.5,NaN])await assert.rejects(serve({port}),/Invalid port/);});
test('occupied port fails without replacing an existing listener',async t=>{const app=await fixture(t);await assert.rejects(serve({port:Number(new URL(app.url).port)}),/EADDRINUSE/);assert.equal((await fetch(app.url)).status,200);});
test('Starter preserves the approved base palette and geometry',async()=>{
  const css=await fs.readFile(new URL('m95.css',starter),'utf8');
  const tokens=Object.fromEntries([...css.matchAll(/(--m95-[\w-]+):\s*([^;]+);/g)].map(([,name,value])=>[name,value.trim()]));
  for(const [key,value] of Object.entries({desktop:'#008080',title:'#102776',chrome:'#eef0ed',radius:'4px'}))assert.equal(tokens[`--m95-${key}`],value);
  // A later coarse-pointer override is intentional, separate from desktop default.
  assert.match(css,/--m95-control:\s*30px;/);
  assert.match(css,/--m95-font:\s*"Segoe UI", sans-serif;/);
});
test('all three entrypoints link only to existing local assets',async()=>{
  for(const file of ['index.html','examples/assets.html','examples/request.html']) {
    const url=new URL(file,starter), html=await fs.readFile(url,'utf8');
    for(const [,target] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
      if(target.startsWith('#'))continue;
      const resource=new URL(target,url);
      assert.ok(resource.href.startsWith(starter.href),`${file}: ${target}`);
      assert.ok((await fs.stat(resource)).isFile());
    }
    assert.doesNotMatch(html,/<script(?![^>]*\bsrc=)[^>]*>/i);
    assert.doesNotMatch(html,/\s(?:on\w+|style)\s*=/i);
  }
});
test('standalone Starter carries the complete project MIT license',async()=>{
  const license=await fs.readFile(new URL('LICENSE',starter),'utf8');
  assert.ok(license.includes('Copyright (c) 2026 Modern 95 UI contributors'));
  assert.ok(license.includes('Permission is hereby granted, free of charge'));
  assert.ok(license.includes('THE SOFTWARE IS PROVIDED "AS IS"'));
});
