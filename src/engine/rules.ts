import {
  type Cell,
  type Puzzle,
  colOf,
  edgeKey,
  isAdjacent,
  maxNumber,
  rowOf,
  wallSet,
} from './types.ts';

/** Rules bound to one puzzle, with walls precomputed so drag handling stays cheap. */
export class Rules {
  readonly size: number;
  readonly total: number;
  readonly last: number;
  readonly puzzle: Puzzle;
  private readonly walls: Set<string>;

  constructor(puzzle: Puzzle) {
    this.puzzle = puzzle;
    this.size = puzzle.size;
    this.total = puzzle.size * puzzle.size;
    this.last = maxNumber(puzzle);
    this.walls = wallSet(puzzle);
  }

  numberAt(c: Cell): number | undefined {
    return this.puzzle.numbers[c];
  }

  /** Highest checkpoint number already collected by the path. */
  reached(path: Cell[]): number {
    let n = 0;
    for (const c of path) {
      const v = this.puzzle.numbers[c];
      if (v !== undefined && v > n) n = v;
    }
    return n;
  }

  canStep(path: Cell[], next: Cell): boolean {
    if (path.length === 0) return this.numberAt(next) === 1;
    const head = path[path.length - 1];
    if (!isAdjacent(this.size, head, next)) return false;
    if (this.walls.has(edgeKey(head, next))) return false;
    if (path.includes(next)) return false;
    const reached = this.reached(path);
    if (reached === this.last) return false; // nothing may follow the final checkpoint
    const v = this.numberAt(next);
    if (v !== undefined && v !== reached + 1) return false;
    return true;
  }

  /**
   * Resolve a pointer landing on `cell` into a new path:
   * start on 1, extend to an adjacent cell, drag back to shorten, or tap a visited cell to cut there.
   * Straight-line jumps (fast swipes skipping cells) are filled in cell by cell.
   * Returns the same array instance when nothing changes.
   */
  drag(path: Cell[], cell: Cell): Cell[] {
    if (cell < 0 || cell >= this.total) return path;
    if (path.length === 0) return this.canStep(path, cell) ? [cell] : path;

    const head = path[path.length - 1];
    if (cell === head) return path;

    const idx = path.indexOf(cell);
    if (idx >= 0) return path.slice(0, idx + 1);

    if (this.canStep(path, cell)) return [...path, cell];

    const dr = rowOf(this.size, cell) - rowOf(this.size, head);
    const dc = colOf(this.size, cell) - colOf(this.size, head);

    // Finger cut a corner: route through whichever corner cell is legal.
    if (Math.abs(dr) === 1 && Math.abs(dc) === 1) {
      for (const corner of [head + dc, head + dr * this.size]) {
        if (this.canStep(path, corner)) {
          const via = [...path, corner];
          if (this.canStep(via, cell)) return [...via, cell];
        }
      }
      return path;
    }

    // Fast swipe along a row/column: walk toward the target one cell at a time.
    const sameRow = dr === 0;
    const sameCol = dc === 0;
    if (!sameRow && !sameCol) return path;
    const step = sameRow ? Math.sign(cell - head) : Math.sign(cell - head) * this.size;
    let out = path;
    let cur = head;
    while (cur !== cell) {
      const nxt = cur + step;
      const moved = this.drag(out, nxt);
      if (moved === out) break;
      out = moved;
      cur = out[out.length - 1];
      if (cur !== nxt) break;
    }
    return out;
  }

  isWin(path: Cell[]): boolean {
    return (
      path.length === this.total &&
      this.numberAt(path[path.length - 1]) === this.last &&
      this.reached(path) === this.last
    );
  }

  /**
   * Hint: keep the longest correct prefix of the path, then extend along the solution
   * up to the next checkpoint (at most `maxCells` new cells).
   */
  hint(path: Cell[], maxCells = 4): Cell[] {
    const sol = this.puzzle.solution;
    let k = 0;
    while (k < path.length && path[k] === sol[k]) k++;
    let end = Math.max(k, 1);
    for (let added = 0; end < sol.length && added < maxCells; added++) {
      end++;
      if (this.numberAt(sol[end - 1]) !== undefined) break;
    }
    return sol.slice(0, end);
  }
}
