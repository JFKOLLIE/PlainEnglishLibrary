/*
  Plain English Library - Cloudflare Pages advanced-mode worker.
  Handles POST /api/subscribe (free guide form). Every other request is served
  from the static site. _routes.json limits this worker to /api/* only.

  Cloudflare Pages > Settings > Variables and Secrets (Production):
    RESEND_API_KEY     (Secret)  your Resend API key          - required
    RESEND_SEGMENT_ID  (Text)    Resend segment for free-guide signups - optional
    FROM_EMAIL         (Text)    e.g. Plain English Library <hello@plainenglishlibrary.com> - optional
*/
const SITE = 'https://plainenglishlibrary.com';
const DEFAULT_FROM = 'Plain English Library <hello@plainenglishlibrary.com>';
const DEFAULT_SEGMENT = '77733676-9a48-47b1-bf00-c9752702851c';
const FREE_PDF = SITE + '/downloads/3-ai-prompts-for-agents.pdf';
const PAID_PAGE = SITE + '/guides/ai-for-real-estate-agents/';

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function emailHtml(first) {
  const hi = first ? `Hi ${esc(first)},` : 'Hi,';
  return `<!doctype html><html><body style="margin:0;background:#F6F1E7;font-family:Georgia,'Times New Roman',serif;color:#1F2A36">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e4dccb;border-radius:8px">
<tr><td style="padding:32px 32px 8px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#A8482A;font-family:Arial,Helvetica,sans-serif">Plain English Library</td></tr>
<tr><td style="padding:8px 32px 0;font-size:24px;line-height:1.3">Your free guide is ready.</td></tr>
<tr><td style="padding:16px 32px 0;font-size:16px;line-height:1.6;font-family:Arial,Helvetica,sans-serif">
<p style="margin:0 0 14px">${hi}</p>
<p style="margin:0 0 14px">Thanks for requesting <strong>3 AI Prompts Every Agent Should Use This Week</strong>. It is a five-page PDF you can use today: make AI sound like you, write listing copy with no invented facts, and answer new leads in under five minutes.</p>
<p style="margin:24px 0"><a href="${FREE_PDF}" style="background:#A8482A;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:6px;display:inline-block;font-weight:bold">Download the free guide (PDF)</a></p>
<p style="margin:0 0 14px">Start with prompt 1. Paste in three things you have written yourself, and every draft after that will sound more like you.</p>
<p style="margin:0 0 14px">If you want all five workflows, including listing launches, lead follow-up, the weekly content engine and client updates, they are in <a href="${PAID_PAGE}" style="color:#A8482A">The AI-Assisted Agent</a>.</p>
<p style="margin:0 0 14px">Questions or feedback? Just reply to this email.</p>
</td></tr>
<tr><td style="padding:16px 32px 32px;font-size:12px;line-height:1.5;color:#5b6570;font-family:Arial,Helvetica,sans-serif;border-top:1px solid #eee">
You received this because you requested the free guide at plainenglishlibrary.com. To stop hearing from us, reply with "unsubscribe".
</td></tr></table></td></tr></table></body></html>`;
}

function emailText(first) {
  return `${first ? 'Hi ' + first + ',' : 'Hi,'}

Thanks for requesting "3 AI Prompts Every Agent Should Use This Week".

Download the free guide (PDF):
${FREE_PDF}

Start with prompt 1. Paste in three things you have written yourself, and every draft after that will sound more like you.

All five workflows are in The AI-Assisted Agent:
${PAID_PAGE}

Questions or feedback? Just reply to this email.

--
You received this because you requested the free guide at plainenglishlibrary.com. To stop hearing from us, reply with "unsubscribe".`;
}

async function readBody(request) {
  const type = request.headers.get('content-type') || '';
  if (type.includes('application/json')) return await request.json();
  const fd = await request.formData();
  return Object.fromEntries(fd.entries());
}

async function subscribe(request, env) {
  if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405);
  let body;
  try { body = await readBody(request); } catch { return json({ ok: false, error: 'Bad request' }, 400); }

  // Honeypot: bots fill hidden fields. Pretend success, do nothing.
  if (body.company) return json({ ok: true, emailed: false });

  const email = String(body.email || '').trim().toLowerCase();
  const first = String(body.first || body.name || '').trim().slice(0, 60);
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return json({ ok: false, error: 'Please enter a valid email address.' }, 400);
  }
  if (!env.RESEND_API_KEY) return json({ ok: true, emailed: false });

  const auth = { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' };

  // 1) Save the contact to the free-guide segment (ignore "already exists").
  const contact = fetch('https://api.resend.com/contacts', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      email,
      first_name: first || undefined,
      unsubscribed: false,
      segments: [{ id: env.RESEND_SEGMENT_ID || DEFAULT_SEGMENT }],
    }),
  }).catch(() => null);

  // 2) Send the guide.
  let emailed = false;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        from: env.FROM_EMAIL || DEFAULT_FROM,
        to: [email],
        reply_to: 'hello@plainenglishlibrary.com',
        subject: 'Your free guide: 3 AI Prompts Every Agent Should Use',
        html: emailHtml(first),
        text: emailText(first),
        headers: { 'List-Unsubscribe': '<mailto:hello@plainenglishlibrary.com?subject=unsubscribe>' },
        tags: [{ name: 'source', value: 'free_guide' }],
      }),
    });
    emailed = res.ok;
  } catch { emailed = false; }

  await contact;
  return json({ ok: true, emailed });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/subscribe') return subscribe(request, env);
    if (url.pathname.startsWith('/api/')) return json({ ok: false, error: 'Not found' }, 404);
    return env.ASSETS.fetch(request);
  },
};
