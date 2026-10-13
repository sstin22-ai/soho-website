// SoHo Media House — builds ONE concept in its own function call (own 300s window)
import { waitUntil } from '@vercel/functions';
import { sb, buildConcept, missingEnv } from './_lib/design.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (missingEnv().length) return res.status(500).json({ error: 'CFG' });
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const id = String(body.id || '');
  const round = parseInt(body.round, 10);
  const key = String(body.key || '');
  if (!/^[0-9a-f-]{36}$/i.test(id) || !['a', 'b', 'c'].includes(key) || !(round >= 1)) return res.status(400).json({ error: 'bad request' });

  // Only the pipeline (which knows the secret token) can trigger builds
  const rows = await sb(`intake_submissions?select=id&id=eq.${id}&redesign_token=eq.${encodeURIComponent(String(body.t || ''))}`, { method: 'GET' });
  if (!rows || !rows.length) return res.status(403).json({ error: 'forbidden' });

  waitUntil(buildConcept(id, round, key).catch((e) => console.error('buildConcept failed', e)));
  return res.status(202).json({ ok: true });
}
