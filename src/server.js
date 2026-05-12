import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { predict, ROSTER, SUGGESTED_MATCHUPS } from './copilot.js';
import { getMatchupHistory, getPopularMatchups, ensureIndexes } from './db.js';

const publicDir = new URL('../public/', import.meta.url).pathname;
const port = Number(process.env.PORT || 3000);

const llmOptions = () => ({
  apiToken: process.env.BRIGHT_DATA_API_TOKEN,
  zone: process.env.BRIGHT_DATA_SERP_ZONE,
  llmApiKey: process.env.LLM_API_KEY || process.env.OPENAI_API_KEY,
  llmModel: process.env.LLM_MODEL,
  llmBaseUrl: process.env.LLM_BASE_URL || undefined,
  mongodbUri: process.env.MONGODB_URI || undefined,
});

export function createApp() {
  return createServer(async (req, res) => {
    // API: roster + suggested matchups
    if (req.method === 'GET' && req.url === '/api/roster') {
      return json(res, 200, { ok: true, roster: ROSTER, suggested: SUGGESTED_MATCHUPS });
    }

    // API: matchup history
    if (req.method === 'GET' && req.url?.startsWith('/api/history')) {
      const uri = process.env.MONGODB_URI;
      if (!uri) return json(res, 503, { ok: false, error: 'Database not configured' });
      const params = new URL(req.url, `http://localhost`).searchParams;
      const type = params.get('type') || 'recent';
      const limit = Math.min(parseInt(params.get('limit') || '20', 10), 50);
      if (type === 'popular') {
        const popular = await getPopularMatchups(uri, { limit });
        return json(res, 200, { ok: true, popular });
      }
      const history = await getMatchupHistory(uri, { limit });
      return json(res, 200, { ok: true, history });
    }

    // API: streaming prediction (NDJSON)
    if (req.method === 'POST' && req.url === '/api/predict-stream') {
      const body = await readBody(req);
      res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });

      const emit = (event) => {
        res.write(JSON.stringify(event) + '\n');
      };

      try {
        await predict(body.botA, body.botB, llmOptions(), emit);
      } catch (err) {
        emit({ type: 'error', error: err.message });
      }
      res.end();
      return;
    }

    // API: non-streaming prediction (backward compat)
    if (req.method === 'POST' && req.url === '/api/predict') {
      const body = await readBody(req);
      const result = await predict(body.botA, body.botB, llmOptions());
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
  return 'text/html; charset=utf-8';
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  createApp().listen(port, () => {
    console.log(`BattleBots Head-to-Head → http://localhost:${port}`);
    // Create indexes in background (non-blocking)
    if (process.env.MONGODB_URI) {
      ensureIndexes(process.env.MONGODB_URI)
        .then(() => console.log('[db] MongoDB connected, indexes ready'))
        .catch((err) => console.warn('[db] MongoDB setup skipped:', err.message));
    }
  });
}
