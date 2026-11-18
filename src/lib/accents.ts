// Life Segment accent colours: the ten approved palette colours (instructions.md 2.1).
export type Accent =
  | 'plum'
  | 'rose'
  | 'crimson'
  | 'raspberry'
  | 'flame'
  | 'coral'
  | 'apricot'
  | 'gold'
  | 'ochre'
  | 'blush';

export const ACCENT_BG: Record<Accent, string> = {
  plum: 'bg-plum',
  rose: 'bg-rose',
  crimson: 'bg-crimson',
  raspberry: 'bg-raspberry',
  flame: 'bg-flame',
  coral: 'bg-coral',
  apricot: 'bg-apricot',
  gold: 'bg-gold',
  ochre: 'bg-ochre',
  blush: 'bg-blush',
};

// Text on each accent, following the contrast notes in instructions.md 2.1.
// Flame, coral, apricot and ochre take whichever palette text colour reads best;
// they clear AA for large text only, so prefer the other six under small labels.
export const ACCENT_FG: Record<Accent, string> = {
  plum: 'text-white',
  rose: 'text-white',
  crimson: 'text-white',
  raspberry: 'text-white',
  flame: 'text-white',
  coral: 'text-white',
  apricot: 'text-plum',
  gold: 'text-plum',
  ochre: 'text-white',
  blush: 'text-plum',
};
