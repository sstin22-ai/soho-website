// Affiliate link: sohomediahouse.com/r/<code> → logs the click → remembers the affiliate 90 days → home page
import { sb, SUPABASE_KEY, SUPABASE_URL } from './_lib/design.js';

export default async function handler(req, res) {
  const url = new URL(req.url, 'https://sohomediahouse.com');
  const code = String(url.searchParams.get('c') || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40);
  let ok = false;
  if (code && SUPABASE_URL && SUPABASE_KEY) {
    try {
      const found = await sb(`affiliates?select=code&code=eq.${encodeURIComponent(code)}&status=eq.active`, { method: 'GET' });
      ok = Boolean(found && found.length);
      if (ok) await sb('affiliate_clicks', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ code, landing: String(req.headers.referer || '').slice(0, 300) }) });
    } catch (e) { console.error('ref click', e); }
  }
  if (ok) res.setHeader('Set-Cookie', `soho_ref=${code}; Path=/; Max-Age=7776000; SameSite=Lax; Secure`);
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Location', ok ? `/?ref=${code}` : '/');
  return res.status(302).end();
}
