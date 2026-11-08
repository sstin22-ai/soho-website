// Partner Program sign-up: creates an affiliate, emails their link, alerts the team
import { sb, sendEmail, clean, esc, missingEnv, REPLY_INBOX, TEAM_INBOX } from './_lib/design.js';

const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const SITE = 'https://sohomediahouse.com';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (missingEnv().length) return res.status(500).json({ error: 'Setup issue. Please email hello@sohomediahouse.com.' });
  const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  if (clean(b.company_site)) return res.status(200).json({ ok: true }); // honeypot

  const name = clean(b.name, 120), email = clean(b.email, 200).toLowerCase(), phone = clean(b.phone, 50);
  const payout = clean(b.payout_method, 80);
  if (!name || !isEmail(email)) return res.status(400).json({ error: 'Please enter your name and a valid email.' });
  if (b.agree !== true) return res.status(400).json({ error: 'Please accept the program terms.' });

  try {
    const existing = await sb(`affiliates?select=code,status&email=eq.${encodeURIComponent(email)}`, { method: 'GET' });
    let code = existing && existing[0] && existing[0].code;
    if (!code) {
      const base = (name.split(/\s+/)[0] || 'partner').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) || 'partner';
      code = base;
      for (let i = 0; i < 6; i++) {
        const taken = await sb(`affiliates?select=id&code=eq.${code}`, { method: 'GET' });
        if (!taken.length) break;
        code = base + Math.random().toString(36).slice(2, 5);
      }
      await sb('affiliates', { method: 'POST', body: JSON.stringify({ name, email, phone, code, payout_method: payout, terms_accepted_at: new Date().toISOString() }) });
    }
    const link = `${SITE}/r/${code}`;
    await sendEmail({
      to: [email], reply_to: REPLY_INBOX,
      subject: 'Your SoHo Media House partner link',
      html: `<div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;color:#111">
        <h2 style="margin:0 0 12px">Welcome, ${esc(name.split(' ')[0])}.</h2>
        <p style="line-height:1.7">Here is your personal link:</p>
        <p style="font-size:17px"><a href="${link}">${link}</a></p>
        <p style="line-height:1.7">When someone uses your link and becomes a website client, you earn <b>$500</b>. It's paid after we receive the client's <b>$1,000</b> down payment.</p>
        <p style="line-height:1.7">Tip: open <a href="${SITE}/?mycode=${code}">this link</a> once on each phone or computer you use. After that, the <b>Share</b> button on our site sends your partner link automatically.</p>
        <p style="line-height:1.7;font-size:14px;color:#555">When you share your link, say that you earn a referral fee (for example: "I get a referral fee if you sign up"). We'll ask for a W-9 before your first payout.</p>
        <p>— SoHo Media House</p></div>`
    });
    try {
      await sendEmail({ to: TEAM_INBOX, subject: `New partner: ${name}`, html: `<p>${esc(name)} · ${esc(email)} · ${esc(phone)} · payout: ${esc(payout)}<br>Link: ${link}</p>` });
    } catch (e) { console.error('team alert', e); }
    return res.status(200).json({ ok: true, link });
  } catch (e) {
    console.error('partner signup', e);
    return res.status(500).json({ error: 'Something went wrong. Please email hello@sohomediahouse.com.' });
  }
}
