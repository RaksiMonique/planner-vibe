// Life Segment accent colours, limited to the approved palette.
export type Accent = 'plum' | 'crimson' | 'raspberry' | 'gold' | 'rose' | 'blush';

export const ACCENT_BG: Record<Accent, string> = {
  plum: 'bg-plum',
  crimson: 'bg-crimson',
  raspberry: 'bg-raspberry',
  gold: 'bg-gold',
  rose: 'bg-rose',
  blush: 'bg-blush',
};

// Text on each accent, following the contrast notes in instructions.md 2.1
export const ACCENT_FG: Record<Accent, string> = {
  plum: 'text-white',
  crimson: 'text-white',
  raspberry: 'text-white',
  gold: 'text-plum',
  rose: 'text-white',
  blush: 'text-plum',
};
