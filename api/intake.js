// SoHo Media House — intake form
// Submit → save to Supabase → client confirmation → (background) art direction + 3 concepts → emailed to team
import { waitUntil } from '@vercel/functions';
import { sb, updateRow, sendEmail, runDesignRound, missingEnv, clean, esc, SUPABASE_KEY, SUPABASE_URL, REPLY_INBOX } from './_lib/design.js';

const MAX_PER_IP_PER_HOUR = 3;
const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const missing = missingEnv();
  if (missing.length) {
    console.error('Missing env vars:', missing);
    return res.status(500).json({ error: 'Setup issue (code CFG). Please email hello@sohomediahouse.com.' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  if (clean(body.company_site)) return res.status(200).json({ ok: true }); // honeypot

  const lead = {
    first_name: clean(body.first_name, 100),
    last_name: clean(body.last_name, 100),
    business_name: clean(body.business_name, 200),
    email: clean(body.email, 200).toLowerCase(),
    phone: clean(body.phone, 50),
    current_website: clean(body.current_website, 300),
    service: clean(body.service, 100),
    style: clean(body.style, 100),
    brand_colors: clean(body.brand_colors, 200),
    inspiration: clean(body.inspiration, 400),
    goals: clean(body.goals, 3000),
    ip: String(req.headers['x-forwarded-for'] || '').split(',')[0].trim().slice(0, 64)
  };
  if (!lead.first_name || !isEmail(lead.email)) {
    return res.status(400).json({ error: 'Please enter your name and a valid email.' });
  }

  let step = 'RATE';
  try {
    if (lead.ip) {
      const since = new Date(Date.now() - 3600 * 1000).toISOString();
      const recent = await sb(`intake_submissions?select=id&ip=eq.${encodeURIComponent(lead.ip)}&created_at=gte.${encodeURIComponent(since)}`, { method: 'GET' });
      if (recent && recent.length >= MAX_PER_IP_PER_HOUR) {
        return res.status(429).json({ error: 'Too many submissions — please try again later.' });
      }
    }

    step = 'SAVE';
    const [row] = await sb('intake_submissions', { method: 'POST', body: JSON.stringify(lead) });
    lead.id = row.id;
    lead.redesign_token = row.redesign_token;

    try {
      await sendEmail({
        to: [lead.email],
        reply_to: REPLY_INBOX,
        subject: `We've got your project brief, ${lead.first_name}`,
        html: `<div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;color:#111">
          <h2 style="margin:0 0 12px">Thanks, ${esc(lead.first_name)} — your brief is in.</h2>
          <p style="font-size:15px;line-height:1.7">Our creative team is already building <b>three custom homepage concepts</b> for ${esc(lead.business_name || 'your business')} based on what you shared.</p>
          <p style="font-size:15px;line-height:1.7">Your concepts and custom proposal will arrive within 24 hours.</p>
          <p style="font-size:14px;line-height:1.7;color:#555">Service requested: ${esc(lead.service || 'To be determined')}</p>
          <p style="font-size:15px;margin-top:24px">— The SoHo Media House team<br><a href="https://sohomediahouse.com">sohomediahouse.com</a></p>
        </div>`
      });
      await updateRow(lead.id, { confirmation_sent_at: new Date().toISOString() });
    } catch (e) {
      console.error('confirmation email failed', e);
    }

    waitUntil(runDesignRound(lead, { round: 1 }));
    return res.status(200).json({ ok: true });
  } catch (err) {
    const msg = String(err.message || err);
    const hint = /Supabase 401|Supabase 403|Invalid API key|JWT/i.test(msg) ? 'KEY' : /fetch failed|ENOTFOUND|Invalid URL/i.test(msg) ? 'URL' : 'DB';
    let ref = 'unknown';
    try { ref = new URL(SUPABASE_URL).hostname.split('.')[0]; } catch {}
    console.error(`intake failed at ${step} project=${ref} keylen=${SUPABASE_KEY.length}`, msg.replace(/sb_[a-z]+_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9._-]+/g, '[key]'));
    return res.status(500).json({ error: `Something went wrong (code ${step}-${hint}). Please email hello@sohomediahouse.com.` });
  }
}
