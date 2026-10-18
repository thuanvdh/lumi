/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activeStreak, dayKey, emptyStats, isValidSession, recordWin } from './progress.ts';

test('dayKey uses the local calendar day', () => {
  assert.equal(dayKey(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
});

test('streak grows on consecutive days, holds within a day, resets after a gap', () => {
  let s = emptyStats();
  s = recordWin(s, { tier: 'easy', ms: 1000, hints: 0, day: '2026-02-27' }).stats;
  s = recordWin(s, { tier: 'easy', ms: 1000, hints: 0, day: '2026-02-28' }).stats;
  s = recordWin(s, { tier: 'easy', ms: 1000, hints: 0, day: '2026-03-01' }).stats; // month boundary
  assert.equal(s.streak.current, 3);
  s = recordWin(s, { tier: 'easy', ms: 1000, hints: 0, day: '2026-03-01' }).stats;
  assert.equal(s.streak.current, 3, 'second win same day');
  assert.equal(activeStreak(s, '2026-03-02'), 3, 'still alive the next day');
  assert.equal(activeStreak(s, '2026-03-03'), 0, 'broken after a missed day');
  s = recordWin(s, { tier: 'easy', ms: 1000, hints: 0, day: '2026-03-05' }).stats;
  assert.equal(s.streak.current, 1);
  assert.equal(s.streak.best, 3);
  assert.equal(s.solved, 5);
});

test('best time only counts hint-free wins, per tier', () => {
  let s = emptyStats();
  let r = recordWin(s, { tier: 'easy', ms: 50_000, hints: 0, day: '2026-01-01' });
  assert.equal(r.newBest, true);
  s = r.stats;
  r = recordWin(s, { tier: 'easy', ms: 10_000, hints: 2, day: '2026-01-01' });
  assert.equal(r.newBest, false, 'hinted win is not a record');
  s = r.stats;
  r = recordWin(s, { tier: 'easy', ms: 40_000, hints: 0, day: '2026-01-01' });
  assert.equal(r.newBest, true);
  s = r.stats;
  assert.equal(s.byTier.easy.bestMs, 40_000);
  assert.equal(s.byTier.easy.solved, 3);
  assert.equal(s.byTier.easy.cleanSolved, 2);
  assert.equal(s.byTier.hard, undefined);
});

test('isValidSession rejects corrupted saves', () => {
  const puzzle = { size: 2, numbers: { 0: 1, 2: 2 }, walls: [], solution: [0, 1, 3, 2] };
  const base = { level: 1, tier: 'easy' };
  assert.ok(isValidSession({ ...base, puzzle, path: [0, 1], hints: 0, elapsedMs: 0 }));
  assert.ok(!isValidSession(null));
  assert.ok(!isValidSession({ puzzle, path: [], hints: 0, elapsedMs: 0 }), 'missing level');
  assert.ok(!isValidSession({ ...base, puzzle, path: [0, 9], hints: 0, elapsedMs: 0 }));
  assert.ok(!isValidSession({ ...base, puzzle: { ...puzzle, solution: [0] }, path: [], hints: 0, elapsedMs: 0 }));
});
