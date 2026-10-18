import { type Cell, type Puzzle, edgeKey, neighbors } from './types.ts';
import { solve } from './solver.ts';
import { type Rng, createRng, shuffle } from './random.ts';

export interface GenerateOptions {
  size: number;
  /** Seed for reproducible puzzles (e.g. the date for the daily puzzle). */
  seed: number | string;
  /** Stop removing checkpoints once this many remain. Lower = harder. */
  targetClues?: number;
  /** Number of walls to place (only between cells not consecutive in the solution). */
  walls?: number;
  /** Search budget per uniqueness check. */
  nodeLimit?: number;
  maxAttempts?: number;
}

/** Boustrophedon path: row 0 left→right, row 1 right→left, ... */
function serpentine(size: number): Cell[] {
  const path: Cell[] = [];
  for (let r = 0; r < size; r++) {
    for (let i = 0; i < size; i++) path.push(r * size + (r % 2 === 0 ? i : size - 1 - i));
  }
  return path;
}

/**
 * Random Hamiltonian path via "backbite" moves: join an endpoint to one of its grid
 * neighbours and cut the path edge that would otherwise form a loop. Uniformly mixes
 * well after O(n^2 log n) moves.
 */
export function randomHamiltonianPath(size: number, rng: Rng): Cell[] {
  let path = serpentine(size);
  const total = size * size;
  const moves = Math.ceil(10 * total * Math.log(total + 1));
  const pos = new Int32Array(total);
  for (let m = 0; m < moves; m++) {
    if (rng() < 0.5) path.reverse();
    path.forEach((c, i) => (pos[c] = i));
    const head = path[0];
    const opts = neighbors(size, head).filter((n) => pos[n] >= 2);
    if (opts.length === 0) continue;
    const i = pos[opts[Math.floor(rng() * opts.length)]];
    path = path.slice(0, i).reverse().concat(path.slice(i));
  }
  return path;
}

function numbersFromIndices(solution: Cell[], indices: Set<number>): Record<Cell, number> {
  const numbers: Record<Cell, number> = {};
  [...indices].sort((a, b) => a - b).forEach((idx, k) => (numbers[solution[idx]] = k + 1));
  return numbers;
}

function pickWalls(size: number, solution: Cell[], count: number, rng: Rng): [Cell, Cell][] {
  if (count <= 0) return [];
  const used = new Set<string>();
  for (let i = 1; i < solution.length; i++) used.add(edgeKey(solution[i - 1], solution[i]));
  const candidates: [Cell, Cell][] = [];
  for (let c = 0; c < size * size; c++) {
    for (const n of neighbors(size, c)) {
      if (c < n && !used.has(edgeKey(c, n))) candidates.push([c, n]);
    }
  }
  return shuffle(candidates, rng).slice(0, count);
}

/**
 * Pick a solution index whose cell, once made a checkpoint, invalidates `alt`.
 * A cell visited between different checkpoints in `alt` than in `solution` is a sure kill;
 * otherwise use the first divergence, where the two paths visit two cells in opposite order.
 */
function killingIndex(solution: Cell[], alt: Cell[], indices: Set<number>): number {
  const clueCells = new Set([...indices].map((i) => solution[i]));
  const segment = (path: Cell[]) => {
    const seg = new Map<Cell, number>();
    let s = 0;
    for (const c of path) {
      if (clueCells.has(c)) s++;
      seg.set(c, s);
    }
    return seg;
  };
  const segSol = segment(solution);
  const segAlt = segment(alt);
  const sure = solution
    .map((_, i) => i)
    .filter((i) => !indices.has(i) && segSol.get(solution[i]) !== segAlt.get(solution[i]));
  if (sure.length > 0) return sure[Math.floor(sure.length / 2)];

  const d = alt.findIndex((c, i) => c !== solution[i]);
  if (!indices.has(d)) return d;
  const other = solution.indexOf(alt[d]);
  if (!indices.has(other)) return other;
  return solution.findIndex((c, i) => !indices.has(i) && c !== alt[i]);
}

/**
 * Build a puzzle with exactly one solution:
 * 1. random Hamiltonian path = solution
 * 2. optional walls on unused edges
 * 3. add checkpoints until the solver finds a single solution
 * 4. greedily remove checkpoints while the solution stays unique
 */
export function generatePuzzle({
  size,
  seed,
  targetClues = 2,
  walls = 0,
  nodeLimit = 200_000,
  maxAttempts = 20,
}: GenerateOptions): Puzzle {
  const rng = createRng(seed);
  const total = size * size;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const solution = randomHamiltonianPath(size, rng);
    const wallList = pickWalls(size, solution, walls, rng);

    const indices = new Set<number>([0, total - 1]);
    // Seed with evenly spaced checkpoints so the first solve is fast.
    const step = Math.max(2, Math.floor(total / Math.max(3, Math.round(size * 1.2))));
    for (let i = step; i < total - 1; i += step) indices.add(i);

    const check = () =>
      solve({ size, numbers: numbersFromIndices(solution, indices), walls: wallList }, { limit: 2, nodeLimit });

    // Phase 3: make it unique.
    let result = check();
    let guard = 0;
    while ((result.aborted || result.solutions.length > 1) && guard++ < total) {
      if (result.solutions.length > 1) {
        const alt = result.solutions.find((s) => s.some((c, i) => c !== solution[i]))!;
        indices.add(killingIndex(solution, alt, indices));
      } else {
        const free = [...Array(total).keys()].filter((i) => !indices.has(i));
        indices.add(free[Math.floor(rng() * free.length)]);
      }
      result = check();
    }
    if (result.aborted || result.solutions.length !== 1) continue;

    // Phase 4: thin out checkpoints.
    const removable = shuffle(
      [...indices].filter((i) => i !== 0 && i !== total - 1),
      rng,
    );
    for (const idx of removable) {
      if (indices.size <= targetClues) break;
      indices.delete(idx);
      const r = check();
      if (r.aborted || r.solutions.length !== 1) indices.add(idx);
    }

    return { size, numbers: numbersFromIndices(solution, indices), walls: wallList, solution };
  }
  throw new Error(`could not generate a ${size}x${size} puzzle for seed ${seed}`);
}
