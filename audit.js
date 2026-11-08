// SoHo Media House — free website audit (real data from Google PageSpeed Insights)
// POST { url } → runs a mobile Lighthouse test → returns real scores + top issues → logs to Supabase audit_requests
import { sb, clean, SUPABASE_KEY, SUPABASE_URL } from './_lib/design.js';

const MAX_PER_IP_PER_HOUR = 10;

function normalize(u) {
  let s = clean(u, 300);
  if (!s) return '';
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
  try {
    const x = new URL(s);
    if (!x.hostname.includes('.')) return '';
    return x.toString();
  } catch { return ''; }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const url = normalize(body.url);
  if (!url) return res.status(400).json({ error: 'Please enter a valid website address.' });

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim().slice(0, 64);
  const canLog = Boolean(SUPABASE_URL && SUPABASE_KEY);

  try {
    if (canLog && ip) {
      const since = new Date(Date.now() - 3600 * 1000).toISOString();
      const recent = await sb(`audit_requests?select=id&ip=eq.${encodeURIComponent(ip)}&created_at=gte.${encodeURIComponent(since)}`, { method: 'GET' });
      if (recent && recent.length >= MAX_PER_IP_PER_HOUR) {
        return res.status(429).json({ error: 'Audit limit reached — please try again in an hour.' });
      }
    }
  } catch (e) { console.error('audit rate check', e); }

  const q = new URLSearchParams({ url, strategy: 'mobile' });
  ['performance', 'seo', 'accessibility', 'best-practices'].forEach((c) => q.append('category', c));
  if (process.env.PAGESPEED_API_KEY) q.set('key', process.env.PAGESPEED_API_KEY);

  let data;
  try {
    const r = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${q}`);
    data = await r.json();
    if (!r.ok || !data.lighthouseResult) {
      const msg = data?.error?.message || 'The site could not be tested.';
      return res.status(502).json({ error: `We couldn't test that site: ${msg.slice(0, 160)}` });
    }
  } catch (e) {
    return res.status(502).json({ error: 'The test service is busy — please try again in a minute.' });
  }

  const lh = data.lighthouseResult;
  const pct = (k) => Math.round((lh.categories?.[k]?.score || 0) * 100);
  const scores = { performance: pct('performance'), seo: pct('seo'), accessibility: pct('accessibility'), best_practices: pct('best-practices') };
  const overall = Math.round((scores.performance + scores.seo + scores.accessibility + scores.best_practices) / 4);
  const https = String(lh.finalDisplayedUrl || lh.finalUrl || url).startsWith('https://');
  const loadTime = lh.audits?.['largest-contentful-paint']?.displayValue || '';

  // Top issues: failing audits that belong to a scored category, worst first
  const refs = new Set();
  Object.values(lh.categories || {}).forEach((c) => (c.auditRefs || []).forEach((a) => a.weight > 0 && refs.add(a.id)));
  const issues = Object.values(lh.audits || {})
    .filter((a) => refs.has(a.id) && typeof a.score === 'number' && a.score < 0.9)
    .sort((a, b) => a.score - b.score)
    .slice(0, 5)
    .map((a) => ({ title: a.title, value: a.displayValue || '' }));

  const result = { url, overall, scores, https, load_time: loadTime, issues };

  if (canLog) {
    try {
      await sb('audit_requests', { method: 'POST', body: JSON.stringify({ url, ip, overall, scores, issues, source: clean(body.source, 50) || 'web' }) });
    } catch (e) { console.error('audit log', e); }
  }

  return res.status(200).json(result);
}
