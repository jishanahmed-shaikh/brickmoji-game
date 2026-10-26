// Tiny static file server. Usage: node scripts/serve.mjs <dir>
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';

const root = process.argv[2] ?? 'dist';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg' };

function findPort(start, cb) {
  const srv = createServer();
  srv.once('error', () => findPort(start + 1, cb));
  srv.listen(start, () => srv.close(() => cb(start)));
}

findPort(8090, (port) => {
  const server = createServer(async (req, res) => {
    try {
      let path = join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
      const s = await stat(path).catch(() => null);
      if (!s || s.isDirectory()) path = join(root, 'index.html');
      const body = await readFile(path);
      res.writeHead(200, { 'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end('not found');
    }
  });
  server.listen(port, () => console.log(`[serve] http://localhost:${port}`));
});
