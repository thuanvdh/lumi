import type { Cell, Puzzle } from '../engine/index.ts';

export interface TierStats {
  solved: number;
  /** Solved without using a hint. */
  cleanSolved: number;
  bestMs: number | null;
  totalMs: number;
}

export interface Stats {
  solved: number;
  /** Keyed by difficulty tier. */
  byTier: Record<string, TierStats>;
  streak: { current: number; best: number; lastDay: string | null };
}

/** An unfinished puzzle, saved so the player can continue after closing the app. */
export interface SavedSession {
  level: number;
  tier: string;
  puzzle: Puzzle;
  path: Cell[];
  hints: number;
  elapsedMs: number;
}

export const emptyStats = (): Stats => ({
  solved: 0,
  byTier: {},
  streak: { current: 0, best: 0, lastDay: null },
});

/** Local calendar day as YYYY-MM-DD (streaks follow the player's own midnight). */
export function dayKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

function addDays(day: string, delta: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + delta));
}

/** Streak to display today: it is broken once a whole day passes without a win. */
export function activeStreak(stats: Stats, today: string): number {
  const { lastDay, current } = stats.streak;
  if (lastDay === today || (lastDay !== null && addDays(lastDay, 1) === today)) return current;
  return 0;
}

export function recordWin(
  stats: Stats,
  win: { tier: string; ms: number; hints: number; day: string },
): { stats: Stats; newBest: boolean } {
  const key = win.tier;
  const prev = stats.byTier[key] ?? { solved: 0, cleanSolved: 0, bestMs: null, totalMs: 0 };
  // Times helped by hints don't count toward the record.
  const newBest = win.hints === 0 && (prev.bestMs === null || win.ms < prev.bestMs);

  const { lastDay, current, best } = stats.streak;
  let nextCurrent = current;
  if (lastDay !== win.day) nextCurrent = lastDay !== null && addDays(lastDay, 1) === win.day ? current + 1 : 1;

  return {
    newBest,
    stats: {
      solved: stats.solved + 1,
      byTier: {
        ...stats.byTier,
        [key]: {
          solved: prev.solved + 1,
          cleanSolved: prev.cleanSolved + (win.hints === 0 ? 1 : 0),
          bestMs: newBest ? win.ms : prev.bestMs,
          totalMs: prev.totalMs + win.ms,
        },
      },
      streak: { current: nextCurrent, best: Math.max(best, nextCurrent), lastDay: win.day },
    },
  };
}

/** Guards against corrupted or outdated saves: the path must be a legal prefix on the saved grid. */
export function isValidSession(s: unknown): s is SavedSession {
  if (typeof s !== 'object' || s === null) return false;
  const { level, tier, puzzle, path, hints, elapsedMs } = s as SavedSession;
  if (typeof level !== 'number' || typeof tier !== 'string' || !puzzle) return false;
  if (!Array.isArray(path) || typeof hints !== 'number' || typeof elapsedMs !== 'number') return false;
  const total = puzzle.size * puzzle.size;
  return (
    Array.isArray(puzzle.solution) &&
    puzzle.solution.length === total &&
    Array.isArray(puzzle.walls) &&
    typeof puzzle.numbers === 'object' &&
    path.every((c) => Number.isInteger(c) && c >= 0 && c < total)
  );
}
