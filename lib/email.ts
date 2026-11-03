import nodemailer from 'nodemailer';

// Email for the journal, sent from the journal's own Gmail account.
//
// Vercel environment variables:
//   GMAIL_USER          the Gmail address, e.g. sjrijournal@gmail.com
//   GMAIL_APP_PASSWORD  a 16-character Google "App password" (NOT the normal Gmail password)
//   EDITORIAL_EMAIL     optional: where editorial notifications go (default: GMAIL_USER).
//                       Several addresses can be separated by commas.
//   SITE_URL            optional: website address used in links (default https://sjri-publish-hub.vercel.app)
//
// Another mail provider can be used instead of Gmail with SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
// (and SMTP_FROM for the sender address).
//
// If Gmail is not configured, emails are skipped (logged) and the website keeps working.
// Sending never makes a request fail.

const DEFAULT_SITE = 'https://sjri-publish-hub.vercel.app';
const JOURNAL = 'South Journal of Research and Innovation (SJRI)';

export function siteUrl() {
  const candidates = [process.env.SITE_URL, process.env.NEXT_PUBLIC_FRONTEND_URL, process.env.FRONTEND_URL];
  for (const c of candidates) {
    if (!c) continue;
    const url = c.split(',')[0]!.trim().replace(/\/+$/, '');
    if (!url) continue;
    if (process.env.NODE_ENV === 'production' && /localhost|127\.0\.0\.1/.test(url)) continue;
    return url;
  }
  return DEFAULT_SITE;
}

export function emailConfigured() {
  return Boolean(process.env.SMTP_HOST || (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD));
}

function senderAddress() {
  return process.env.SMTP_FROM || process.env.GMAIL_USER || process.env.SMTP_USER || 'no-reply@localhost';
}

export function editorialAddresses(): string[] {
  const list = (process.env.EDITORIAL_EMAIL || process.env.GMAIL_USER || process.env.SMTP_FROM || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return Array.from(new Set(list));
}

let transporter: nodemailer.Transporter | null = null;
function getTransport() {
  if (!transporter) {
    transporter = process.env.SMTP_HOST
      ? nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: Number(process.env.SMTP_PORT) === 465,
          auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
        })
      : nodemailer.createTransport({
          service: 'gmail',
          auth: { user: process.env.GMAIL_USER, pass: (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '') },
        });
  }
  return transporter;
}

export type Attachment = { filename: string; content: Buffer; contentType?: string };
export type Mail = { to: string | string[]; subject: string; text: string; replyTo?: string; attachments?: Attachment[] };

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

function toHtml(text: string) {
  const body = escapeHtml(text)
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#14284b">$1</a>')
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px">${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#1f2937;max-width:600px">
<div style="background:#14284b;color:#d9b45a;padding:14px 18px;font-weight:bold;font-size:16px">SJRI · South Journal of Research and Innovation</div>
<div style="padding:18px">${body}</div>
<div style="padding:0 18px 18px;font-size:12px;color:#6b7280">Research • Innovate • Transform Africa<br>${escapeHtml(siteUrl())}</div></div>`;
}

/** Sends an email. Never throws: failures are logged so the website keeps working. */
export async function sendEmail(mail: Mail): Promise<boolean> {
  const to = (Array.isArray(mail.to) ? mail.to : [mail.to]).filter(Boolean);
  if (!to.length) return false;
  if (!emailConfigured()) {
    console.log(`[email skipped: Gmail not configured] to=${to.join(',')} subject="${mail.subject}"`);
    return false;
  }
  try {
    const send = getTransport().sendMail({
      from: `"SJRI Journal" <${senderAddress()}>`,
      to: to.join(', '),
      replyTo: mail.replyTo || senderAddress(),
      subject: mail.subject,
      text: `${mail.text}\n\n--\n${JOURNAL}\n${siteUrl()}`,
      html: toHtml(mail.text),
      attachments: mail.attachments,
    });
    // Don't let a slow mail server hold up the website for long.
    await Promise.race([send, new Promise((_, reject) => setTimeout(() => reject(new Error('email timeout')), 12000))]);
    return true;
  } catch (error) {
    console.error('Email failed:', mail.subject, error instanceof Error ? error.message : error);
    return false;
  }
}

export function mid(id: string) {
  return `SJRI-${id.slice(-6).toUpperCase()}`;
}
