/** Cells are indexed row-major: index = row * size + col. */
export type Cell = number;

export interface Puzzle {
  size: number;
  /** cell -> checkpoint number (1..K). Cell with 1 is the start, cell with K is the end. */
  numbers: Record<Cell, number>;
  /** Blocked edges between two orthogonally adjacent cells, stored as [a, b] with a < b. */
  walls: [Cell, Cell][];
  /** The unique solution path, covering every cell exactly once. */
  solution: Cell[];
}

export const rowOf = (size: number, c: Cell) => Math.floor(c / size);
export const colOf = (size: number, c: Cell) => c % size;

export const edgeKey = (a: Cell, b: Cell) => (a < b ? `${a}-${b}` : `${b}-${a}`);

export function wallSet(puzzle: Pick<Puzzle, 'walls'>): Set<string> {
  return new Set(puzzle.walls.map(([a, b]) => edgeKey(a, b)));
}

export function isAdjacent(size: number, a: Cell, b: Cell): boolean {
  const dr = Math.abs(rowOf(size, a) - rowOf(size, b));
  const dc = Math.abs(colOf(size, a) - colOf(size, b));
  return dr + dc === 1;
}

/** Orthogonal neighbours of a cell, ignoring walls. */
export function neighbors(size: number, c: Cell): Cell[] {
  const r = rowOf(size, c);
  const col = colOf(size, c);
  const out: Cell[] = [];
  if (r > 0) out.push(c - size);
  if (r < size - 1) out.push(c + size);
  if (col > 0) out.push(c - 1);
  if (col < size - 1) out.push(c + 1);
  return out;
}

/** Precomputed adjacency list that respects walls. */
export function buildAdjacency(size: number, walls: Set<string>): Cell[][] {
  const adj: Cell[][] = [];
  for (let c = 0; c < size * size; c++) {
    adj.push(neighbors(size, c).filter((n) => !walls.has(edgeKey(c, n))));
  }
  return adj;
}

export function maxNumber(puzzle: Pick<Puzzle, 'numbers'>): number {
  return Math.max(...Object.values(puzzle.numbers));
}

export function cellOfNumber(puzzle: Pick<Puzzle, 'numbers'>, n: number): Cell {
  for (const [cell, v] of Object.entries(puzzle.numbers)) {
    if (v === n) return Number(cell);
  }
  throw new Error(`number ${n} not found`);
}
