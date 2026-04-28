import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const publicDir = new URL('../public/', import.meta.url).pathname;
const dataDir = new URL('../data/', import.meta.url).pathname;
const port = Number(process.env.PORT || 3001);

createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/api/bots') {
    try {
      const data = await readFile(join(dataDir, 'bots.json'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(data);
    } catch {
      res.writeHead(500); return res.end('{"error":"Failed to load bot data"}');
    }
  }

  if (req.method === 'GET') {
    if (req.url === '/favicon.ico') { res.writeHead(204); return res.end(); }
    const safePath = decodeURIComponent((req.url === '/' ? '/index.html' : req.url).split('?')[0]).replace(/^\/+/, '');

    // Serve images from the main project's public/img/
    const mainImgDir = new URL('../../../public/img/', import.meta.url).pathname;
    const filePath = safePath.startsWith('img/') ? join(mainImgDir, safePath.slice(4)) : join(publicDir, safePath);

    try {
      const file = await readFile(filePath);
      const ext = extname(filePath);
      const ct = ext === '.css' ? 'text/css' : ext === '.js' ? 'text/javascript' : ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.json' ? 'application/json' : 'text/html';
      res.writeHead(200, { 'Content-Type': ct + '; charset=utf-8' });
      return res.end(file);
    } catch {
      res.writeHead(404); return res.end('Not found');
    }
  }

  res.writeHead(405); res.end('Method not allowed');
}).listen(port, () => console.log(`Bot Encyclopedia → http://localhost:${port}`));
