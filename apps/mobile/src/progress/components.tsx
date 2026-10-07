import { useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Path, Line } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { Button, Text, colors, spacing, sizes, radius } from '@jimo/ui';
import {
  progressRanges,
  type ProgressRange,
  type ProgressRecord,
} from '@jimo/schemas';
import { formatNumber, recordText } from './helpers';
import { SegmentedControl } from '../components/SegmentedControl';
export function RangeSelector({
  value,
  onChange,
}: {
  value: ProgressRange;
  onChange: (value: ProgressRange) => void;
}) {
  const { t } = useTranslation('progress');
  return (
    <SegmentedControl
      label={t('period')}
      value={value}
      onChange={onChange}
      options={progressRanges.map((range) => ({
        value: range,
        label: t(`rangesCompact.${range}`),
        accessibilityLabel: t(`ranges.${range}`),
      }))}
    />
  );
}
export function SectionTitle({ children }: { children: string }) {
  return (
    <Text
      variant="label"
      accessibilityRole="header"
      color={colors.secondary}
      style={{ letterSpacing: 1, paddingTop: spacing.md }}
    >
      {children}
    </Text>
  );
}
export function Metric({ value, label }: { value: string; label: string }) {
  return (
    <View
      style={{
        flexGrow: 1,
        flexBasis: '42%',
        gap: spacing.xs,
        paddingVertical: spacing.sm,
      }}
    >
      <Text variant="h1">{value}</Text>
      <Text variant="caption" color={colors.secondary}>
        {label}
      </Text>
    </View>
  );
}
export function RecordRow({
  record,
  onPress,
}: {
  record: ProgressRecord;
  onPress: () => void;
}) {
  const { t, i18n } = useTranslation('progress');
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        minHeight: sizes.touch,
        gap: spacing.xs,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderColor: colors.border,
      }}
      accessibilityLabel={`${record.displayName}, ${t(`recordTypes.${record.type}`)}, ${recordText(record, i18n.language)}`}
    >
      <Text variant="bodyMedium">{record.displayName}</Text>
      <Text variant="h3" color={colors.primarySoft}>
        {recordText(record, i18n.language)}
      </Text>
      <Text variant="caption" color={colors.secondary}>
        {t(`modes.${record.loadMode}`)} · {t(`recordTypes.${record.type}`)} ·{' '}
        {new Date(record.date).toLocaleDateString(i18n.language, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}
      </Text>
    </Pressable>
  );
}
export function CacheNotice({
  stale,
  fetchedAt,
}: {
  stale: boolean;
  fetchedAt?: string;
}) {
  const { t, i18n } = useTranslation('progress');
  return stale && fetchedAt ? (
    <Text
      variant="caption"
      color={colors.secondary}
      accessibilityLiveRegion="polite"
    >
      {t('updatedAt', {
        date: new Date(fetchedAt).toLocaleString(i18n.language),
      })}
    </Text>
  ) : null;
}
export function Unavailable({
  retry,
  loading = false,
}: {
  retry: () => void;
  loading?: boolean;
}) {
  const { t } = useTranslation('progress');
  return (
    <View style={{ gap: spacing.sm }}>
      <Text color={colors.secondary}>
        {t(loading ? 'loading' : 'unavailable')}
      </Text>
      {!loading ? (
        <Button label={t('retry')} variant="secondary" onPress={retry} />
      ) : null}
    </View>
  );
}
export type ChartPoint = { label: string; value: number | null };
/** SVG is decorative; text, tap targets and selected value expose every rendered point. */
export function ProgressChart({
  points,
  title,
  bars = false,
  format,
}: {
  points: ChartPoint[];
  title: string;
  bars?: boolean;
  format?: (value: number) => string;
}) {
  const { t, i18n } = useTranslation('progress'),
    { width } = useWindowDimensions();
  const [selection, setSelection] = useState<number | null>(null);
  const visible = points.slice(-26),
    valid = visible.filter((p) => p.value !== null);
  const display = format ?? ((n: number) => formatNumber(n, i18n.language));
  if (!valid.length)
    return (
      <Text variant="caption" color={colors.secondary}>
        {t('insufficient')}
      </Text>
    );
  const first = valid[0]!,
    last = valid.at(-1)!,
    summary = `${first.label}: ${display(first.value!)}${valid.length > 1 ? ` → ${last.label}: ${display(last.value!)}` : ''}`;
  const chartWidth = Math.max(
      220,
      Math.min(width - spacing.lg * 2, sizes.content),
    ),
    height = 128,
    pad = 12;
  const maximum = Math.max(...valid.map((p) => p.value!), 1),
    minimum = bars ? 0 : Math.min(...valid.map((p) => p.value!)),
    spread = Math.max(maximum - minimum, 1);
  const x = (index: number) =>
      pad + (index * (chartWidth - 2 * pad)) / Math.max(visible.length - 1, 1),
    y = (value: number) =>
      height - pad - ((value - minimum) / spread) * (height - 2 * pad);
  const path = visible
    .map((p, index) => {
      if (p.value === null) return '';
      const command =
        index > 0 && visible[index - 1]?.value !== null ? 'L' : 'M';
      return `${command}${x(index)},${y(p.value)}`;
    })
    .join(' ');
  const selected = selection !== null ? visible[selection] : last;
  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="bodyMedium" accessibilityRole="header">
        {title}
      </Text>
      <Text variant="caption" color={colors.secondary}>
        {summary}
      </Text>
      <View
        accessibilityLabel={`${title}. ${summary}`}
        accessibilityRole="image"
      >
        <Svg width={chartWidth} height={height} accessible={false}>
          <Line
            x1={pad}
            x2={chartWidth - pad}
            y1={height - pad}
            y2={height - pad}
            stroke={colors.border}
          />
          {bars ? (
            visible.map((p, index) =>
              p.value !== null ? (
                <Line
                  key={index}
                  x1={
                    pad +
                    ((index + 0.5) * (chartWidth - pad * 2)) / visible.length
                  }
                  x2={
                    pad +
                    ((index + 0.5) * (chartWidth - pad * 2)) / visible.length
                  }
                  y1={height - pad}
                  y2={y(p.value)}
                  stroke={colors.primarySoft}
                  strokeWidth={Math.min(
                    18,
                    ((chartWidth - pad * 2) / visible.length) * 0.5,
                  )}
                  strokeLinecap="round"
                />
              ) : null,
            )
          ) : (
            <>
              {valid.length > 1 ? (
                <Path
                  d={path}
                  fill="none"
                  stroke={colors.primarySoft}
                  strokeWidth={2}
                />
              ) : null}
              {visible.map((p, index) =>
                p.value !== null ? (
                  <Circle
                    key={index}
                    cx={x(index)}
                    cy={y(p.value)}
                    r={3}
                    fill={colors.primarySoft}
                  />
                ) : null,
              )}
            </>
          )}
        </Svg>
      </View>
      {selected?.value !== null && selected ? (
        <Text variant="caption">
          {selected.label} · {display(selected.value!)}
        </Text>
      ) : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.xs }}
      >
        {visible.map((p, index) =>
          p.value !== null ? (
            <Pressable
              key={index}
              accessibilityRole="button"
              accessibilityLabel={`${p.label}: ${display(p.value)}`}
              accessibilityState={{ selected: selection === index }}
              onPress={() => setSelection(index)}
              style={{
                minHeight: sizes.touch,
                minWidth: sizes.touch,
                justifyContent: 'center',
                paddingHorizontal: spacing.sm,
                borderRadius: radius.small,
                backgroundColor:
                  selection === index ? colors.surface : colors.background,
              }}
            >
              <Text variant="caption" color={colors.secondary}>
                {p.label}
              </Text>
            </Pressable>
          ) : null,
        )}
      </ScrollView>
      {!bars && valid.length < 2 ? (
        <Text variant="caption" color={colors.secondary}>
          {t('insufficient')}
        </Text>
      ) : null}
      {points.length > 26 ? (
        <Text variant="caption" color={colors.secondary}>
          {t('lastPoints', { count: 26 })}
        </Text>
      ) : null}
    </View>
  );
}
