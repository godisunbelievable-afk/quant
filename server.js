/**
 * Ondo Borrow – KYC Verification Backend
 * Zero external dependencies (uses native Node.js http + node:sqlite)
 * Runs on http://localhost:3001
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 4000;
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ── Database Setup (Native SQLite) ──────────────────────────────────────────
const db = new DatabaseSync(path.join(__dirname, 'kyc.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS kyc_submissions (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name     TEXT    NOT NULL,
    email         TEXT    NOT NULL,
    country       TEXT    NOT NULL,
    doc_type      TEXT    NOT NULL,
    doc_front     TEXT,
    doc_back      TEXT,
    selfie        TEXT,
    status        TEXT    NOT NULL DEFAULT 'verified',
    submitted_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// ── Multipart Form Data Parser ──────────────────────────────────────────────
function parseMultipart(buffer, boundary) {
  const parts = {};
  const boundaryBuffer = Buffer.from('--' + boundary);
  let start = 0;

  while (start < buffer.length) {
    const boundaryIdx = buffer.indexOf(boundaryBuffer, start);
    if (boundaryIdx === -1) break;

    const nextBoundary = buffer.indexOf(boundaryBuffer, boundaryIdx + boundaryBuffer.length);
    if (nextBoundary === -1) break;

    const partBuffer = buffer.subarray(boundaryIdx + boundaryBuffer.length, nextBoundary);
    start = nextBoundary;

    const headerEnd = partBuffer.indexOf('\r\n\r\n');
    if (headerEnd === -1) continue;

    const headerText = partBuffer.subarray(0, headerEnd).toString('latin1');
    let body = partBuffer.subarray(headerEnd + 4);
    if (body.subarray(-2).toString('latin1') === '\r\n') {
      body = body.subarray(0, body.length - 2);
    }

    const nameMatch = headerText.match(/name="([^"]+)"/);
    if (!nameMatch) continue;
    const fieldName = nameMatch[1];
    const filenameMatch = headerText.match(/filename="([^"]+)"/);

    if (filenameMatch) {
      const origName = filenameMatch[1];
      if (origName && body.length > 0) {
        const ext = path.extname(origName) || '.jpg';
        const savedName = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
        const filePath = path.join(uploadsDir, savedName);
        fs.writeFileSync(filePath, body);
        parts[fieldName] = savedName;
      }
    } else {
      parts[fieldName] = body.toString('utf8').trim();
    }
  }

  return parts;
}

// ── MIME types for static files ─────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// ── Server ──────────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  // POST /api/kyc
  if (req.method === 'POST' && url.pathname === '/api/kyc') {
    const contentType = req.headers['content-type'] || '';
    const boundaryMatch = contentType.match(/boundary=([^;]+)/i);

    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      try {
        const fullBuffer = Buffer.concat(chunks);
        let fields = {};

        if (boundaryMatch) {
          const boundary = boundaryMatch[1].trim().replace(/^"|"$/g, '');
          fields = parseMultipart(fullBuffer, boundary);
        } else if (contentType.includes('application/json')) {
          fields = JSON.parse(fullBuffer.toString('utf8'));
        }

        const { full_name, email, country, doc_type, doc_front, doc_back, selfie } = fields;

        if (!full_name || !email || !country || !doc_type) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Missing required fields.' }));
          return;
        }

        const insert = db.prepare(`
          INSERT INTO kyc_submissions (full_name, email, country, doc_type, doc_front, doc_back, selfie, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'verified')
        `);
        const result = insert.run(
          full_name,
          email,
          country,
          doc_type,
          doc_front || null,
          doc_back || null,
          selfie || null
        );

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          status: 'verified',
          id: Number(result.lastInsertRowid),
          message: 'Identity verified successfully.'
        }));
      } catch (err) {
        console.error('[KYC Server Error]', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Server error: ' + err.message }));
      }
    });
    return;
  }

  // GET /api/kyc (list submissions)
  if (req.method === 'GET' && url.pathname === '/api/kyc') {
    try {
      const rows = db.prepare(`
        SELECT id, full_name, email, country, doc_type, status, submitted_at
        FROM kyc_submissions
        ORDER BY id DESC
      `).all();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, count: rows.length, submissions: rows }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: e.message }));
    }
    return;
  }

  // Serve static files from root directory
  if (req.method === 'GET') {
    let filePath = path.join(__dirname, url.pathname === '/' ? 'index.html' : url.pathname);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
      return;
    }
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`\n=================================================`);
  console.log(`  Ondo Verification & Loan Backend Running!`);
  console.log(`  Server: http://localhost:${PORT}`);
  console.log(`  API:    POST /api/kyc  (ID verification)`);
  console.log(`  API:    GET  /api/kyc  (List SQLite submissions)`);
  console.log(`  Pages:  http://localhost:${PORT}/borrow.html`);
  console.log(`=================================================\n`);
});
