import { animePink, uiDepth, SoftHighlight } from '@jimo/ui';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { progressRanges, type ProgressRange } from '@jimo/schemas';
import { EditorialText, Copy } from './Surface';
import { ink } from './theme';

export const progressTabs = [
  'overview',
  'strength',
  'volume',
  'frequency',
] as const;
export type ProgressTab = (typeof progressTabs)[number];
export function ProgressTabs({
  value,
  onChange,
}: {
  value: ProgressTab;
  onChange: (value: ProgressTab) => void;
}) {
  const { t } = useTranslation('progressProfile');
  const compact = useWindowDimensions().width < 360;
  return (
    <View testID="progress-tabs-scroll" style={{ width: '100%' }}>
      <View
        accessibilityRole="tablist"
        accessibilityLabel={t('sections')}
        style={{
          flexDirection: 'row',
          gap: compact ? 4 : 6,
          width: '100%',
          alignItems: 'stretch',
        }}
      >
        {progressTabs.map((tab) => (
          <Pressable
            key={tab}
            accessibilityRole="tab"
            aria-selected={tab === value}
            accessibilityState={{ selected: tab === value }}
            onPress={() => onChange(tab)}
            style={({ pressed }) => ({
              opacity: pressed ? 0.85 : 1,
              flexBasis: 0,
              flexGrow:
                tab === 'overview'
                  ? 1.35
                  : tab === 'strength'
                    ? 0.75
                    : tab === 'volume'
                      ? 0.9
                      : 1.2,
              flexShrink: 1,
              minWidth: 0,
              minHeight: 48,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 5,
            })}
          >
            <View
              pointerEvents="none"
              style={{
                minHeight: 34,
                justifyContent: 'center',
                alignItems: 'center',
                alignSelf: 'stretch',
                flex: 1,
                paddingHorizontal: compact ? 3 : 5,
                paddingVertical: 5,
                borderRadius: 17,
                borderWidth: 1,
                ...(tab === value ? uiDepth.action : uiDepth.card),
                backgroundColor:
                  tab === value
                    ? animePink.primaryAction
                    : 'rgba(24,19,28,0.9)',
                borderColor:
                  tab === value
                    ? animePink.primaryPinkSoft
                    : animePink.darkBorder,
              }}
            >
              <SoftHighlight radius={17} />
              <EditorialText
                style={{
                  fontSize: compact ? 12 : 13,
                  lineHeight: 20,
                  textAlign: 'center',
                  color: animePink.white,
                }}
              >
                {t(`tabs.${tab}`)}
              </EditorialText>
              <View
                accessible={false}
                style={{
                  height: 2,
                  width: 20,
                  position: 'absolute',
                  bottom: 3,
                  backgroundColor: 'transparent',
                }}
              />
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
export function PeriodSelector({
  value,
  onChange,
}: {
  value: ProgressRange;
  onChange: (value: ProgressRange) => void;
}) {
  const { t } = useTranslation('progress');
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 2, flexGrow: 1 }}
    >
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={t('period')}
        style={{ flexDirection: 'row', flex: 1, gap: 2 }}
      >
        {progressRanges.map((range) => (
          <Pressable
            key={range}
            accessibilityRole="radio"
            accessibilityLabel={t(`ranges.${range}`)}
            accessibilityState={{ checked: value === range }}
            aria-checked={value === range}
            onPress={() => onChange(range)}
            style={{
              minHeight: 48,
              minWidth: 48,
              flex: 1,
              paddingHorizontal: 4,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Copy
              style={{
                color: value === range ? animePink.white : ink.secondary,
                backgroundColor:
                  value === range ? animePink.primaryAction : 'transparent',
                borderRadius: 18,
                paddingVertical: 7,
                paddingHorizontal: 6,
                overflow: 'hidden',
                fontSize: 11,
                fontFamily:
                  value === range ? 'Inter_600SemiBold' : 'Inter_400Regular',
              }}
            >
              {t(`rangesCompact.${range}`)}
            </Copy>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
export function Action({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 48,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: ink.green,
        borderRadius: 18,
        backgroundColor: ink.card,
        opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
      })}
    >
      <Copy style={{ color: ink.green, fontFamily: 'Inter_500Medium' }}>
        {label}
      </Copy>
    </Pressable>
  );
}
export function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <EditorialText
      accessibilityRole="header"
      style={{ fontSize: 24, lineHeight: 28 }}
    >
      {children}
    </EditorialText>
  );
}
export function HistoryFilter({
  value,
  onChange,
}: {
  value: 'completed' | 'cancelled' | 'all';
  onChange: (value: 'completed' | 'cancelled' | 'all') => void;
}) {
  const { t } = useTranslation('progress');
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={t('history')}
      style={{ flexDirection: 'row', gap: 4 }}
    >
      {(['completed', 'cancelled', 'all'] as const).map((status) => (
        <Pressable
          key={status}
          accessibilityRole="radio"
          aria-checked={value === status}
          accessibilityState={{ checked: value === status }}
          onPress={() => onChange(status)}
          style={{
            flex: 1,
            minHeight: 48,
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: 18,
            borderWidth: value === status ? 2 : 1,
            borderColor: value === status ? ink.green : ink.border,
            paddingHorizontal: 4,
          }}
        >
          <Copy style={{ fontSize: 11, color: ink.charcoal }}>
            {t(`historyStatus.${status}`)}
          </Copy>
        </Pressable>
      ))}
    </View>
  );
}
export function DataNotice({
  loading = false,
  retry,
}: {
  loading?: boolean;
  retry?: () => void;
}) {
  const { t } = useTranslation('progress');
  return (
    <View style={{ gap: 8 }}>
      <Copy accessibilityLiveRegion="polite">
        {t(loading ? 'loading' : 'unavailable')}
      </Copy>
      {!loading && retry ? <Action label={t('retry')} onPress={retry} /> : null}
    </View>
  );
}
export function CacheNote({
  stale,
  fetchedAt,
}: {
  stale: boolean;
  fetchedAt?: string;
}) {
  const { t, i18n } = useTranslation('progress');
  return stale && fetchedAt ? (
    <Copy accessibilityLiveRegion="polite">
      {t('updatedAt', {
        date: new Date(fetchedAt).toLocaleString(i18n.language),
      })}
    </Copy>
  ) : null;
}
