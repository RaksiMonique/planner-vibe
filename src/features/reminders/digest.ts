/**
 * The daily digest and reminder emails (instructions.md 9.2), rendered from
 * plain data so the wording is unit-tested. Text and HTML carry the same
 * content; HTML is deliberately simple and inline-styled for mail clients.
 */

export type DigestItem = { title: string; detail?: string; href: string };

export type DigestInput = {
  name: string;
  dateLabel: string;
  siteUrl: string;
  reminders: DigestItem[];
  dueToday: DigestItem[];
  overdue: DigestItem[];
  events: DigestItem[];
};

export type RenderedEmail = { subject: string; text: string; html: string };

export function renderDigest(input: DigestInput): RenderedEmail {
  const sections: Array<[string, DigestItem[]]> = [
    ['Reminders', input.reminders],
    ['Due today', input.dueToday],
    ['Overdue', input.overdue],
    ["Today's events", input.events],
  ];
  const filled = sections.filter(([, items]) => items.length > 0);
  const total = filled.reduce((n, [, items]) => n + items.length, 0);
  const subject =
    total === 0
      ? `Your day, ${input.dateLabel}: nothing waiting`
      : `Your day, ${input.dateLabel}: ${summarise(filled)}`;

  const textParts = [`Good morning${input.name ? `, ${input.name}` : ''}.`, ''];
  const htmlParts = [
    `<p style="margin:0 0 16px">Good morning${input.name ? `, ${escapeHtml(input.name)}` : ''}.</p>`,
  ];
  if (filled.length === 0) {
    textParts.push('Nothing is due or scheduled today. Enjoy the space.');
    htmlParts.push('<p>Nothing is due or scheduled today. Enjoy the space.</p>');
  }
  for (const [heading, items] of filled) {
    textParts.push(heading.toUpperCase());
    htmlParts.push(
      `<h2 style="font-size:14px;margin:16px 0 6px;letter-spacing:.04em;text-transform:uppercase;color:#80766F">${escapeHtml(heading)}</h2><ul style="margin:0;padding-left:18px">`
    );
    for (const item of items) {
      const detail = item.detail ? ` (${item.detail})` : '';
      textParts.push(`- ${item.title}${detail}: ${input.siteUrl}${item.href}`);
      htmlParts.push(
        `<li style="margin:2px 0"><a href="${input.siteUrl}${escapeAttr(item.href)}" style="color:#722F37">${escapeHtml(item.title)}</a>${item.detail ? ` <span style="color:#80766F">${escapeHtml(item.detail)}</span>` : ''}</li>`
      );
    }
    textParts.push('');
    htmlParts.push('</ul>');
  }
  textParts.push(`Open the planner: ${input.siteUrl}/dashboard`);
  textParts.push(`Change or stop these emails: ${input.siteUrl}/settings/integrations`);
  htmlParts.push(
    `<p style="margin:20px 0 0"><a href="${input.siteUrl}/dashboard" style="color:#722F37">Open the planner</a></p>` +
      `<p style="margin:8px 0 0;font-size:12px;color:#80766F"><a href="${input.siteUrl}/settings/integrations" style="color:#80766F">Change or stop these emails</a></p>`
  );
  return { subject, text: textParts.join('\n'), html: wrap(htmlParts.join('')) };
}

export function renderReminderEmail(input: {
  siteUrl: string;
  items: DigestItem[];
}): RenderedEmail {
  const first = input.items[0];
  const subject =
    input.items.length === 1
      ? `Reminder: ${first.title}`
      : `${input.items.length} reminders: ${first.title} and more`;
  const text = [
    ...input.items.map(
      (i) => `- ${i.title}${i.detail ? ` (${i.detail})` : ''}: ${input.siteUrl}${i.href}`
    ),
    '',
    `Change or stop these emails: ${input.siteUrl}/settings/integrations`,
  ].join('\n');
  const html = wrap(
    `<ul style="margin:0;padding-left:18px">${input.items
      .map(
        (i) =>
          `<li style="margin:2px 0"><a href="${input.siteUrl}${escapeAttr(i.href)}" style="color:#722F37">${escapeHtml(i.title)}</a>${i.detail ? ` <span style="color:#80766F">${escapeHtml(i.detail)}</span>` : ''}</li>`
      )
      .join('')}</ul>` +
      `<p style="margin:16px 0 0;font-size:12px;color:#80766F"><a href="${input.siteUrl}/settings/integrations" style="color:#80766F">Change or stop these emails</a></p>`
  );
  return { subject, text, html };
}

function summarise(filled: Array<[string, DigestItem[]]>): string {
  return filled.map(([heading, items]) => `${items.length} ${heading.toLowerCase()}`).join(', ');
}

function wrap(body: string): string {
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#FAF7F2;color:#35312F;font:15px/1.5 -apple-system,Segoe UI,Helvetica,Arial,sans-serif"><div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #D8C8B8;border-radius:12px;padding:24px"><p style="margin:0 0 12px;font:600 20px Georgia,serif;color:#722F37">Life Planner</p>${body}</div></body></html>`;
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(text: string): string {
  return escapeHtml(text).replace(/'/g, '&#39;');
}
