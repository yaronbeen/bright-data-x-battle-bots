const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3004;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function serveStatic(res, filePath) {
  const ext = path.extname(filePath);
  const mime = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // API: articles
  if (pathname === '/api/articles') {
    const articlesPath = path.join(__dirname, '..', 'data', 'articles.json');
    serveStatic(res, articlesPath);
    return;
  }

  // Serve index.html for root
  if (pathname === '/') {
    serveStatic(res, path.join(__dirname, '..', 'public', 'index.html'));
    return;
  }

  // Static files
  const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(__dirname, '..', 'public', safePath);
  serveStatic(res, filePath);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🤖 BattleBots News Hub running at http://localhost:${PORT}`);
});
