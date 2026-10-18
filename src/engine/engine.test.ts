/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generatePuzzle, randomHamiltonianPath } from './generator.ts';
import { createRng } from './random.ts';
import { Rules } from './rules.ts';
import { solve } from './solver.ts';
import { type Puzzle, edgeKey, isAdjacent, wallSet } from './types.ts';

function assertHamiltonian(size: number, path: number[]) {
  assert.equal(path.length, size * size);
  assert.equal(new Set(path).size, size * size);
  for (let i = 1; i < path.length; i++) assert.ok(isAdjacent(size, path[i - 1], path[i]));
}

// 3x3, solution = serpentine 0 1 2 5 4 3 6 7 8
const tiny: Puzzle = {
  size: 3,
  numbers: { 0: 1, 4: 2, 8: 3 },
  walls: [],
  solution: [0, 1, 2, 5, 4, 3, 6, 7, 8],
};

test('random Hamiltonian path covers every cell', () => {
  const rng = createRng(42);
  for (const size of [4, 5, 6, 7, 8]) assertHamiltonian(size, randomHamiltonianPath(size, rng));
});

test('solver finds the known solution of a tiny puzzle', () => {
  const r = solve(tiny, { limit: 10 });
  assert.ok(r.solutions.some((s) => s.join() === tiny.solution.join()));
});

test('generated puzzles are unique, consistent and deterministic', () => {
  for (const [size, walls] of [
    [5, 0],
    [6, 0],
    [6, 3],
    [7, 2],
  ] as const) {
    const p = generatePuzzle({ size, seed: `t-${size}-${walls}`, walls });
    assertHamiltonian(size, p.solution);
    const r = solve(p, { limit: 2, nodeLimit: 2_000_000 });
    assert.equal(r.aborted, false);
    assert.equal(r.solutions.length, 1);
    assert.deepEqual(r.solutions[0], p.solution);
    const ws = wallSet(p);
    for (let i = 1; i < p.solution.length; i++) {
      assert.ok(!ws.has(edgeKey(p.solution[i - 1], p.solution[i])), 'solution crosses a wall');
    }
    const again = generatePuzzle({ size, seed: `t-${size}-${walls}`, walls });
    assert.deepEqual(again, p);
  }
});

test('rules: start, extend, backtrack, cut, win', () => {
  const rules = new Rules(tiny);
  let path: number[] = [];
  assert.equal(rules.drag(path, 4), path, 'cannot start away from 1');
  path = rules.drag(path, 0);
  assert.deepEqual(path, [0]);
  path = rules.drag(path, 1);
  path = rules.drag(path, 2);
  assert.deepEqual(path, [0, 1, 2]);
  path = rules.drag(path, 1);
  assert.deepEqual(path, [0, 1], 'drag back shortens');
  assert.equal(rules.drag(path, 8), path, 'cannot jump non-adjacent');
  path = rules.drag([0], 2);
  assert.deepEqual(path, [0, 1, 2], 'straight swipe fills gaps');
  assert.equal(rules.canStep([0, 1, 2, 5], 8), false, 'cannot skip checkpoint 2');
  assert.deepEqual(rules.drag([0, 1, 2], 4), [0, 1, 2, 5, 4], 'diagonal routes via a legal corner');
  for (const c of tiny.solution.slice(3)) path = rules.drag(path, c);
  assert.ok(rules.isWin(path));
  assert.deepEqual(rules.drag(path, 1), [0, 1], 'tap visited cell cuts the path');
});

test('rules: walls block movement', () => {
  const rules = new Rules({ ...tiny, walls: [[0, 1]] });
  assert.equal(rules.canStep([0], 1), false);
  assert.equal(rules.canStep([0], 3), true);
});

test('hint keeps correct prefix and extends toward next checkpoint', () => {
  const rules = new Rules(tiny);
  assert.deepEqual(rules.hint([0, 3]), [0, 1, 2, 5, 4]);
  assert.deepEqual(rules.hint([]), [0, 1, 2, 5, 4]);
});
