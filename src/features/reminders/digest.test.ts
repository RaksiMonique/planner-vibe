import { describe, expect, it } from 'vitest';
import { renderDigest, renderReminderEmail } from './digest';

const base = { name: 'Monique', dateLabel: 'Tuesday 10 November', siteUrl: 'https://planner.test' };

describe('renderDigest', () => {
  it('summarises the sections in the subject and lists items with links', () => {
    const mail = renderDigest({
      ...base,
      reminders: [{ title: 'Call the bank', href: '/tasks' }],
      dueToday: [{ title: 'Submit report', detail: 'high', href: '/tasks' }],
      overdue: [],
      events: [
        { title: 'Dentist', detail: '14:30', href: '/calendar' },
        { title: 'Choir', detail: '19:00', href: '/calendar' },
      ],
    });
    expect(mail.subject).toBe(
      "Your day, Tuesday 10 November: 1 reminders, 1 due today, 2 today's events"
    );
    expect(mail.text).toContain('Good morning, Monique.');
    expect(mail.text).toContain('- Submit report (high): https://planner.test/tasks');
    expect(mail.text).not.toContain('OVERDUE');
    expect(mail.html).toContain(
      '<a href="https://planner.test/calendar" style="color:#722F37">Dentist</a>'
    );
    expect(mail.html).toContain('/settings/integrations');
  });

  it('says so when nothing is waiting and escapes markup', () => {
    const mail = renderDigest({
      ...base,
      name: '<b>',
      reminders: [],
      dueToday: [],
      overdue: [],
      events: [],
    });
    expect(mail.subject).toContain('nothing waiting');
    expect(mail.text).toContain('Nothing is due or scheduled today.');
    expect(mail.html).toContain('Good morning, &lt;b&gt;.');
  });
});

describe('renderReminderEmail', () => {
  it('names a single reminder, counts several', () => {
    const one = renderReminderEmail({
      siteUrl: base.siteUrl,
      items: [{ title: 'Water plants', href: '/habits' }],
    });
    expect(one.subject).toBe('Reminder: Water plants');
    const many = renderReminderEmail({
      siteUrl: base.siteUrl,
      items: [
        { title: 'Water plants', href: '/habits' },
        { title: 'Pay rent', href: '/tasks' },
      ],
    });
    expect(many.subject).toBe('2 reminders: Water plants and more');
    expect(many.text).toContain('- Pay rent: https://planner.test/tasks');
  });
});
