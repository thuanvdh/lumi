import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { type Cell, type Puzzle, Rules, generatePuzzle } from '../engine/index.ts';
import { colors } from '../theme.ts';
import { Board } from './Board.tsx';
import { Fireflies } from './Fireflies.tsx';

const SIZES = [5, 6, 7] as const;
const wallsFor = (size: number) => (size >= 6 ? size - 3 : 0);

function formatTime(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

let seedCounter = Date.now();
const nextSeed = () => ++seedCounter;

export function GameScreen() {
  const [size, setSize] = useState<number>(6);
  const [seed, setSeed] = useState(nextSeed);
  const puzzle = useMemo(() => generatePuzzle({ size, seed, walls: wallsFor(size) }), [size, seed]);

  const newPuzzle = (nextSize = size) => {
    setSize(nextSize);
    setSeed(nextSeed());
  };

  return (
    <View style={styles.root}>
      <Fireflies />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>Lumi</Text>
          <Text style={styles.subtitle}>Dẫn đom đóm qua mọi ô, theo thứ tự các số</Text>
        </View>

        <View style={styles.sizeRow}>
          {SIZES.map((s) => (
            <Pressable
              key={s}
              onPress={() => newPuzzle(s)}
              style={[styles.chip, s === size && styles.chipActive]}
            >
              <Text style={[styles.chipText, s === size && styles.chipTextActive]}>
                {s}×{s}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Keyed by puzzle so all play state resets with a new puzzle. */}
        <PuzzleSession key={`${size}:${seed}`} puzzle={puzzle} onNext={() => newPuzzle()} />
      </SafeAreaView>
    </View>
  );
}

function PuzzleSession({ puzzle, onNext }: { puzzle: Puzzle; onNext: () => void }) {
  const { width } = useWindowDimensions();
  const boardSize = Math.min(width - 32, 460);
  const rules = useMemo(() => new Rules(puzzle), [puzzle]);

  const [path, setPathState] = useState<Cell[]>([]);
  const pathRef = useRef<Cell[]>([]);
  const history = useRef<Cell[][]>([]);
  const gestureStart = useRef<Cell[] | null>(null);
  const [hints, setHints] = useState(0);

  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [finalTime, setFinalTime] = useState<number | null>(null);
  const won = finalTime !== null;

  useEffect(() => {
    if (startedAt === null || won) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [startedAt, won]);

  /** Single entry point for every path change: starts the clock and detects the win. */
  const setPath = useCallback(
    (next: Cell[]) => {
      pathRef.current = next;
      setPathState(next);
      const t = Date.now();
      const start = startedAt ?? t;
      if (startedAt === null && next.length > 0) {
        setStartedAt(t);
        setNow(t);
      }
      if (rules.isWin(next)) {
        setFinalTime(t - start);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
    [rules, startedAt],
  );

  const onTouch = useCallback(
    (cell: Cell) => {
      if (won) return;
      const prev = pathRef.current;
      if (gestureStart.current === null) gestureStart.current = prev;
      const next = rules.drag(prev, cell);
      if (next === prev) return;
      if (next.length > prev.length) Haptics.selectionAsync();
      setPath(next);
    },
    [rules, won, setPath],
  );

  const onRelease = useCallback(() => {
    const before = gestureStart.current;
    gestureStart.current = null;
    if (before && before !== pathRef.current) history.current.push(before);
  }, []);

  const undo = () => {
    const prev = history.current.pop();
    if (prev) setPath(prev);
  };

  const clear = () => {
    if (path.length === 0) return;
    history.current.push(path);
    setPath([]);
  };

  const hint = () => {
    history.current.push(path);
    setHints((h) => h + 1);
    setPath(rules.hint(path));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const elapsed = finalTime ?? (startedAt !== null ? now - startedAt : 0);
  const progress = path.length / rules.total;

  return (
    <>
      <View style={[styles.statusRow, { width: boardSize }]}>
        <Text style={styles.timer}>⏱ {formatTime(elapsed)}</Text>
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

      {won ? (
        <View style={styles.winCard}>
          <Text style={styles.winTitle}>Rừng đã sáng! ✨</Text>
          <Text style={styles.winText}>
            Thời gian {formatTime(elapsed)}
            {hints > 0 ? ` · ${hints} gợi ý` : ' · không dùng gợi ý'}
          </Text>
          <Pressable style={styles.primary} onPress={onNext}>
            <Text style={styles.primaryText}>Màn tiếp theo</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.controls}>
          <ControlButton label="Hoàn tác" icon="↶" onPress={undo} />
          <ControlButton label="Xoá" icon="⟲" onPress={clear} />
          <ControlButton label="Gợi ý" icon="💡" onPress={hint} />
          <ControlButton label="Màn mới" icon="✦" onPress={onNext} />
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
  header: { alignItems: 'center', marginTop: 12, marginBottom: 16 },
  title: { color: colors.accent, fontSize: 40, fontWeight: '800', letterSpacing: 2 },
  subtitle: { color: colors.textDim, fontSize: 14, marginTop: 4, textAlign: 'center' },
  sizeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.buttonBorder,
    backgroundColor: colors.button,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.text, fontWeight: '600' },
  chipTextActive: { color: '#2A1A00' },
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
  primary: {
    marginTop: 8,
    backgroundColor: colors.accent,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 999,
  },
  primaryText: { color: '#2A1A00', fontWeight: '800', fontSize: 16 },
});
