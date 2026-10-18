import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { type Cell, type Puzzle, Rules } from '../engine/index.ts';
import { colors } from '../theme.ts';
import { Board } from './Board.tsx';
import { Fireflies } from './Fireflies.tsx';
import { TIERS, type Tier, puzzleForLevel, tierForLevel } from './levels.ts';
import { type SavedSession, activeStreak, dayKey, recordWin } from '../progress/progress.ts';
import {
  clearSession,
  loadSession,
  loadStats,
  saveSession,
  saveStats,
} from '../progress/storage.ts';

const TIER_COLORS: Record<Tier, string> = {
  easy: colors.tierEasy,
  medium: colors.tierMedium,
  hard: colors.tierHard,
};

function formatTime(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

let seedCounter = Date.now();
const nextSeed = () => ++seedCounter;

interface Game {
  id: number;
  level: number;
  tier: Tier;
  puzzle: Puzzle;
  /** Saved progress to continue from (only for the puzzle restored at launch). */
  resume?: SavedSession;
}

function newGame(level: number): Game {
  const { puzzle, tier } = puzzleForLevel(level, nextSeed());
  return { id: nextSeed(), level, tier, puzzle };
}

/** Restore the unfinished puzzle if there is one, otherwise start the next level. */
function initialGame(): Game {
  const saved = loadSession();
  if (saved && saved.tier in TIERS) {
    return { id: nextSeed(), level: saved.level, tier: saved.tier as Tier, puzzle: saved.puzzle, resume: saved };
  }
  return newGame(loadStats().solved + 1);
}

export function GameScreen() {
  const [game, setGame] = useState(initialGame);
  const [stats, setStats] = useState(loadStats);
  // Next level is generated while the win animation plays (hard grids can take a moment).
  const prepared = useRef<Game | null>(null);

  const onWin = (ms: number, hints: number) => {
    // Read from storage, not state: the gesture handler may hold an older render's closure.
    const result = recordWin(loadStats(), { tier: game.tier, ms, hints, day: dayKey(new Date()) });
    setStats(result.stats);
    saveStats(result.stats);
    clearSession();
    const nextLevel = game.level + 1;
    setTimeout(() => {
      prepared.current = newGame(nextLevel);
    }, 300);
    return { newBest: result.newBest, bestMs: result.stats.byTier[game.tier].bestMs };
  };

  const nextLevel = () => {
    const level = game.level + 1;
    const next = prepared.current?.level === level ? prepared.current : newGame(level);
    prepared.current = null;
    setGame(next);
  };

  /** Swap the current puzzle for another one of the same level. */
  const reroll = () => setGame(newGame(game.level));

  const { level, tier } = game;
  const onSave = useCallback(
    (s: Omit<SavedSession, 'level' | 'tier'>) => saveSession({ level, tier, ...s }),
    [level, tier],
  );

  const streak = activeStreak(stats, dayKey(new Date()));
  const best = stats.byTier[tier]?.bestMs ?? null;
  const nextTier = tierForLevel(level + 1);

  return (
    <View style={styles.root}>
      <Fireflies />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>Lumi</Text>
          <Text style={styles.subtitle}>Dẫn đom đóm qua mọi ô, theo thứ tự các số</Text>
        </View>

        <View style={styles.statsRow}>
          <Stat icon="🔥" value={`${streak}`} label="ngày liên tiếp" />
          <Stat icon="✅" value={`${stats.solved}`} label="màn đã giải" />
          <Stat icon="🏆" value={best !== null ? formatTime(best) : '–'} label={`kỷ lục ${TIERS[tier].label}`} />
        </View>

        <View style={styles.levelRow}>
          <Text style={styles.levelText}>Màn {level}</Text>
          <View style={[styles.tierBadge, { borderColor: TIER_COLORS[tier] }]}>
            <Text style={[styles.tierText, { color: TIER_COLORS[tier] }]}>{TIERS[tier].label}</Text>
          </View>
        </View>

        {/* Keyed by game so all play state resets with a new puzzle. */}
        <PuzzleSession
          key={game.id}
          puzzle={game.puzzle}
          resume={game.resume}
          unlocks={nextTier !== tier ? TIERS[nextTier].label : null}
          onWin={onWin}
          onSave={onSave}
          onNext={nextLevel}
          onReroll={reroll}
        />
      </SafeAreaView>
    </View>
  );
}

function Stat({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>
        {icon} {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

interface Clock {
  /** Time already played before the current run. */
  base: number;
  /** When the current run started; null while paused (not started, app in background, or won). */
  since: number | null;
}

interface SessionProps {
  puzzle: Puzzle;
  resume?: SavedSession;
  /** Label of the difficulty the next level unlocks, if it changes. */
  unlocks: string | null;
  onWin: (ms: number, hints: number) => { newBest: boolean; bestMs: number | null };
  onSave: (session: Omit<SavedSession, 'level' | 'tier'>) => void;
  onNext: () => void;
  onReroll: () => void;
}

function PuzzleSession({ puzzle, resume, unlocks, onWin, onSave, onNext, onReroll }: SessionProps) {
  const { width } = useWindowDimensions();
  const boardSize = Math.min(width - 32, 460);
  const rules = useMemo(() => new Rules(puzzle), [puzzle]);

  const [path, setPathState] = useState<Cell[]>(resume?.path ?? []);
  const pathRef = useRef<Cell[]>(resume?.path ?? []);
  const history = useRef<Cell[][]>([]);
  const gestureStart = useRef<Cell[] | null>(null);

  const [hints, setHintsState] = useState(resume?.hints ?? 0);
  const hintsRef = useRef(resume?.hints ?? 0);

  // A restored game stays paused until the player touches the board again.
  const [clock, setClockState] = useState<Clock>({ base: resume?.elapsedMs ?? 0, since: null });
  const clockRef = useRef<Clock>({ base: resume?.elapsedMs ?? 0, since: null });
  const setClock = (c: Clock) => {
    clockRef.current = c;
    setClockState(c);
  };
  const [now, setNow] = useState(0);

  const [result, setResult] = useState<{ ms: number; newBest: boolean; bestMs: number | null } | null>(null);
  const wonRef = useRef(false);
  const won = result !== null;

  useEffect(() => {
    if (clock.since === null) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [clock.since]);

  const elapsedAt = (t: number) => {
    const c = clockRef.current;
    return c.base + (c.since !== null ? t - c.since : 0);
  };

  const persist = useCallback(() => {
    if (wonRef.current) return;
    onSave({ puzzle, path: pathRef.current, hints: hintsRef.current, elapsedMs: elapsedAt(Date.now()) });
  }, [puzzle, onSave]);

  // Save as soon as the puzzle appears, so reopening the app shows the same one.
  useEffect(() => persist(), [persist]);

  // Pause the clock and save when the app leaves the foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') return;
      const t = Date.now();
      if (clockRef.current.since !== null) setClock({ base: elapsedAt(t), since: null });
      persist();
    });
    return () => sub.remove();
  }, [persist]);

  /** Single entry point for every path change: (re)starts the clock and detects the win. */
  const setPath = (next: Cell[]) => {
    pathRef.current = next;
    setPathState(next);
    const t = Date.now();
    if (clockRef.current.since === null && next.length > 0 && !wonRef.current) {
      setClock({ base: clockRef.current.base, since: t });
      setNow(t);
    }
    if (rules.isWin(next) && !wonRef.current) {
      wonRef.current = true;
      const ms = elapsedAt(t);
      setClock({ base: ms, since: null });
      setResult({ ms, ...onWin(ms, hintsRef.current) });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const onTouch = (cell: Cell) => {
    if (wonRef.current) return;
    const prev = pathRef.current;
    if (gestureStart.current === null) gestureStart.current = prev;
    const next = rules.drag(prev, cell);
    if (next === prev) return;
    if (next.length > prev.length) Haptics.selectionAsync();
    setPath(next);
  };

  const onRelease = () => {
    const before = gestureStart.current;
    gestureStart.current = null;
    if (before && before !== pathRef.current) {
      history.current.push(before);
      persist();
    }
  };

  const undo = () => {
    const prev = history.current.pop();
    if (!prev) return;
    setPath(prev);
    persist();
  };

  const clear = () => {
    if (path.length === 0) return;
    history.current.push(path);
    setPath([]);
    persist();
  };

  const hint = () => {
    history.current.push(path);
    hintsRef.current += 1;
    setHintsState(hintsRef.current);
    setPath(rules.hint(path));
    persist();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const elapsed = result?.ms ?? clock.base + (clock.since !== null ? Math.max(0, now - clock.since) : 0);
  const paused = clock.since === null && path.length > 0 && !won;
  const progress = path.length / rules.total;

  return (
    <>
      <View style={[styles.statusRow, { width: boardSize }]}>
        <Text style={styles.timer}>
          {paused ? '⏸' : '⏱'} {formatTime(elapsed)}
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.timer}>💡 {hints}</Text>
      </View>

      <View style={styles.boardWrap}>
        <Board
          puzzle={puzzle}
          path={path}
          boardSize={boardSize}
          won={won}
          onTouch={onTouch}
          onRelease={onRelease}
        />
      </View>

      {result ? (
        <View style={styles.winCard}>
          <Text style={styles.winTitle}>{result.newBest ? 'Kỷ lục mới! 🏆' : 'Rừng đã sáng! ✨'}</Text>
          <Text style={styles.winText}>
            Thời gian {formatTime(result.ms)}
            {hints > 0 ? ` · ${hints} gợi ý` : ' · không dùng gợi ý'}
          </Text>
          {!result.newBest && result.bestMs !== null && (
            <Text style={styles.winSub}>Kỷ lục: {formatTime(result.bestMs)}</Text>
          )}
          {unlocks && <Text style={styles.unlock}>🔓 Mở khoá độ khó {unlocks}!</Text>}
          <Pressable style={styles.primary} onPress={onNext}>
            <Text style={styles.primaryText}>Màn tiếp theo</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.controls}>
          <ControlButton label="Hoàn tác" icon="↶" onPress={undo} />
          <ControlButton label="Xoá" icon="⟲" onPress={clear} />
          <ControlButton label="Gợi ý" icon="💡" onPress={hint} />
          <ControlButton label="Đổi màn" icon="✦" onPress={onReroll} />
        </View>
      )}
    </>
  );
}

function ControlButton({ label, icon, onPress }: { label: string; icon: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
      <Text style={styles.buttonIcon}>{icon}</Text>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgTop },
  safe: { flex: 1, alignItems: 'center', paddingHorizontal: 16 },
  header: { alignItems: 'center', marginTop: 12, marginBottom: 12 },
  statsRow: { flexDirection: 'row', gap: 24, marginBottom: 14 },
  stat: { alignItems: 'center' },
  statValue: { color: colors.text, fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  statLabel: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  title: { color: colors.accent, fontSize: 40, fontWeight: '800', letterSpacing: 2 },
  subtitle: { color: colors.textDim, fontSize: 14, marginTop: 4, textAlign: 'center' },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  levelText: { color: colors.text, fontSize: 20, fontWeight: '800' },
  tierBadge: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2 },
  tierText: { fontSize: 13, fontWeight: '700' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  timer: { color: colors.text, fontSize: 16, fontVariant: ['tabular-nums'], minWidth: 56 },
  progressTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.button, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.accent, borderRadius: 3 },
  boardWrap: { marginBottom: 20 },
  controls: { flexDirection: 'row', gap: 10 },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 76,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: colors.button,
    borderWidth: 1,
    borderColor: colors.buttonBorder,
  },
  buttonPressed: { opacity: 0.6 },
  buttonIcon: { fontSize: 20, color: colors.text },
  buttonText: { color: colors.text, fontSize: 12, marginTop: 4 },
  winCard: { alignItems: 'center', gap: 8 },
  winTitle: { color: colors.accent, fontSize: 26, fontWeight: '800' },
  winText: { color: colors.text, fontSize: 15 },
  winSub: { color: colors.textDim, fontSize: 13 },
  unlock: { color: colors.firefly, fontSize: 15, fontWeight: '700' },
  primary: {
    marginTop: 8,
    backgroundColor: colors.accent,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 999,
  },
  primaryText: { color: '#2A1A00', fontWeight: '800', fontSize: 16 },
});
