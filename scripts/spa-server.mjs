#!/usr/bin/env node
/**
 * Minimal static file server with SPA history fallback.
 *
 * Needed because `python3 -m http.server` 404s on client-side routes, which
 * makes a prebuilt Vite SPA look broken when it is not.
 *
 * Usage: node scripts/spa-server.mjs <root> [port]
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, resolve, normalize } from 'node:path';

const root = resolve(process.argv[2] || '.');
const port = Number(process.argv[3] || 4620);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff2': 'font/woff2',
};

const send = (res, code, body, type) => {
  res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(body);
};

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  // normalize away any ../ traversal before touching the filesystem
  const rel = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
  let file = join(root, rel);

  try {
    const s = await stat(file);
    if (s.isDirectory()) file = join(file, 'index.html');
    const body = await readFile(file);
    return send(res, 200, body, TYPES[extname(file)] || 'application/octet-stream');
  } catch {
    // history fallback: any unknown path serves the shell so the router can act
    if (!extname(rel)) {
      try {
        return send(res, 200, await readFile(join(root, 'index.html')), TYPES['.html']);
      } catch { /* fall through */ }
    }
    return send(res, 404, 'not found', 'text/plain');
  }
}).listen(port, () => console.log(`serving ${root} on http://localhost:${port} (SPA fallback on)`));
