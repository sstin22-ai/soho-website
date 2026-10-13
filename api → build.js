// SoHo Media House — builds ONE concept in its own function call (own 300s window)
// POST (from the pipeline) or GET (the "Rebuild" link in the team email for a failed concept)
import { waitUntil } from '@vercel/functions';
import { sb, updateRow, buildConcept, missingEnv } from './_lib/design.js';

const page = (title, msg) => `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0a0a0f;color:#fff;font-family:'Segoe UI',system-ui,sans-serif;padding:24px}
.c{max-width:480px;text-align:center}.b{font-family:Georgia,serif;letter-spacing:.18em;text-transform:uppercase;color:#C9A96E;font-size:13px;margin-bottom:18px}
h1{font-family:Georgia,serif;font-weight:400;font-size:30px;margin:0 0 10px}p{color:rgba(255,255,255,.6);line-height:1.7;margin:0}</style></head>
<body><div class="c"><div class="b">SoHo Media House</div><h1>${title}</h1><p>${msg}</p></div></body></html>`;

export default async function handler(req, res) {
  const isGet = req.method === 'GET';
  if (!isGet && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (missingEnv().length) return res.status(500).json({ error: 'CFG' });

  const src = isGet ? req.query || {} : (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {});
  const id = String(src.id || '');
  const round = parseInt(src.round, 10);
  const key = String(src.key || '');
  const token = String(src.t || '');
  const bad = () => isGet
    ? res.status(400).setHeader('Content-Type', 'text/html').send(page('Link not valid', 'This rebuild link is incomplete or expired.'))
    : res.status(400).json({ error: 'bad request' });
  if (!/^[0-9a-f-]{36}$/i.test(id) || !['a', 'b', 'c'].includes(key) || !(round >= 1)) return bad();

  const rows = await sb(`intake_submissions?select=id,status&id=eq.${id}&redesign_token=eq.${encodeURIComponent(token)}`, { method: 'GET' });
  if (!rows || !rows.length) return isGet ? bad() : res.status(403).json({ error: 'forbidden' });

  if (isGet) {
    // Rebuild a failed concept: reopen it and its round, then build
    const [concept] = await sb(`intake_concepts?select=id,name,status&submission_id=eq.${id}&round=eq.${round}&key=eq.${key}`, { method: 'GET' });
    if (!concept) return bad();
    if (concept.status === 'building') {
      return res.status(200).setHeader('Content-Type', 'text/html').send(page('Already in the studio', `${concept.name} is being built right now. Watch your inbox.`));
    }
    await sb(`intake_concepts?id=eq.${concept.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'building', error: null }) });
    await updateRow(id, { status: `building_r${round}` });
    waitUntil(buildConcept(id, round, key).catch((e) => console.error('buildConcept failed', e)));
    return res.status(200).setHeader('Content-Type', 'text/html').send(page('Rebuilding now ↻', `${concept.name} is back in the studio. When it's finished you'll get a fresh email with every completed concept from this round attached — usually 3–5 minutes.`));
  }

  waitUntil(buildConcept(id, round, key).catch((e) => console.error('buildConcept failed', e)));
  return res.status(202).json({ ok: true });
}
