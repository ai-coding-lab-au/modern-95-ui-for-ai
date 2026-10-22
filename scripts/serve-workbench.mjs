import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../assets/starter/serve.mjs';

const assetRoot = fileURLToPath(new URL('../assets/', import.meta.url));
export async function serveWorkbench({ port = 55198 } = {}) {
  const instance = await serve({ port, root: assetRoot });
  return { ...instance, entryUrl: `${instance.url}/design-lab/dist/workbench.html` };
}

export function parseOptions(args) {
  const options = { port: 55198, open: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--open') options.open = true;
    else if (args[i] === '--port' && /^\d+$/.test(args[i + 1] || '')) {
      options.port = Number(args[++i]);
      if (options.port > 65535) throw new Error('Port must be between 0 and 65535.');
    } else throw new Error('Usage: node scripts/serve-workbench.mjs [--port 55198] [--open]');
  }
  return options;
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const instance = await serveWorkbench(options);
  console.log(`Modern 95 UI for AI / Preferred workbench\n${instance.entryUrl}\nPID ${process.pid}\nSynthetic data resets on reload. Ctrl+C to stop.`);
  if (options.open) {
    const command = process.platform === 'win32' ? ['cmd.exe', ['/c', 'start', '', instance.entryUrl]]
      : process.platform === 'darwin' ? ['open', [instance.entryUrl]] : ['xdg-open', [instance.entryUrl]];
    execFile(command[0], command[1], { windowsHide: true }, error => { if (error) console.error(`Open this URL in your browser: ${instance.entryUrl}`); });
  }
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    try { await instance.close(); process.exitCode = 0; }
    catch (error) { console.error(error.message); process.exitCode = 1; }
    finally { process.stdin.pause(); }
  };
  process.on('SIGINT', () => void stop());
  process.on('SIGTERM', () => void stop());
  if (!process.stdin.isTTY) {
    let input = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => {
      input += chunk;
      const lines = input.split(/\r?\n/);
      input = lines.pop();
      if (lines.some(line => line.trim() === 'stop')) void stop();
    });
    process.stdin.on('end', () => { if (input.trim() === 'stop') void stop(); });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.code === 'EADDRINUSE' ? 'Port is already in use. Choose another --port or stop your earlier preview.' : error.message); process.exitCode = 1; });
}
