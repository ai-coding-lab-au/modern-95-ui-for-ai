import http from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';

const directory = path.dirname(fileURLToPath(import.meta.url));
const types = {'.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.mjs':'text/javascript; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.png':'image/png', '.svg':'image/svg+xml', '.md':'text/plain; charset=utf-8'};
export async function serve({port = 55197, root = directory} = {}) {
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid port');
  root = await realpath(root);
  const server = http.createServer(async (request, response) => {
    const headers = {'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'no-referrer', 'Content-Security-Policy':"default-src 'self'; connect-src 'none'; img-src 'self'; font-src 'self'; style-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"};
    if (!['GET','HEAD'].includes(request.method)) { response.writeHead(405,headers).end(); return; }
    if (!/^127\.0\.0\.1(?::\d+)?$/.test(request.headers.host || '')) { response.writeHead(403,headers).end(); return; }
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
      const candidate = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
      const resolved = await realpath(candidate);
      const relative = path.relative(root, resolved);
      if (relative.startsWith('..') || path.isAbsolute(relative) || relative.split(path.sep).some(x=>x.startsWith('.'))) { response.writeHead(403,headers).end(); return; }
      const mime = types[path.extname(resolved)];
      if (!mime) { response.writeHead(404,headers).end(); return; }
      const data = await readFile(resolved);
      response.writeHead(200, {...headers,'Content-Type':mime});
      response.end(request.method === 'HEAD' ? undefined : data);
    } catch { response.writeHead(404,headers).end('Not found'); }
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
  return {server, url:`http://127.0.0.1:${server.address().port}`, close:()=>new Promise((resolve,reject)=>{server.close(error=>error?reject(error):resolve());server.closeAllConnections();})};
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const i = args.indexOf('--port');
  const instance = await serve({port:i<0?55197:Number(args[i+1])});
  console.log(`Modern 95 UI Starter\n${instance.url}\nPID ${process.pid}\nSynthetic local examples. Use the same browser and URL to retain saved records.\nCtrl+C to stop.`);
  if (args.includes('--open')) {
    if (process.platform === 'win32') execFile('cmd.exe',['/c','start','',instance.url],{windowsHide:true},error=>{if(error)console.error(`Open ${instance.url}`);});
  }
  let stopping = false;
  const stop = async()=>{if(stopping)return;stopping=true;await instance.close();process.exit(0);};
  process.on('SIGINT',stop);process.on('SIGTERM',stop);
  if (!process.stdin.isTTY) {process.stdin.setEncoding('utf8');process.stdin.on('data',v=>{if(v.trim()==='stop')void stop();});}
}
