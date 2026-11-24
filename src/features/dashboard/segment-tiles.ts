/**
 * The Life Segments card ends with an "Add a segment" tile that stretches
 * across whatever cells are left in the last row, so the list never ends on
 * a gap that reads as "that is all of them".
 */

/** Columns in the card's grid at each Tailwind breakpoint. */
const COLUMNS = { base: 2, sm: 3, lg: 5 } as const;

/** Written out in full so Tailwind sees every class it has to generate. */
const SPAN = {
  base: ['', 'col-span-1', 'col-span-2', 'col-span-3', 'col-span-4', 'col-span-5'],
  sm: ['', 'sm:col-span-1', 'sm:col-span-2', 'sm:col-span-3', 'sm:col-span-4', 'sm:col-span-5'],
  lg: ['', 'lg:col-span-1', 'lg:col-span-2', 'lg:col-span-3', 'lg:col-span-4', 'lg:col-span-5'],
} as const;

/** Cells left in the last row after `shown` tiles, or a whole row when it is full. */
export function cellsLeft(shown: number, columns: number): number {
  const rest = shown % columns;
  return rest === 0 ? columns : columns - rest;
}

/** Classes that make the final tile fill the rest of the row at every width. */
export function fillerSpanClasses(shown: number): string {
  return [
    SPAN.base[cellsLeft(shown, COLUMNS.base)],
    SPAN.sm[cellsLeft(shown, COLUMNS.sm)],
    SPAN.lg[cellsLeft(shown, COLUMNS.lg)],
  ].join(' ');
}
