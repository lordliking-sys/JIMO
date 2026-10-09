import { memo, useId, useState } from 'react';
import { View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Line,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { formatNumber } from '../progress/helpers';
import { Copy } from './Surface';
import { ink } from './theme';
import { chartGeometry, type ChartPoint } from './chart';

export const ProgressChart = memo(function ProgressChart({
  points,
  title,
  bars = false,
  small = false,
  format,
}: {
  points: ChartPoint[];
  title: string;
  bars?: boolean;
  small?: boolean;
  format?: (value: number) => string;
}) {
  const { t, i18n } = useTranslation('progress'),
    [width, setWidth] = useState(240),
    id = useId().replace(/:/g, '');
  const height = small ? 46 : 60,
    g = chartGeometry(points, width, height);
  const valid = g.visible.filter((p) => p.value !== null),
    display = format ?? ((n: number) => formatNumber(n, i18n.language));
  if (!valid.length)
    return (
      <View style={{ minHeight: small ? 26 : 52, justifyContent: 'center' }}>
        <Copy>{t('insufficient')}</Copy>
      </View>
    );
  const summary = `${title}. ${valid.map((p) => `${p.label}: ${display(p.value!)}`).join('; ')}`;
  const labels = [
    ...new Set([
      0,
      Math.floor((g.visible.length - 1) / 2),
      g.visible.length - 1,
    ]),
  ];
  return (
    <View
      testID="editorial-chart"
      onLayout={(e) => setWidth(Math.max(1, e.nativeEvent.layout.width))}
      style={{ width: '100%', gap: 3 }}
    >
      <View accessible accessibilityRole="image" accessibilityLabel={summary}>
        <Svg
          accessible={false}
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
        >
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={ink.green} stopOpacity={0.42} />
              <Stop offset="1" stopColor={ink.sage} stopOpacity={0.22} />
            </LinearGradient>
          </Defs>
          <Line
            x1={0}
            x2={width}
            y1={g.baseline}
            y2={g.baseline}
            stroke={ink.border}
            strokeWidth={0.6}
          />
          {bars ? (
            g.visible.map((p, i) =>
              p.value !== null && p.value > 0 ? (
                <Rect
                  key={i}
                  x={
                    ((i + 0.5) * width) / g.visible.length -
                    Math.min(16, (width / g.visible.length) * 0.55) / 2
                  }
                  y={g.y(p.value)}
                  width={Math.min(16, (width / g.visible.length) * 0.55)}
                  height={g.baseline - g.y(p.value)}
                  rx={2}
                  fill={i === g.visible.length - 1 ? ink.green : ink.sage}
                />
              ) : null,
            )
          ) : (
            <>
              {g.segments.map((segment, i) => {
                const path = segment
                  .map(
                    (p, j) => `${j ? 'L' : 'M'}${g.x(p.index)},${g.y(p.value)}`,
                  )
                  .join(' ');
                const first = segment[0]!,
                  last = segment.at(-1)!;
                return segment.length > 1 ? (
                  <Path
                    key={i}
                    d={`${path} L${g.x(last.index)},${g.baseline} L${g.x(first.index)},${g.baseline} Z`}
                    fill={`url(#${id})`}
                  />
                ) : null;
              })}
              {g.segments.map((segment, i) =>
                segment.length > 1 ? (
                  <Path
                    key={i}
                    d={segment
                      .map(
                        (p, j) =>
                          `${j ? 'L' : 'M'}${g.x(p.index)},${g.y(p.value)}`,
                      )
                      .join(' ')}
                    fill="none"
                    stroke={ink.green}
                    strokeWidth={1.7}
                  />
                ) : null,
              )}
              {g.visible.map((p, i) =>
                p.value !== null ? (
                  <Circle
                    key={i}
                    cx={g.x(i)}
                    cy={g.y(p.value)}
                    r={small ? 1.8 : 2.8}
                    fill={ink.card}
                    stroke={ink.green}
                    strokeWidth={1.4}
                  />
                ) : null,
              )}
            </>
          )}
        </Svg>
      </View>
      {!small ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {labels.map((index) => (
            <Copy key={index} style={{ fontSize: 10, lineHeight: 14 }}>
              {g.visible[index]!.label}
            </Copy>
          ))}
        </View>
      ) : null}
      {!bars && valid.length === 1 ? <Copy>{t('insufficient')}</Copy> : null}
      {points.length > 26 ? (
        <Copy>{t('lastPoints', { count: 26 })}</Copy>
      ) : null}
    </View>
  );
});
