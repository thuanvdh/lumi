/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { solve } from '../engine/solver.ts';
import { TIERS, puzzleForLevel, tierForLevel } from './levels.ts';

test('tiers progress easy → medium → hard', () => {
  assert.equal(tierForLevel(1), 'easy');
  assert.equal(tierForLevel(10), 'easy');
  assert.equal(tierForLevel(11), 'medium');
  assert.equal(tierForLevel(30), 'medium');
  assert.equal(tierForLevel(31), 'hard');
  assert.equal(tierForLevel(500), 'hard');
});

test('level puzzles match their tier and stay uniquely solvable', () => {
  for (const level of [1, 5, 11, 20, 31, 40]) {
    for (let i = 0; i < 3; i++) {
      const { puzzle, tier } = puzzleForLevel(level, `t${i}`);
      assert.equal(tier, tierForLevel(level));
      assert.ok(TIERS[tier].sizes.includes(puzzle.size), `${tier} size ${puzzle.size}`);
      const r = solve(puzzle, { limit: 2, nodeLimit: 2_000_000 });
      assert.equal(r.solutions.length, 1);
      assert.deepEqual(r.solutions[0], puzzle.solution);
    }
  }
});

test('easy puzzles give more checkpoints per cell than hard ones', () => {
  const density = (level: number) => {
    let sum = 0;
    for (let i = 0; i < 10; i++) {
      const { puzzle } = puzzleForLevel(level, `d${i}`);
      sum += Object.keys(puzzle.numbers).length / (puzzle.size * puzzle.size);
    }
    return sum / 10;
  };
  assert.ok(density(1) > density(31));
});
