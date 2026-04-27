import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { predict, ROSTER } from './copilot.js';

const publicDir = new URL('../public/', import.meta.url).pathname;
const port = Number(process.env.PORT || 3000);

export function createApp() {
  return createServer(async (req, res) => {
    // API: get bot roster
    if (req.method === 'GET' && req.url === '/api/roster') {
      return json(res, 200, { ok: true, roster: ROSTER });
    }

    // API: head-to-head prediction
    if (req.method === 'POST' && req.url === '/api/predict') {
      const body = await readBody(req);
      const result = await predict(body.botA, body.botB, {
        apiToken: process.env.BRIGHT_DATA_API_TOKEN,
        zone: process.env.BRIGHT_DATA_SERP_ZONE,
        llmApiKey: process.env.LLM_API_KEY || process.env.OPENAI_API_KEY,
        llmModel: process.env.LLM_MODEL,
        llmBaseUrl: process.env.LLM_BASE_URL || undefined,
      });
      return json(res, result.statusCode || 200, result);
    }

    // Static files
    if (req.method === 'GET') {
      if (req.url === '/favicon.ico') { res.writeHead(204); return res.end(); }
      return serveStatic(req.url === '/' ? '/index.html' : req.url, res);
    }

    json(res, 405, { ok: false, error: 'Method not allowed.' });
  });
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); }
  catch { return {}; }
}

async function serveStatic(url, res) {
  const safePath = decodeURIComponent(url.split('?')[0]).replace(/^\/+/, '');
  const filePath = join(publicDir, safePath);
  try {
    const file = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': mime(filePath) });
    res.end(file);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
}

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data, null, 2));
}

function mime(path) {
  const ext = extname(path);
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.js') return 'text/javascript; charset=utf-8';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.svg') return 'image/svg+xml';
  return 'text/html; charset=utf-8';
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  createApp().listen(port, () => {
    console.log(`BattleBots Head-to-Head → http://localhost:${port}`);
  });
}
