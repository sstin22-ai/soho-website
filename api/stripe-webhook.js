// Stripe webhook — $1,000 non-refundable website deposit
// checkout.session.completed (paid, $1,000) → mark the client's brief deposit-paid
// → if an affiliate referred them: referral = deposit_paid, $500 commission = owed, email the affiliate + team.
// Match order: client_reference_id (= intake id, add ?client_reference_id=<id> to the payment link) → customer email.
import crypto from 'node:crypto';
import { sb, sendEmail, esc, REPLY_INBOX, TEAM_INBOX } from './_lib/design.js';

export const config = { api: { bodyParser: false } };
const DEPOSIT_CENTS = 100000;

async function rawBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(typeof c === 'string' ? Buffer.from(c) : c);
  return Buffer.concat(chunks);
}

function verify(raw, header, secret) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(',').map((p) => { const i = p.indexOf('='); return [p.slice(0, i), p.slice(i + 1)]; }));
  const sigs = header.split(',').filter((p) => p.startsWith('v1=')).map((p) => p.slice(3));
  const t = Number(parts.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > 300) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${t}.${raw.toString('utf8')}`).digest('hex');
  return sigs.some((s) => s.length === expected.length && crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expected)));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const raw = await rawBody(req);
  if (!verify(raw, req.headers['stripe-signature'], (process.env.STRIPE_WEBHOOK_SECRET || '').trim())) {
    return res.status(400).json({ error: 'bad signature' });
  }
  const event = JSON.parse(raw.toString('utf8'));

  // Idempotency: Stripe can resend the same event
  try { await sb('stripe_events', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ id: event.id, type: event.type, payload: event.data?.object || {} }) }); }
  catch (e) { if (/23505|duplicate/i.test(String(e.message))) return res.status(200).json({ ok: true, duplicate: true }); throw e; }

  if (event.type !== 'checkout.session.completed') return res.status(200).json({ ok: true, ignored: event.type });
  const s = event.data.object;
  if (s.payment_status !== 'paid' || s.amount_total !== DEPOSIT_CENTS) return res.status(200).json({ ok: true, ignored: 'not a $1,000 deposit' });

  const email = String(s.customer_details?.email || s.customer_email || '').toLowerCase();
  const paidAt = new Date((s.created || Date.now() / 1000) * 1000).toISOString();

  // Find the client's brief
  let intake = null;
  if (/^[0-9a-f-]{36}$/i.test(s.client_reference_id || '')) {
    intake = (await sb(`intake_submissions?select=id,first_name,last_name,business_name,email,ref&id=eq.${s.client_reference_id}`, { method: 'GET' }))[0];
  }
  if (!intake && email) {
    intake = (await sb(`intake_submissions?select=id,first_name,last_name,business_name,email,ref&email=eq.${encodeURIComponent(email)}&order=created_at.desc&limit=1`, { method: 'GET' }))[0];
  }
  if (intake) {
    await sb(`intake_submissions?id=eq.${intake.id}`, { method: 'PATCH', body: JSON.stringify({ deposit_paid_at: paidAt, deposit_amount: 1000, stripe_session_id: s.id }) });
  }

  // Referral → commission owed
  let affiliate = null;
  let referral = null;
  const filter = intake ? `intake_id=eq.${intake.id}` : (email ? `client_email=eq.${encodeURIComponent(email)}` : null);
  if (filter) {
    referral = (await sb(`referrals?select=id,affiliate_id,status&${filter}&status=eq.lead&order=created_at.desc&limit=1`, { method: 'GET' }))[0];
  }
  if (referral) {
    await sb(`referrals?id=eq.${referral.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'deposit_paid', deposit_paid_at: paidAt, deposit_amount: 1000, commission_status: 'owed' }) });
    affiliate = (await sb(`affiliates?select=name,email&id=eq.${referral.affiliate_id}`, { method: 'GET' }))[0];
    if (affiliate) {
      try {
        await sendEmail({
          to: [affiliate.email], reply_to: REPLY_INBOX,
          subject: 'You earned $500 — your referral paid their deposit',
          html: `<div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;color:#111"><p>Hi ${esc(affiliate.name.split(' ')[0])},</p><p style="line-height:1.7"><b>${esc(intake?.business_name || 'Your referral')}</b> paid their $1,000 deposit. Your <b>$500</b> referral fee is now owed to you.</p><p style="line-height:1.7">If we don't have your W-9 yet, reply to this email and we'll send the form. — SoHo Media House</p></div>`
        });
      } catch (e) { console.error('affiliate email', e); }
    }
  }

  try {
    await sendEmail({
      to: TEAM_INBOX,
      subject: `$1,000 deposit received — ${intake?.business_name || email || 'unknown client'}`,
      html: `<p>Deposit paid: $1,000 · ${esc(email)} · Stripe ${esc(s.id)}</p><p>Brief: ${intake ? 'matched' : '<b>NOT matched — check the email</b>'}${affiliate ? ` · Referral: ${esc(affiliate.name)} — $500 now owed (Command Center → Affiliates)` : ' · No affiliate'}</p>`
    });
  } catch (e) { console.error('team email', e); }

  return res.status(200).json({ ok: true, intake: Boolean(intake), referral: Boolean(referral) });
}
