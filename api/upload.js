// SoHo Media House — brand asset upload (character art, logos, product photos)
// POST { dataUrl, name } → stores the image in Supabase Storage (public bucket "brand-assets") → { url }
import { SUPABASE_URL, SUPABASE_KEY, missingEnv } from './_lib/design.js';
import { randomUUID } from 'crypto';

const TYPES = { 'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg' };
const MAX_BYTES = 3 * 1024 * 1024;


export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (missingEnv().length) return res.status(500).json({ error: 'Setup issue (code CFG).' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const m = /^data:(image\/(?:webp|png|jpeg));base64,([A-Za-z0-9+/=]+)$/.exec(String(body.dataUrl || ''));
  if (!m) return res.status(400).json({ error: 'Please upload a PNG, JPG, or WebP image.' });

  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > MAX_BYTES) return res.status(413).json({ error: 'That image is too large — please keep each one under 3 MB.' });

  const path = `uploads/${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${TYPES[m[1]]}`;
  try {
    const r = await fetch(`${SUPABASE_URL}/storage/v1/object/brand-assets/${path}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        ...(SUPABASE_KEY.startsWith('eyJ') ? { Authorization: `Bearer ${SUPABASE_KEY}` } : {}),
        'Content-Type': m[1],
        'x-upsert': 'false',
        'cache-control': '31536000'
      },
      body: buf
    });
    if (!r.ok) throw new Error(`Storage ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return res.status(200).json({ url: `${SUPABASE_URL}/storage/v1/object/public/brand-assets/${path}` });
  } catch (e) {
    console.error('upload failed', e.message);
    return res.status(500).json({ error: 'Upload failed — please try again.' });
  }
}
