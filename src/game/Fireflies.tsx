import { useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { BlurMask, Canvas, Circle, Group, LinearGradient, Rect, useClock, vec } from '@shopify/react-native-skia';
import { type SharedValue, useDerivedValue } from 'react-native-reanimated';
import { createRng } from '../engine/index.ts';
import { colors } from '../theme.ts';

interface Bug {
  x: number;
  y: number;
  r: number;
  ax: number;
  ay: number;
  speed: number;
  phase: number;
}

function Firefly({ bug, clock }: { bug: Bug; clock: SharedValue<number> }) {
  const cx = useDerivedValue(() => bug.x + Math.sin(clock.value * bug.speed + bug.phase) * bug.ax);
  const cy = useDerivedValue(() => bug.y + Math.cos(clock.value * bug.speed * 0.8 + bug.phase) * bug.ay);
  const opacity = useDerivedValue(() => 0.25 + 0.75 * Math.max(0, Math.sin(clock.value * bug.speed * 2.3 + bug.phase)));
  return (
    <Group opacity={opacity}>
      <Circle cx={cx} cy={cy} r={bug.r * 3} color={colors.firefly} opacity={0.35}>
        <BlurMask blur={bug.r * 2.5} style="normal" />
      </Circle>
      <Circle cx={cx} cy={cy} r={bug.r} color="#F4FFD0" />
    </Group>
  );
}

/** Night-sky gradient with a few drifting fireflies; sits behind the whole screen. */
export function Fireflies({ count = 14 }: { count?: number }) {
  const { width, height } = useWindowDimensions();
  const clock = useClock();
  const bugs = useMemo(() => {
    const rng = createRng(7);
    return Array.from({ length: count }, () => ({
      x: rng() * width,
      y: rng() * height,
      r: 1.2 + rng() * 1.8,
      ax: 20 + rng() * 40,
      ay: 15 + rng() * 35,
      speed: 0.0002 + rng() * 0.0004,
      phase: rng() * Math.PI * 2,
    }));
  }, [count, width, height]);

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={[colors.bgTop, colors.bgBottom]} />
      </Rect>
      {bugs.map((b, i) => (
        <Firefly key={i} bug={b} clock={clock} />
      ))}
    </Canvas>
  );
}
