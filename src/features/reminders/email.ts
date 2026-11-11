import 'server-only';

/**
 * Sends through Resend's REST API (instructions.md 9.2) with no SDK. Returns
 * false, without throwing, when email is not configured, so callers can treat
 * email as optional.
 */
export type OutgoingEmail = { to: string; subject: string; text: string; html: string };

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail(mail: OutgoingEmail): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return false;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [mail.to],
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Email send failed (${res.status}): ${detail.slice(0, 200)}`);
  }
  return true;
}
