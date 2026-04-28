const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3002;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
};

function serveFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
      return;
    }
    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-cache",
    });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // API endpoint
  if (pathname === "/api/videos") {
    const videosPath = path.join(__dirname, "..", "data", "videos.json");
    return serveFile(res, videosPath, MIME_TYPES[".json"]);
  }

  // Static files
  const publicDir = path.join(__dirname, "..", "public");

  if (pathname === "/" || pathname === "/index.html") {
    return serveFile(res, path.join(publicDir, "index.html"), MIME_TYPES[".html"]);
  }

  // Serve any file from public/
  const ext = path.extname(pathname);
  const mime = MIME_TYPES[ext] || "application/octet-stream";
  const safePath = path.join(publicDir, pathname);

  // Prevent directory traversal
  if (!safePath.startsWith(publicDir)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  serveFile(res, safePath, mime);
});

server.listen(PORT, () => {
  console.log(`\n  BattleBots YouTube Ranker`);
  console.log(`  http://localhost:${PORT}\n`);
});
