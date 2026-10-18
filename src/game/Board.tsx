import { useEffect, useMemo } from 'react';
import { Platform } from 'react-native';
import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  Line,
  Path,
  RoundedRect,
  Skia,
  Text,
  matchFont,
  useClock,
  vec,
} from '@shopify/react-native-skia';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { type Cell, type Puzzle, colOf, rowOf } from '../engine/index.ts';
import { colors } from '../theme.ts';

interface Props {
  puzzle: Puzzle;
  path: Cell[];
  boardSize: number;
  won: boolean;
  onTouch: (cell: Cell) => void;
  onRelease: () => void;
}

export function Board({ puzzle, path, boardSize, won, onTouch, onRelease }: Props) {
  const { size } = puzzle;
  const cell = boardSize / size;
  const gap = Math.max(2, cell * 0.06);

  const center = (c: Cell) => ({
    x: colOf(size, c) * cell + cell / 2,
    y: rowOf(size, c) * cell + cell / 2,
  });

  const font = useMemo(
    () =>
      matchFont({
        fontFamily: Platform.select({ ios: 'Avenir Next', default: 'sans-serif' }),
        fontSize: Math.round(cell * 0.32),
        fontWeight: 'bold',
      }),
    [cell],
  );

  const trail = useMemo(() => {
    const b = Skia.PathBuilder.Make();
    path.forEach((c, i) => {
      const { x, y } = center(c);
      if (i === 0) b.moveTo(x, y);
      else b.lineTo(x, y);
    });
    return b.build();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, cell, size]);

  const visited = useMemo(() => new Set(path), [path]);
  const reached = useMemo(() => {
    let n = 0;
    for (const c of path) n = Math.max(n, puzzle.numbers[c] ?? 0);
    return n;
  }, [path, puzzle]);

  // Firefly at the head of the trail breathes softly.
  const clock = useClock();
  const headRadius = useDerivedValue(() => cell * 0.17 + Math.sin(clock.value / 260) * cell * 0.03);
  const headGlow = useDerivedValue(() => cell * 0.42 + Math.sin(clock.value / 260) * cell * 0.08);

  // On win, a bright pulse races along the whole trail.
  const sweep = useSharedValue(0);
  useEffect(() => {
    sweep.value = 0;
    if (won) sweep.value = withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.cubic) });
  }, [won, sweep]);

  const pan = usePanGesture({
    runOnJS: true,
    minDistance: 0,
    onBegin: (e) => onTouch(cellAt(e.x, e.y)),
    onUpdate: (e) => onTouch(cellAt(e.x, e.y)),
    onFinalize: () => onRelease(),
  });

  function cellAt(x: number, y: number): Cell {
    const col = Math.floor(x / cell);
    const row = Math.floor(y / cell);
    if (col < 0 || row < 0 || col >= size || row >= size) return -1;
    return row * size + col;
  }

  const head = path.length > 0 ? center(path[path.length - 1]) : null;

  return (
    <GestureDetector gesture={pan}>
      <Canvas style={{ width: boardSize, height: boardSize }}>
        {/* Cells */}
        {Array.from({ length: size * size }, (_, c) => (
          <Group key={c}>
            <RoundedRect
              x={colOf(size, c) * cell + gap / 2}
              y={rowOf(size, c) * cell + gap / 2}
              width={cell - gap}
              height={cell - gap}
              r={cell * 0.16}
              color={colors.cell}
            />
            {visited.has(c) && (
              <RoundedRect
                x={colOf(size, c) * cell + gap / 2}
                y={rowOf(size, c) * cell + gap / 2}
                width={cell - gap}
                height={cell - gap}
                r={cell * 0.16}
                color={colors.cellLit}
              />
            )}
          </Group>
        ))}

        {/* Trail: soft glow, body, bright core */}
        {path.length > 1 && (
          <Group>
            <Path
              path={trail}
              style="stroke"
              strokeWidth={cell * 0.5}
              strokeCap="round"
              strokeJoin="round"
              color={colors.glow}
              opacity={0.35}
            >
              <BlurMask blur={cell * 0.22} style="normal" />
            </Path>
            <Path
              path={trail}
              style="stroke"
              strokeWidth={cell * 0.3}
              strokeCap="round"
              strokeJoin="round"
              color={colors.trail}
            />
            <Path
              path={trail}
              style="stroke"
              strokeWidth={cell * 0.1}
              strokeCap="round"
              strokeJoin="round"
              color={colors.trailCore}
              opacity={0.9}
            />
            <Path
              path={trail}
              style="stroke"
              strokeWidth={cell * 0.42}
              strokeCap="round"
              strokeJoin="round"
              color="#FFFFFF"
              start={0}
              end={sweep}
              opacity={won ? 0.55 : 0}
            >
              <BlurMask blur={cell * 0.15} style="solid" />
            </Path>
          </Group>
        )}

        {/* Walls (vines) */}
        {puzzle.walls.map(([a, b]) => {
          const horizontalNeighbours = rowOf(size, a) === rowOf(size, b);
          const r = rowOf(size, a);
          const c = colOf(size, a);
          const p1 = horizontalNeighbours ? vec((c + 1) * cell, r * cell + gap) : vec(c * cell + gap, (r + 1) * cell);
          const p2 = horizontalNeighbours
            ? vec((c + 1) * cell, (r + 1) * cell - gap)
            : vec((c + 1) * cell - gap, (r + 1) * cell);
          return (
            <Line
              key={`${a}-${b}`}
              p1={p1}
              p2={p2}
              color={colors.wall}
              strokeWidth={Math.max(4, cell * 0.1)}
              strokeCap="round"
            />
          );
        })}

        {/* Firefly at the head */}
        {head && !won && (
          <Group>
            <Circle cx={head.x} cy={head.y} r={headGlow} color={colors.firefly} opacity={0.45}>
              <BlurMask blur={cell * 0.2} style="normal" />
            </Circle>
            <Circle cx={head.x} cy={head.y} r={headRadius} color="#F7FFE0" />
          </Group>
        )}

        {/* Checkpoints */}
        {Object.entries(puzzle.numbers).map(([key, n]) => {
          const { x, y } = center(Number(key));
          const lit = n <= reached;
          const label = String(n);
          const w = font.measureText(label).width;
          return (
            <Group key={key}>
              {lit && (
                <Circle cx={x} cy={y} r={cell * 0.36} color={colors.glow} opacity={0.6}>
                  <BlurMask blur={cell * 0.18} style="normal" />
                </Circle>
              )}
              <Circle cx={x} cy={y} r={cell * 0.3} color={lit ? colors.trail : colors.checkpointFill} />
              <Circle
                cx={x}
                cy={y}
                r={cell * 0.3}
                style="stroke"
                strokeWidth={Math.max(2, cell * 0.045)}
                color={colors.checkpointRing}
              />
              <Text
                x={x - w / 2}
                y={y + font.getSize() * 0.36}
                text={label}
                font={font}
                color={lit ? colors.checkpointTextLit : colors.checkpointText}
              />
            </Group>
          );
        })}

      </Canvas>
    </GestureDetector>
  );
}
