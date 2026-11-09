// Life Segment accent colours, limited to the approved palette.
export type Accent = 'burgundy' | 'terracotta' | 'coral' | 'peach' | 'sage' | 'beige';

export const ACCENT_BG: Record<Accent, string> = {
  burgundy: 'bg-burgundy',
  terracotta: 'bg-terracotta',
  coral: 'bg-coral',
  peach: 'bg-peach',
  sage: 'bg-sage',
  beige: 'bg-beige',
};

// Text on each accent, following the contrast notes in instructions.md 2.1
export const ACCENT_FG: Record<Accent, string> = {
  burgundy: 'text-ivory',
  terracotta: 'text-white',
  coral: 'text-charcoal',
  peach: 'text-charcoal',
  sage: 'text-charcoal',
  beige: 'text-charcoal',
};
