import { useId, useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Line,
  Path,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { IconButton, Text, animePink } from '@jimo/ui';
import { useTranslation } from 'react-i18next';
import type { ExerciseModeMetrics } from '@jimo/schemas';
import { formatNumber } from '../progress/helpers';
import { Copy } from './Surface';
import {
  chronologicalSessions,
  observation,
  observedSegments,
  performanceLanes,
  performanceScale,
} from './performance-chart';

export function PerformanceChart({
  mode,
  name,
}: {
  mode: ExerciseModeMetrics;
  name: string;
}) {
  const { t, i18n } = useTranslation(['progressProfile', 'progress']),
    id = `performance-${useId().replace(/[^a-zA-Z0-9]/g, '')}`,
    [width, setWidth] = useState(260),
    [selected, setSelected] = useState<number | null>(null);
  const points = chronologicalSessions(mode.timeline),
    lanes = performanceLanes(mode),
    index = Math.max(
      0,
      Math.min(selected ?? points.length - 1, points.length - 1),
    ),
    current = points[index];
  const left = 43,
    right = Math.max(left + 1, width - 10),
    top = 8,
    bottom = 100;
  const first = points[0] ? Date.parse(points[0].date) : 0,
    last = points.at(-1) ? Date.parse(points.at(-1)!.date) : first;
  const x = (i: number) =>
    last === first
      ? (left + right) / 2
      : left +
        ((Date.parse(points[i]!.date) - first) / (last - first)) *
          (right - left);
  const date = (value: string, long = false) =>
    new Date(value).toLocaleDateString(i18n.language, {
      day: 'numeric',
      month: long ? 'long' : 'short',
      ...(long ? { year: 'numeric' } : {}),
    });
  const valueText = (value: number | null, unit: string) =>
    value === null
      ? '—'
      : `${formatNumber(value, i18n.language, unit === 'kg' ? 2 : 0)} ${unit}`;
  if (!current) return <Copy>{t('progress:noExercisePeriod')}</Copy>;
  const summary = `${name}. ${date(current.date, true)}. ${lanes.map((lane) => `${t(lane.label)}: ${valueText(observation(current, lane.key), lane.unit)}`).join('. ')}`;
  return (
    <View
      testID="personal-performance-chart"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ gap: 16 }}
    >
      <View accessible accessibilityRole="image" accessibilityLabel={summary}>
        {lanes.map((lane, laneIndex) => {
          const values = points.map((point) => observation(point, lane.key)),
            scale = performanceScale(values, lane.unit !== 'kg');
          const y = (value: number) =>
            bottom -
            ((value - scale!.low) / (scale!.high - scale!.low)) *
              (bottom - top);
          return (
            <View key={lane.key} style={{ gap: 5, marginBottom: 10 }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  gap: 8,
                }}
              >
                <Copy style={{ flex: 1, fontSize: 12 }}>{t(lane.label)}</Copy>
                <Text variant="bodyMedium" color={animePink.primaryText}>
                  {valueText(observation(current, lane.key), lane.unit)}
                </Text>
              </View>
              {scale ? (
                <Pressable
                  accessible={false}
                  onPress={(event) => {
                    const target = event.nativeEvent.locationX;
                    let nearest = 0;
                    points.forEach((_point, i) => {
                      if (
                        Math.abs(x(i) - target) < Math.abs(x(nearest) - target)
                      )
                        nearest = i;
                    });
                    setSelected(nearest);
                  }}
                >
                  <Svg
                    accessible={false}
                    width="100%"
                    height={128}
                    viewBox={`0 0 ${width} 128`}
                  >
                    <Defs>
                      <LinearGradient
                        id={`${id}-${laneIndex}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <Stop
                          offset="0"
                          stopColor={animePink.primaryPink}
                          stopOpacity={0.22}
                        />
                        <Stop
                          offset="1"
                          stopColor={animePink.primaryPink}
                          stopOpacity={0.01}
                        />
                      </LinearGradient>
                    </Defs>
                    {scale.ticks.map((tick) => (
                      <ViewlessGrid
                        key={tick}
                        tick={tick}
                        y={y(tick)}
                        left={left}
                        right={right}
                        label={formatNumber(
                          tick,
                          i18n.language,
                          lane.unit === 'kg' ? 2 : 0,
                        )}
                      />
                    ))}
                    {observedSegments(values).map((segment, i) => {
                      if (segment.length < 2) return null;
                      const path = segment
                        .map(
                          (p, n) =>
                            `${n ? 'L' : 'M'} ${x(p.index)} ${y(p.value)}`,
                        )
                        .join(' ');
                      return (
                        <Path
                          key={`area-${i}`}
                          d={`${path} L ${x(segment.at(-1)!.index)} ${bottom} L ${x(segment[0]!.index)} ${bottom} Z`}
                          fill={`url(#${id}-${laneIndex})`}
                        />
                      );
                    })}
                    {observedSegments(values).map((segment, i) =>
                      segment.length > 1 ? (
                        <Path
                          key={`line-${i}`}
                          d={segment
                            .map(
                              (p, n) =>
                                `${n ? 'L' : 'M'} ${x(p.index)} ${y(p.value)}`,
                            )
                            .join(' ')}
                          fill="none"
                          stroke={animePink.primaryAction}
                          strokeWidth={2.2}
                          strokeLinejoin="round"
                          strokeLinecap="round"
                        />
                      ) : null,
                    )}
                    <Line
                      x1={x(index)}
                      x2={x(index)}
                      y1={top}
                      y2={bottom}
                      stroke={animePink.primaryText}
                      strokeOpacity={0.4}
                      strokeDasharray="3 4"
                    />
                    {values.map((value, i) =>
                      value !== null ? (
                        <Circle
                          key={i}
                          cx={x(i)}
                          cy={y(value)}
                          r={i === index ? 4.5 : 2.5}
                          fill={
                            i === index
                              ? animePink.primaryAction
                              : animePink.surface
                          }
                          stroke={animePink.primaryAction}
                          strokeWidth={1.5}
                        />
                      ) : null,
                    )}
                    {[
                      ...new Set([
                        0,
                        Math.floor((points.length - 1) / 2),
                        points.length - 1,
                      ]),
                    ].map((i, j, all) => (
                      <SvgText
                        key={i}
                        x={x(i)}
                        y={121}
                        textAnchor={
                          points.length === 1
                            ? 'middle'
                            : j === 0
                              ? 'start'
                              : j === all.length - 1
                                ? 'end'
                                : 'middle'
                        }
                        fill={animePink.textSecondary}
                        fontFamily="Inter_400Regular"
                        fontSize={10}
                      >
                        {date(points[i]!.date)}
                      </SvgText>
                    ))}
                  </Svg>
                </Pressable>
              ) : (
                <Copy>{t('progress:insufficient')}</Copy>
              )}
            </View>
          );
        })}
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
        }}
      >
        <IconButton
          label={t('previousSession')}
          icon={<ChevronLeft size={22} color={animePink.primaryText} />}
          disabled={index === 0}
          onPress={() => setSelected(index - 1)}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="caption" style={{ textAlign: 'center' }}>
            {date(current.date, true)}
          </Text>
          <Copy style={{ textAlign: 'center', fontSize: 11 }}>
            {t('sessionIndex', { current: index + 1, total: points.length })}
          </Copy>
        </View>
        <IconButton
          label={t('nextSession')}
          icon={<ChevronRight size={22} color={animePink.primaryText} />}
          disabled={index === points.length - 1}
          onPress={() => setSelected(index + 1)}
        />
      </View>
      <Copy style={{ fontSize: 11, lineHeight: 16 }}>
        {t(
          mode.loadMode === 'assisted'
            ? 'assistanceNote'
            : mode.loadMode === 'bodyweight'
              ? 'bodyweightNote'
              : 'sessionMaximaNote',
        )}
      </Copy>
      {points.length === 1 ? <Copy>{t('progress:insufficient')}</Copy> : null}
    </View>
  );
}
function ViewlessGrid({
  tick: _tick,
  y,
  left,
  right,
  label,
}: {
  tick: number;
  y: number;
  left: number;
  right: number;
  label: string;
}) {
  return (
    <>
      <Line
        x1={left}
        x2={right}
        y1={y}
        y2={y}
        stroke={animePink.border}
        strokeWidth={0.6}
        strokeDasharray="3 4"
      />
      <SvgText
        x={left - 8}
        y={y + 3.5}
        textAnchor="end"
        fill={animePink.textSecondary}
        fontFamily="Inter_400Regular"
        fontSize={10}
      >
        {label}
      </SvgText>
    </>
  );
}
