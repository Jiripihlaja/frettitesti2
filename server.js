// Happovaltteri-palvelin: tarjoilee dist-kansion ja pienen API:n pillerivalintojen tilastointiin.
// Tallennetaan vain valittu pilleri ja aikaleima. Ei IP-osoitteita, ei evästeitä.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const root = join(fileURLToPath(new URL('.', import.meta.url)), 'dist');
const port = Number(process.env.PORT) || 3000;
const { DATABASE_URL } = process.env;

const PILLS = ['red', 'green', 'blue'];

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

/* ------------------------------------------------------------------ */
/* Tietokanta                                                          */
/* ------------------------------------------------------------------ */

let pool = null;
let dbReady = false;

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS pill_choices (
     id BIGSERIAL PRIMARY KEY,
     pill TEXT NOT NULL CHECK (pill IN ('red', 'green', 'blue')),
     created_at TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
  'CREATE INDEX IF NOT EXISTS pill_choices_pill_idx ON pill_choices (pill)',
];

function initDb() {
  if (!DATABASE_URL) {
    console.warn('DATABASE_URL puuttuu: pilleritilastot ovat pois käytöstä.');
    return;
  }
  pool = new pg.Pool({ connectionString: DATABASE_URL, max: 5, connectionTimeoutMillis: 5000 });
  pool.on('error', (err) => console.error('Tietokantayhteyden virhe:', err.message));

  const attempt = async () => {
    try {
      for (const sql of SCHEMA) await pool.query(sql);
      dbReady = true;
      console.log('Tietokanta valmis.');
    } catch (err) {
      dbReady = false;
      console.error(`Tietokanta ei vastaa (${err.message}). Yritetään uudelleen 10 s kuluttua.`);
      setTimeout(attempt, 10_000);
    }
  };
  attempt();
}

let statsCache = { at: 0, data: null };

async function getStats() {
  if (statsCache.data && Date.now() - statsCache.at < 3000) return statsCache.data;
  const { rows } = await pool.query('SELECT pill, count(*)::int AS n FROM pill_choices GROUP BY pill');
  const counts = { red: 0, green: 0, blue: 0 };
  for (const r of rows) if (r.pill in counts) counts[r.pill] = r.n;
  const data = { enabled: true, total: counts.red + counts.green + counts.blue, counts };
  statsCache = { at: Date.now(), data };
  return data;
}

/* ------------------------------------------------------------------ */
/* Apufunktiot                                                         */
/* ------------------------------------------------------------------ */

const sendJson = (res, status, body) => {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(JSON.stringify(body));
};

// Muistinvarainen nopeusrajoitus (20 valintaa / min / osoite). Osoitetta ei tallenneta mihinkään.
const hits = new Map();
function rateLimited(ip, max = 20, windowMs = 60_000) {
  const now = Date.now();
  let entry = hits.get(ip);
  if (!entry || entry.reset < now) {
    entry = { n: 0, reset: now + windowMs };
    hits.set(ip, entry);
  }
  entry.n += 1;
  return entry.n > max;
}
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of hits) if (entry.reset < now) hits.delete(key);
}, 60_000).unref();

const clientIp = (req) => {
  const fwd = req.headers['x-forwarded-for'];
  return (fwd ? String(fwd).split(',')[0].trim() : req.socket.remoteAddress) || 'unknown';
};

function readJson(req, limit = 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let tooLarge = false;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        tooLarge = true;
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (tooLarge) return reject(Object.assign(new Error('too large'), { status: 413 }));
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch {
        reject(Object.assign(new Error('bad json'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

const exists = (p) => stat(p).catch(() => null);

/* ------------------------------------------------------------------ */
/* API                                                                 */
/* ------------------------------------------------------------------ */

async function handleApi(req, res, pathname) {
  if (pathname === '/api/stats') {
    if (req.method !== 'GET') return sendJson(res, 405, { error: 'method_not_allowed' });
    if (!dbReady) return sendJson(res, 503, { enabled: false });
    return sendJson(res, 200, await getStats());
  }

  if (pathname === '/api/pill') {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed' });
    if (!dbReady) return sendJson(res, 503, { enabled: false });
    if (rateLimited(clientIp(req))) return sendJson(res, 429, { error: 'too_many_requests' });
    const body = await readJson(req);
    if (typeof body.pill !== 'string' || !PILLS.includes(body.pill)) {
      return sendJson(res, 400, { error: 'invalid_pill' });
    }
    await pool.query('INSERT INTO pill_choices (pill) VALUES ($1)', [body.pill]);
    statsCache = { at: 0, data: null };
    return sendJson(res, 201, { ok: true });
  }

  return sendJson(res, 404, { error: 'not_found' });
}

/* ------------------------------------------------------------------ */
/* Palvelin                                                            */
/* ------------------------------------------------------------------ */

const server = createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, 'http://localhost');

    if (pathname.startsWith('/api/')) return await handleApi(req, res, pathname);

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' }).end('Method not allowed');
      return;
    }

    const safe = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
    let file = join(root, safe);
    if (!file.startsWith(root)) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    let info = await exists(file);
    if (info?.isDirectory()) {
      file = join(file, 'index.html');
      info = await exists(file);
    }
    if (!info) file = join(root, 'index.html'); // SPA-varasivu

    const body = await readFile(file);
    res.writeHead(200, {
      'Content-Type': types[extname(file)] || 'application/octet-stream',
      'Cache-Control': pathname.startsWith('/assets/')
        ? 'public, max-age=31536000, immutable'
        : 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(body);
  } catch (err) {
    const status = err.status || 500;
    if (status === 500) console.error(err);
    if (res.headersSent) return res.end();
    if (req.url?.startsWith('/api/')) return sendJson(res, status, { error: status === 500 ? 'server_error' : err.message });
    res.writeHead(status).end(status === 500 ? 'Server error' : err.message);
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Happovaltteri kuuntelee portissa ${port}`);
  initDb();
});

const shutdown = () => {
  server.close(() => (pool ? pool.end() : Promise.resolve()).finally(() => process.exit(0)));
  setTimeout(() => process.exit(0), 5000).unref();
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
