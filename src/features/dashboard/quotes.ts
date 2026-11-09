/** A small built-in list until the Quotes module arrives in Release 3. */
export const QUOTES: Array<{ quote: string; author: string }> = [
  {
    quote:
      'Start by doing what is necessary; then do what is possible; and suddenly you are doing the impossible.',
    author: 'St Francis of Assisi',
  },
  { quote: 'Pray, hope, and don’t worry.', author: 'St Padre Pio' },
  { quote: 'Do small things with great love.', author: 'St Teresa of Calcutta' },
  { quote: 'Act, and God will act.', author: 'St Joan of Arc' },
  { quote: 'The way to get started is to quit talking and begin doing.', author: 'Walt Disney' },
  {
    quote: 'What you do every day matters more than what you do once in a while.',
    author: 'Gretchen Rubin',
  },
  {
    quote: 'Be faithful in small things because it is in them that your strength lies.',
    author: 'St Teresa of Calcutta',
  },
];

export function quoteForDay(dayOfYear: number) {
  return QUOTES[((dayOfYear % QUOTES.length) + QUOTES.length) % QUOTES.length];
}
