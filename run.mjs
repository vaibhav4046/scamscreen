#!/usr/bin/env node
// ScamScreen local dev server - static files only, zero deps. Node 18+.
// The analysis itself is 100% client-side JavaScript; this server only serves files.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PORT = process.env.PORT || 4175;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css' };
http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let p = url.pathname === '/' ? '/index.html' : url.pathname;
  if (p.includes('..')) { res.writeHead(400); return res.end('nope'); }
  try {
    const data = await readFile(join(ROOT, 'public', p));
    res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404); res.end('not found'); }
}).listen(PORT, () => console.log(`ScamScreen at http://localhost:${PORT}`));
