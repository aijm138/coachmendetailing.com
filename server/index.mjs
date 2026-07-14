/**
 * Production server for Coachmen Detailing
 *
 * - Serves the built static files from ../dist
 * - Proxies /api/contacts to the Resend Contacts API
 *
 * Usage:
 *   RESEND_API_KEY=re_xxxxx node server/index.mjs
 *
 * For development, the Vite dev server proxies /api to this server
 * (see vite.config.ts).  Start both:
 *   node server/index.mjs   (or: npm run server)
 *   npm run dev             (or: npm run dev:vite)
 */

import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */

const PORT = Number(process.env.PORT) || 3_001;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const DIST = join(__dirname, '..', 'dist');
const IS_DEV = process.env.NODE_ENV !== 'production';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.webp': 'image/webp',
  '.woff2':'font/woff2',
} satisfies Record<string, string>;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function sendJSON(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': IS_DEV ? '*' : undefined,
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function serveStatic(url) {
  // Map URL to file path (SPA fallback to index.html)
  let filePath = url === '/' ? '/index.html' : url;
  const fullPath = join(DIST, filePath);

  if (!existsSync(fullPath)) {
    // SPA fallback – serve index.html for non-API, non-file routes
    if (!extname(url)) {
      const indexPath = join(DIST, 'index.html');
      if (existsSync(indexPath)) {
        return {
          body: readFileSync(indexPath),
          type: MIME['.html'] ?? 'text/html',
        };
      }
    }
    return null;
  }

  const ext = extname(fullPath).toLowerCase();
  return {
    body: readFileSync(fullPath),
    type: MIME[ext] ?? 'application/octet-stream',
  };
}

/* ------------------------------------------------------------------ */
/*  Resend API handler                                                 */
/* ------------------------------------------------------------------ */

async function handleContacts(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    sendJSON(res, 405, { error: 'Method not allowed' });
    return;
  }

  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY environment variable is not set');
    sendJSON(res, 500, { error: 'Server not configured for sign-ups' });
    return;
  }

  let body;
  try {
    body = await readBody(req);
  } catch {
    sendJSON(res, 400, { error: 'Invalid request body' });
    return;
  }

  const email = body?.email?.trim();
  if (!email) {
    sendJSON(res, 400, { error: 'Email is required' });
    return;
  }

  try {
    const apiRes = await fetch('https://api.resend.com/contacts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        first_name: body.first_name ?? '',
        last_name:  body.last_name ?? '',
        unsubscribed: false,
      }),
    });

    const data = await apiRes.json();
    sendJSON(res, apiRes.status, data);
  } catch (err) {
    console.error('Resend API error:', err);
    sendJSON(res, 502, { error: 'Failed to reach contact service' });
  }
}

/* ------------------------------------------------------------------ */
/*  Server                                                             */
/* ------------------------------------------------------------------ */

const server = createServer(async (req, res) => {
  const { url, method } = req;

  // --- API routes ---------------------------------------------------
  if (url === '/api/contacts') {
    return handleContacts(req, res);
  }

  // --- Static files (production only) --------------------------------
  if (!IS_DEV) {
    const asset = serveStatic(url);
    if (asset) {
      res.writeHead(200, { 'Content-Type': asset.type });
      res.end(asset.body);
      return;
    }
  }

  // --- Fallback 404 for API, 404 for everything else in prod ---------
  if (url?.startsWith('/api/')) {
    sendJSON(res, 404, { error: 'Not found' });
  } else if (!IS_DEV) {
    const indexPath = join(DIST, 'index.html');
    if (existsSync(indexPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(readFileSync(indexPath));
    } else {
      sendJSON(res, 404, { error: 'Not found' });
    }
  } else {
    // In dev, non-API requests are handled by Vite's dev server
    sendJSON(res, 404, { error: 'Not found' });
  }
});

server.listen(PORT, () => {
  const mode = IS_DEV ? 'development' : 'production';
  console.log(`[server] ${mode} — http://localhost:${PORT}`);
  if (!RESEND_API_KEY) {
    console.warn('[server] WARNING: RESEND_API_KEY is not set. Contact sign-ups will fail.');
  }
});
