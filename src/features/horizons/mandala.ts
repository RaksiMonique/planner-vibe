/**
 * Mandala view (instructions.md 7.2): a central goal with up to eight
 * supporting goals in a 3 by 3 grid. Children fill the edges first, then the
 * corners, so a goal with four sub-goals reads as a cross.
 */

export type MandalaCell<T> = { position: number; goal: T | null; isCenter: boolean };

const CENTER = 4;
const FILL_ORDER = [1, 5, 7, 3, 0, 2, 6, 8];

export function buildMandala<T>(
  center: T,
  children: T[]
): { cells: MandalaCell<T>[]; overflow: T[] } {
  const cells: MandalaCell<T>[] = Array.from({ length: 9 }, (_, position) => ({
    position,
    goal: position === CENTER ? center : null,
    isCenter: position === CENTER,
  }));
  children.slice(0, FILL_ORDER.length).forEach((goal, i) => {
    cells[FILL_ORDER[i]].goal = goal;
  });
  return { cells, overflow: children.slice(FILL_ORDER.length) };
}
