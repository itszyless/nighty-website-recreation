import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 5175);
const pages = new Map([['/', 'home'], ['/commands', 'commands'], ['/get-links', 'get-links'], ['/terms-of-service', 'terms-of-service']]);
const types = { '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.webm': 'video/webm', '.json': 'application/json; charset=utf-8', '.html': 'text/html; charset=utf-8' };

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const route = decodeURIComponent(url.pathname).replace(/\/$/, '') || '/';
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    // The replica never sends keys, analytics, or API calls to the original site.
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; media-src 'self' blob:; connect-src 'self'; frame-src https://www.youtube.com https://www.youtube-nocookie.com; object-src 'none'; base-uri 'self'; form-action 'self'");
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Local preview. License verification is not connected.' }));
    }
    if (route === '/get-links/discord') {
      res.writeHead(307, { Location: '/get-links' });
      return res.end();
    }
    if (route === '/get-links/download') {
      res.writeHead(401, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Unauthorized');
    }
    let filename;
    let status = 200;
    if (route === '/commands/get') filename = path.join(root, 'data', 'commands.json');
    else if (pages.has(route)) filename = path.join(root, 'pages', `${pages.get(route)}.html`);
    else if (route === '/local-runtime.js') filename = path.join(root, 'local-runtime.js');
    else {
      const asset = route === '/_next/image' ? url.searchParams.get('url') : route;
      filename = path.resolve(root, 'public', `.${asset || ''}`);
      if (!filename.startsWith(path.join(root, 'public') + path.sep)) {
        res.writeHead(400); return res.end();
      }
      try { if (!(await stat(filename)).isFile()) throw new Error('Not a file'); }
      catch { filename = path.join(root, 'pages', '404.html'); status = 404; }
    }
    const body = await readFile(filename);
    const contentType = types[path.extname(filename)] || 'application/octet-stream';
    const range = req.headers.range;
    if (range && /^(video|audio)\//.test(contentType)) {
      const match = /^bytes=(\d+)-(\d*)$/.exec(range);
      if (match) {
        const start = Number(match[1]);
        const end = Math.min(match[2] ? Number(match[2]) : body.length - 1, body.length - 1);
        if (start > end) { res.writeHead(416, { 'Content-Range': `bytes */${body.length}` }); return res.end(); }
        res.writeHead(206, { 'Content-Type': contentType, 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${start}-${end}/${body.length}`, 'Content-Length': end - start + 1 });
        return res.end(req.method === 'HEAD' ? undefined : body.subarray(start, end + 1));
      }
    }
    res.writeHead(status, { 'Content-Type': contentType, 'Content-Length': body.length, 'Cache-Control': contentType.startsWith('text/html') ? 'no-cache' : 'public, max-age=3600', 'Accept-Ranges': 'bytes' });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {
    res.writeHead(500, { 'Content-Type': 'text/plain' }); res.end('Unable to load this local page.');
  }
}).listen(port, '127.0.0.1', () => console.log(`Nighty local recreation: http://localhost:${port}`));
