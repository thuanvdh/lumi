/// <reference types="node" />
// Generation speed and checkpoint counts per difficulty tier.
import { TIER_STARTS, puzzleForLevel } from '../src/game/levels.ts';

for (const { tier, from } of TIER_STARTS) {
  const times: number[] = [];
  const clues: number[] = [];
  const sizes: Record<number, number> = {};
  for (let i = 0; i < 30; i++) {
    const t = performance.now();
    const { puzzle } = puzzleForLevel(from, `bench-${i}`);
    times.push(performance.now() - t);
    clues.push(Object.keys(puzzle.numbers).length);
    sizes[puzzle.size] = (sizes[puzzle.size] ?? 0) + 1;
  }
  const avg = (a: number[]) => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1);
  console.log(
    `${tier.padEnd(6)} sizes ${JSON.stringify(sizes)}  gen avg ${avg(times)}ms max ${Math.max(...times).toFixed(0)}ms  clues avg ${avg(clues)} [${Math.min(...clues)}-${Math.max(...clues)}]`,
  );
}
