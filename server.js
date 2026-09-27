import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(root, 'public');

const envPath = path.join(root, '.env');
function settings() {
  const values = {};
  try {
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
      if (match) values[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  } catch { /* .env é opcional quando as variáveis vêm do ambiente */ }
  return {
    pexels: process.env.PEXELS_API_KEY || values.PEXELS_API_KEY || '',
    whatsapp: process.env.WHATSAPP_NUMBER || values.WHATSAPP_NUMBER || '',
    email: process.env.CONTACT_EMAIL || values.CONTACT_EMAIL || '',
    port: Number(process.env.PORT || values.PORT) || 3100
  };
}

const cache = new Map();
const mime = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.png': 'image/png'
};
const json = (res, status, data) => {
  res.writeHead(status, { 'Content-Type': mime['.json'], 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  const current = settings();
  if (url.pathname === '/api/config') {
    return json(res, 200, {
      whatsapp: current.whatsapp.replace(/\D/g, ''),
      email: current.email,
      photosEnabled: Boolean(current.pexels)
    });
  }
  if (url.pathname === '/api/photos') {
    if (!current.pexels) return json(res, 503, { error: 'PEXELS_API_KEY não configurada' });
    const query = (url.searchParams.get('query') || 'visual communication design').trim().slice(0, 80);
    if (!query) return json(res, 400, { error: 'Informe uma busca' });
    const cached = cache.get(query);
    if (cached && cached.expires > Date.now()) return json(res, 200, cached.data);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 9000);
      let response;
      try {
        response = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=9&orientation=landscape&locale=pt-BR`, {
          headers: { Authorization: current.pexels }, signal: controller.signal
        });
      } finally { clearTimeout(timeout); }
      if (!response.ok) return json(res, response.status === 429 ? 429 : 502, { error: 'Pexels indisponível no momento' });
      const body = await response.json();
      const data = { photos: body.photos.map(photo => ({
        id: photo.id, src: photo.src.large, alt: photo.alt || 'Foto profissional',
        photographer: photo.photographer, url: photo.url
      })) };
      cache.set(query, { data, expires: Date.now() + 24 * 60 * 60 * 1000 });
      return json(res, 200, data);
    } catch { return json(res, 502, { error: 'Falha ao consultar a Pexels' }); }
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { error: 'Método não permitido' });
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch { return json(res, 400, { error: 'Caminho inválido' }); }
  const filePath = path.resolve(publicDir, `.${pathname === '/' ? '/index.html' : pathname}`);
  if (!filePath.startsWith(publicDir + path.sep)) return json(res, 403, { error: 'Acesso negado' });
  fs.stat(filePath, (error, stat) => {
    if (error || !stat.isFile()) return json(res, 404, { error: 'Arquivo não encontrado' });
    res.writeHead(200, { 'Content-Type': mime[path.extname(filePath)] || 'application/octet-stream', 'Cache-Control': filePath.endsWith('.html') ? 'no-cache' : 'public, max-age=86400' });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(filePath).pipe(res);
  });
});

const port = settings().port;
server.listen(port, () => console.log(`Comunicação Visual Teste em http://localhost:${port}`));
