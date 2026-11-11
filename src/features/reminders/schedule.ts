import { formatInTimeZone } from 'date-fns-tz';

/** Whether a user's daily digest should go out now. Pure, for the cron routes. */
export function digestDue(
  user: { digestHour: number; digestSentOn: string | null },
  now: Date,
  timeZone: string,
  ignoreHour = false
): { send: boolean; todayKey: string } {
  const todayKey = formatInTimeZone(now, timeZone, 'yyyy-MM-dd');
  if (user.digestSentOn === todayKey) return { send: false, todayKey };
  const hour = Number(formatInTimeZone(now, timeZone, 'H'));
  return { send: ignoreHour || hour >= user.digestHour, todayKey };
}
