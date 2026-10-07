const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../dist');
const types = {
  '.html': 'text/html',
  '.wasm': 'application/wasm',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};
http
  .createServer((req, res) => {
    const pathname = decodeURIComponent(
      new URL(req.url, 'http://localhost').pathname,
    );
    let file = path.resolve(root, `.${pathname}`);
    if (!file.startsWith(`${root}${path.sep}`) && file !== root) {
      res.writeHead(403);
      res.end();
      return;
    }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory())
      file = path.join(file, 'index.html');
    if (!fs.existsSync(file) && !path.extname(pathname))
      file = fs.existsSync(`${file}.html`)
        ? `${file}.html`
        : path.join(root, 'index.html');
    if (!fs.existsSync(file)) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.writeHead(200, {
      'Content-Type': types[path.extname(file)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    });
    fs.createReadStream(file).pipe(res);
  })
  .listen(4173, 'localhost');
