import { type Cell, type Puzzle, buildAdjacency, cellOfNumber, maxNumber, wallSet } from './types.ts';

export interface SolveResult {
  /** Up to `limit` solutions found. */
  solutions: Cell[][];
  /** True when the search hit `nodeLimit` before finishing — the count is then unreliable. */
  aborted: boolean;
  nodes: number;
}

export interface SolveOptions {
  /** Stop after finding this many solutions (2 is enough to test uniqueness). */
  limit?: number;
  nodeLimit?: number;
}

/**
 * Depth-first search for Hamiltonian paths from checkpoint 1 to checkpoint K that collect
 * checkpoints in order. Prunes when the unvisited cells are disconnected or when any
 * non-final cell has fewer than two possible path neighbours left.
 */
export function solve(
  puzzle: Pick<Puzzle, 'size' | 'numbers' | 'walls'>,
  { limit = 2, nodeLimit = 300_000 }: SolveOptions = {},
): SolveResult {
  const { size } = puzzle;
  const total = size * size;
  const adj = buildAdjacency(size, wallSet(puzzle));
  const num = new Int16Array(total);
  for (const [c, v] of Object.entries(puzzle.numbers)) num[Number(c)] = v;
  const last = maxNumber(puzzle);
  const start = cellOfNumber(puzzle, 1);
  const end = cellOfNumber(puzzle, last);

  const visited = new Uint8Array(total);
  const path: Cell[] = [];
  const solutions: Cell[][] = [];
  const seen = new Uint8Array(total);
  const queue = new Int16Array(total);
  let nodes = 0;
  let aborted = false;

  const feasible = (head: Cell, remaining: number): boolean => {
    if (remaining === 0) return true;
    // Degree check: every unvisited cell except the end needs two usable neighbours.
    for (let u = 0; u < total; u++) {
      if (visited[u]) continue;
      let deg = 0;
      for (const n of adj[u]) if (!visited[n] || n === head) deg++;
      if (deg === 0 || (deg === 1 && u !== end)) return false;
    }
    // Connectivity: all unvisited cells must be reachable from the head.
    seen.fill(0);
    let qh = 0;
    let qt = 0;
    for (const n of adj[head]) {
      if (!visited[n] && !seen[n]) {
        seen[n] = 1;
        queue[qt++] = n;
      }
    }
    let count = 0;
    while (qh < qt) {
      const u = queue[qh++];
      count++;
      for (const n of adj[u]) {
        if (!visited[n] && !seen[n]) {
          seen[n] = 1;
          queue[qt++] = n;
        }
      }
    }
    return count === remaining;
  };

  const dfs = (head: Cell, reached: number) => {
    if (solutions.length >= limit || aborted) return;
    if (++nodes > nodeLimit) {
      aborted = true;
      return;
    }
    if (path.length === total) {
      if (head === end) solutions.push([...path]);
      return;
    }
    if (reached === last) return;
    if (!feasible(head, total - path.length)) return;

    for (const n of adj[head]) {
      if (visited[n]) continue;
      const v = num[n];
      if (v !== 0 && v !== reached + 1) continue;
      visited[n] = 1;
      path.push(n);
      dfs(n, v !== 0 ? v : reached);
      path.pop();
      visited[n] = 0;
      if (solutions.length >= limit || aborted) return;
    }
  };

  visited[start] = 1;
  path.push(start);
  dfs(start, 1);

  return { solutions, aborted, nodes };
}
