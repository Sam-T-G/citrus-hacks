import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs   from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';

const LOGS_DIR     = path.resolve(__dirname, 'logs');
const DATA_DIR     = path.resolve(__dirname, 'data');
const PATIENT_FILE = path.join(DATA_DIR, 'patient.json');

function alertFileName(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return path.join(LOGS_DIR, `alerts-${ymd}.ndjson`);
}

function logFileName(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return path.join(LOGS_DIR, `session-${ymd}.ndjson`);
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end',  ()    => resolve(data));
    req.on('error', reject);
  });
}

function json(res: ServerResponse, status: number, body: unknown) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) });
  res.end(payload);
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'mira-log-api',
      configureServer(server) {
        fs.mkdirSync(LOGS_DIR, { recursive: true });

        fs.mkdirSync(DATA_DIR, { recursive: true });

        server.middlewares.use(async (req, res, next) => {
          // GET /api/patient  — return full patient data store
          if (req.method === 'GET' && req.url === '/api/patient') {
            try {
              const data = fs.readFileSync(PATIENT_FILE, 'utf8');
              json(res, 200, JSON.parse(data));
            } catch (e) {
              json(res, 500, { error: String(e) });
            }
            return;
          }

          // PUT /api/patient  — save full patient data store
          if (req.method === 'PUT' && req.url === '/api/patient') {
            try {
              const body = await readBody(req);
              JSON.parse(body); // validate JSON
              fs.writeFileSync(PATIENT_FILE, body, 'utf8');
              json(res, 200, { ok: true });
            } catch (e) {
              json(res, 400, { error: String(e) });
            }
            return;
          }

          // POST /api/log  — append one event to today's NDJSON file
          if (req.method === 'POST' && req.url === '/api/log') {
            try {
              const body  = await readBody(req);
              const event = JSON.parse(body);
              fs.appendFileSync(logFileName(), JSON.stringify(event) + '\n', 'utf8');
              json(res, 200, { ok: true });
            } catch (e) {
              json(res, 400, { error: String(e) });
            }
            return;
          }

          // GET /api/logs?limit=200  — tail recent events from today's file
          if (req.method === 'GET' && req.url?.startsWith('/api/logs')) {
            try {
              const url    = new URL(req.url, 'http://localhost');
              const limit  = parseInt(url.searchParams.get('limit') ?? '200', 10);
              const file   = logFileName();
              if (!fs.existsSync(file)) { json(res, 200, []); return; }
              const lines  = fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean);
              const events = lines.slice(-limit).map(l => JSON.parse(l));
              json(res, 200, events);
            } catch (e) {
              json(res, 500, { error: String(e) });
            }
            return;
          }

          // POST /api/alert — write to dedicated high-priority alert log
          if (req.method === 'POST' && req.url === '/api/alert') {
            try {
              const body  = await readBody(req);
              const alert = JSON.parse(body);
              fs.appendFileSync(alertFileName(), JSON.stringify(alert) + '\n', 'utf8');
              json(res, 200, { ok: true });
            } catch (e) {
              json(res, 400, { error: String(e) });
            }
            return;
          }

          // GET /api/alerts?limit=50 — recent high-priority alerts
          if (req.method === 'GET' && req.url?.startsWith('/api/alerts')) {
            try {
              const url   = new URL(req.url, 'http://localhost');
              const limit = parseInt(url.searchParams.get('limit') ?? '50', 10);
              const file  = alertFileName();
              if (!fs.existsSync(file)) { json(res, 200, []); return; }
              const lines  = fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean);
              const alerts = lines.slice(-limit).map(l => JSON.parse(l));
              json(res, 200, alerts);
            } catch (e) {
              json(res, 500, { error: String(e) });
            }
            return;
          }

          next();
        });
      },
    },
  ],
  server: { port: 5173 },
});
