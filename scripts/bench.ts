/// <reference types="node" />
import { generatePuzzle } from '../src/engine/generator.ts';
for (const [size, walls] of [[5,0],[6,0],[6,4],[7,0],[7,4],[8,0],[8,6]]) {
  const times: number[] = []; const clues: number[] = [];
  for (let i = 0; i < 10; i++) {
    const t = performance.now();
    const p = generatePuzzle({ size, seed: `b${size}-${walls}-${i}`, walls });
    times.push(performance.now() - t); clues.push(Object.keys(p.numbers).length);
  }
  const avg = (a: number[]) => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1);
  console.log(`${size}x${size} walls=${walls}: avg ${avg(times)}ms max ${Math.max(...times).toFixed(0)}ms, clues avg ${avg(clues)} [${Math.min(...clues)}-${Math.max(...clues)}]`);
}
