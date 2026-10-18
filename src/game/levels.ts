import { type Puzzle, createRng, generatePuzzle } from '../engine/index.ts';

export type Tier = 'easy' | 'medium' | 'hard';

interface TierConfig {
  label: string;
  /** Grid sizes this tier draws from. */
  sizes: number[];
  /** Checkpoints as a fraction of the cell count (more = easier); [min, max]. */
  clueRatio: [number, number];
  /** Walls per grid size; [min, max]. */
  walls: Record<number, [number, number]>;
}

export const TIERS: Record<Tier, TierConfig> = {
  easy: {
    label: 'Dễ',
    sizes: [5, 6],
    clueRatio: [0.3, 0.4],
    walls: { 5: [0, 1], 6: [0, 2] },
  },
  medium: {
    label: 'Trung bình',
    sizes: [6, 7],
    clueRatio: [0.17, 0.23],
    walls: { 6: [1, 3], 7: [1, 3] },
  },
  hard: {
    label: 'Khó',
    sizes: [7, 8],
    clueRatio: [0, 0], // as few as uniqueness allows
    walls: { 7: [2, 4], 8: [4, 7] }, // 8×8 needs walls to generate quickly on phones
  },
};

/** Levels 1–10 are easy, 11–30 medium, 31+ hard. */
export const TIER_STARTS: { tier: Tier; from: number }[] = [
  { tier: 'easy', from: 1 },
  { tier: 'medium', from: 11 },
  { tier: 'hard', from: 31 },
];

export function tierForLevel(level: number): Tier {
  let tier: Tier = 'easy';
  for (const t of TIER_STARTS) if (level >= t.from) tier = t.tier;
  return tier;
}

/** A random puzzle for the given level, shaped by its difficulty tier. */
export function puzzleForLevel(level: number, seed: number | string): { puzzle: Puzzle; tier: Tier } {
  const tier = tierForLevel(level);
  const cfg = TIERS[tier];
  const rng = createRng(`${seed}:${level}`);
  const pick = (min: number, max: number) => min + Math.floor(rng() * (max - min + 1));

  const size = cfg.sizes[Math.floor(rng() * cfg.sizes.length)];
  const [wMin, wMax] = cfg.walls[size];
  const ratio = cfg.clueRatio[0] + rng() * (cfg.clueRatio[1] - cfg.clueRatio[0]);
  const targetClues = Math.max(2, Math.round(size * size * ratio));

  const puzzle = generatePuzzle({ size, seed: `${seed}:${level}`, walls: pick(wMin, wMax), targetClues });
  return { puzzle, tier };
}
