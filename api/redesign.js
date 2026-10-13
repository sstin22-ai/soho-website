// SoHo Media House — redesign request
// POST { id, t, base: 'fresh'|'a'|'b'|'c', feedback, inspiration } → new round of 3 concepts emailed to team
import { waitUntil } from '@vercel/functions';
import { sb, updateRow, sendEmail, runDesignRound, missingEnv, clean, esc, deliveryDate, REPLY_INBOX } from './_lib/design.js';

const MAX_ROUNDS = 5; // caps cost per client

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (missingEnv().length) return res.status(500).json({ error: 'Setup issue (code CFG). Please email hello@sohomediahouse.com.' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const id = clean(body.id, 64);
  const token = clean(body.t, 64);
  const base = ['a', 'b', 'c'].includes(body.base) ? body.base : 'fresh';
  const feedback = clean(body.feedback, 2000);
  const inspiration = clean(body.inspiration, 400);

  if (!/^[0-9a-f-]{36}$/i.test(id) || !token) return res.status(400).json({ error: 'This redesign link is invalid.' });
  if (feedback.length < 10) return res.status(400).json({ error: 'Tell us a little more about what you would like changed.' });

  try {
    const rows = await sb(`intake_submissions?select=*&id=eq.${id}&redesign_token=eq.${encodeURIComponent(token)}`, { method: 'GET' });
    const lead = rows && rows[0];
    if (!lead) return res.status(404).json({ error: 'This redesign link is invalid or expired.' });
    if (/^(generating|redesigning)/.test(lead.status || '')) return res.status(409).json({ error: 'A new round is already being designed — it will arrive shortly.' });
    if ((lead.round || 1) >= MAX_ROUNDS) return res.status(429).json({ error: 'You have reached the maximum number of redesign rounds. Please email hello@sohomediahouse.com.' });

    const round = (lead.round || 1) + 1;
    const baseMockup = base !== 'fresh' ? (lead.mockups || []).find((m) => m.key === base) : null;
    if (inspiration) lead.inspiration = [lead.inspiration, inspiration].filter(Boolean).join(' · ');

    const revisions = [...(lead.revisions || []), { round, base, feedback, inspiration, at: new Date().toISOString() }];
    await updateRow(lead.id, { revisions, inspiration: lead.inspiration, status: `redesigning_r${round}` });

    await sendEmail({
      to: [lead.email],
      reply_to: REPLY_INBOX,
      subject: `Your redesign is underway, ${lead.first_name}`,
      html: `<div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;color:#111">
        <h2 style="margin:0 0 12px">Got it, ${esc(lead.first_name)} — round ${round} is in the studio.</h2>
        <p style="font-size:15px;line-height:1.7">We're designing three fresh concepts for ${esc(lead.business_name || 'your brand')} based on your notes:</p>
        <p style="font-size:14px;line-height:1.7;background:#fff3ee;padding:10px 12px;border-radius:8px">${esc(feedback)}</p>
        <p style="font-size:15px;line-height:1.7">Expect your new concepts by <b>${deliveryDate()}</b> — within 48 hours. If that lands on a Sunday or federal holiday, it rolls to the next business day.</p>
        <p style="font-size:15px;margin-top:24px">— The SoHo Media House team</p>
      </div>`
    }).catch((e) => console.error('redesign confirmation failed', e));

    waitUntil(runDesignRound(lead, { round, feedback, baseDirection: baseMockup ? baseMockup.direction : null }));
    return res.status(200).json({ ok: true, round, eta: deliveryDate() });
  } catch (err) {
    console.error('redesign failed', String(err.message || err).replace(/sb_[a-z]+_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9._-]+/g, '[key]'));
    return res.status(500).json({ error: 'Something went wrong. Please email hello@sohomediahouse.com.' });
  }
}
