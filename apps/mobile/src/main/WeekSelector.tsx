import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useReducedMotion } from 'react-native-reanimated';
import { MainText } from './Surface';
import { mainInk } from './theme';

export function WeekSelector({
  total,
  selected,
  onSelect,
}: {
  total: number;
  selected: number;
  onSelect(week: number): void;
}) {
  const { t } = useTranslation('main'),
    scroll = useRef<ScrollView>(null),
    chips = useRef(new Map<number, { x: number; width: number }>()),
    offset = useRef(0),
    requestedOffset = useRef<number | null>(null),
    contentWidth = useRef(0),
    previousSelection = useRef(selected),
    reducedMotion = useReducedMotion(),
    [viewport, setViewport] = useState(0);
  const revealSelected = useCallback(
    (animated = false) => {
      const chip = chips.current.get(selected);
      if (!chip || !viewport || !contentWidth.current) return;
      const position = requestedOffset.current ?? offset.current;
      const start = Math.max(0, chip.x - 16),
        end = Math.min(contentWidth.current, chip.x + chip.width + 16);
      if (start >= position && end <= position + viewport) return;
      const destination = Math.max(
        0,
        Math.min(
          contentWidth.current - viewport,
          chip.x - (viewport - chip.width) / 2,
        ),
      );
      requestedOffset.current = destination;
      scroll.current?.scrollTo({
        x: destination,
        animated,
      });
    },
    [selected, viewport],
  );
  useEffect(() => {
    const changed = previousSelection.current !== selected;
    previousSelection.current = selected;
    revealSelected(changed && !reducedMotion);
  }, [selected, reducedMotion, revealSelected]);
  return (
    <View
      testID="program-week-selector"
      accessibilityRole="radiogroup"
      accessibilityLabel={t('week')}
      style={{ marginBottom: 12 }}
    >
      <ScrollView
        ref={scroll}
        testID="program-week-scroll"
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        onLayout={(event) => setViewport(event.nativeEvent.layout.width)}
        onContentSizeChange={(width) => {
          contentWidth.current = width;
          revealSelected();
        }}
        onScroll={(event) => {
          offset.current = event.nativeEvent.contentOffset.x;
          if (
            requestedOffset.current !== null &&
            Math.abs(offset.current - requestedOffset.current) < 1
          )
            requestedOffset.current = null;
        }}
        onScrollBeginDrag={() => {
          requestedOffset.current = null;
        }}
        onMomentumScrollEnd={() => {
          requestedOffset.current = null;
        }}
        scrollEventThrottle={16}
        contentContainerStyle={{
          gap: 10,
          paddingHorizontal: 1,
          paddingVertical: 2,
        }}
      >
        {Array.from({ length: total }, (_, index) => index + 1).map((week) => (
          <Pressable
            key={week}
            accessibilityRole="radio"
            accessibilityLabel={t('weekNumber', { number: week })}
            accessibilityState={{ checked: selected === week }}
            aria-checked={selected === week}
            onPress={() => onSelect(week)}
            onLayout={(event) => {
              const { x, width } = event.nativeEvent.layout;
              chips.current.set(week, { x, width });
              if (week === selected) revealSelected();
            }}
            style={({ pressed }) => ({
              minWidth: 140,
              minHeight: 48,
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: selected === week ? mainInk.sage : mainInk.border,
              backgroundColor:
                selected === week ? mainInk.sage : mainInk.darkSurface,
              justifyContent: 'center',
              alignItems: 'center',
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <MainText
              style={{
                fontSize: 19,
                color: selected === week ? mainInk.charcoal : mainInk.parchment,
              }}
            >
              {t('weekNumber', { number: week })}
            </MainText>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
